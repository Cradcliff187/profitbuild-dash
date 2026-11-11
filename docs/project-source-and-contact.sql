-- ============================================================================
-- Projects: where the job came from + who our person is
-- STATUS: APPLIED to production (clsjdxwbsjbhjibvlqbz) on 2026-11-11 as migration
-- 20261111215035_project_source_and_contact. The file under supabase/migrations/
-- is a PLACEHOLDER per CLAUDE.md "Critical Migration Rules"; this is the
-- readable copy.
--
-- Additive only: four nullable columns on projects, one trigger on the
-- lead↔job link table, a guarded backfill. Safe to re-run.
-- ============================================================================

-- 1. Columns -----------------------------------------------------------------
-- source            how the job came in (same vocabulary as branch_bids.source);
--                   NULL = not recorded yet.
-- source_detail     free text: campaign, or the name of a person not in contacts.
-- source_contact_id the person who brought it in (referrer), when they ARE a contact.
-- primary_contact_id our main person on this job.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS source             text,
  ADD COLUMN IF NOT EXISTS source_detail      text,
  ADD COLUMN IF NOT EXISTS source_contact_id  uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_source_check') THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_source_check
      CHECK (source IS NULL OR source IN
        ('website_form','email','phone_call','referral','outreach',
         'repeat_client','bid_board','social','walk_in','other','unknown'));
  END IF;
END $$;

-- FK-covering indexes (contacts deletes fire ON DELETE SET NULL).
CREATE INDEX IF NOT EXISTS idx_projects_source_contact_id
  ON public.projects (source_contact_id) WHERE source_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_primary_contact_id
  ON public.projects (primary_contact_id) WHERE primary_contact_id IS NOT NULL;

-- 2. Linking a lead fills the job's EMPTY fields ------------------------------
-- Never overwrites: a source or contact someone already set on the job wins.
-- A lead whose source is 'unknown' contributes no source.
CREATE OR REPLACE FUNCTION public.inherit_lead_facts_to_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.projects p
     SET source = CASE WHEN p.source IS NULL AND b.source <> 'unknown'
                       THEN b.source ELSE p.source END,
         source_detail = CASE WHEN p.source IS NULL AND b.source <> 'unknown'
                              THEN b.source_detail ELSE p.source_detail END,
         primary_contact_id = COALESCE(p.primary_contact_id, b.contact_id)
    FROM public.branch_bids b
   WHERE b.id = NEW.branch_bid_id
     AND p.id = NEW.project_id
     AND ((p.source IS NULL AND b.source <> 'unknown')
          OR (p.primary_contact_id IS NULL AND b.contact_id IS NOT NULL));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS inherit_lead_facts_to_project ON public.branch_bid_projects;
CREATE TRIGGER inherit_lead_facts_to_project
  AFTER INSERT ON public.branch_bid_projects
  FOR EACH ROW EXECUTE FUNCTION public.inherit_lead_facts_to_project();

-- 3. Backfill the jobs that already have a lead (earliest link wins) ----------
UPDATE public.projects p
   SET source = CASE WHEN p.source IS NULL AND b.source <> 'unknown'
                     THEN b.source ELSE p.source END,
       source_detail = CASE WHEN p.source IS NULL AND b.source <> 'unknown'
                            THEN b.source_detail ELSE p.source_detail END,
       primary_contact_id = COALESCE(p.primary_contact_id, b.contact_id)
  FROM (
    SELECT DISTINCT ON (l.project_id) l.project_id, l.branch_bid_id
      FROM public.branch_bid_projects l
     ORDER BY l.project_id, l.created_at, l.id
  ) first_link
  JOIN public.branch_bids b ON b.id = first_link.branch_bid_id
 WHERE p.id = first_link.project_id
   AND ((p.source IS NULL AND b.source <> 'unknown')
        OR (p.primary_contact_id IS NULL AND b.contact_id IS NOT NULL));
