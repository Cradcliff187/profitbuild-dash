-- ============================================================================
-- Leads: source · stage · close reason · many-to-many job links
-- Applied to production (clsjdxwbsjbhjibvlqbz) via MCP apply_migration.
-- Local migration file is a PLACEHOLDER per CLAUDE.md "Critical Migration
-- Rules"; this file is the readable copy of what was applied.
--
-- Additive only: new columns, one new table, one trigger, a guarded backfill.
-- Never touches get_next_project_number(), system_settings.project_counter,
-- or inserts into projects. Safe to re-run (every statement is idempotent).
-- ============================================================================

-- 1. New columns on branch_bids ---------------------------------------------
ALTER TABLE public.branch_bids
  ADD COLUMN IF NOT EXISTS source        text        NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS source_detail text,
  ADD COLUMN IF NOT EXISTS stage         text        NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS closed_reason text,
  ADD COLUMN IF NOT EXISTS closed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- text + CHECK (not Postgres enums) so a future value is one ALTER, not a type change.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_bids_source_check') THEN
    ALTER TABLE public.branch_bids ADD CONSTRAINT branch_bids_source_check
      CHECK (source IN ('website_form','email','phone_call','referral','outreach',
                        'repeat_client','bid_board','social','walk_in','other','unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_bids_stage_check') THEN
    ALTER TABLE public.branch_bids ADD CONSTRAINT branch_bids_stage_check
      CHECK (stage IN ('new','talking','site_walk','estimate_requested','closed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_bids_closed_reason_check') THEN
    ALTER TABLE public.branch_bids ADD CONSTRAINT branch_bids_closed_reason_check
      CHECK (closed_reason IS NULL OR closed_reason IN
             ('linked_to_job','we_passed','no_fit','went_cold','lost_before_estimate'));
  END IF;
  -- Closing requires a reason; reopening clears it. One invariant, enforced in the DB.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_bids_closed_requires_reason') THEN
    ALTER TABLE public.branch_bids ADD CONSTRAINT branch_bids_closed_requires_reason
      CHECK ((stage = 'closed') = (closed_reason IS NOT NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_branch_bids_stage ON public.branch_bids (stage) WHERE deleted_at IS NULL;

-- 2. Link table: one lead ↔ many jobs ---------------------------------------
CREATE TABLE IF NOT EXISTS public.branch_bid_projects (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_bid_id uuid        NOT NULL REFERENCES public.branch_bids(id) ON DELETE CASCADE,
  project_id    uuid        NOT NULL REFERENCES public.projects(id)    ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT branch_bid_projects_unique_pair UNIQUE (branch_bid_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_bid_projects_project_id ON public.branch_bid_projects (project_id);
CREATE INDEX IF NOT EXISTS idx_branch_bid_projects_created_by ON public.branch_bid_projects (created_by);

ALTER TABLE public.branch_bid_projects ENABLE ROW LEVEL SECURITY;

-- RLS mirrors branch_bids exactly: admin/manager on all four commands.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branch_bid_projects' AND policyname='Admin and Manager can view branch bid projects') THEN
    CREATE POLICY "Admin and Manager can view branch bid projects" ON public.branch_bid_projects
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'manager'::app_role])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branch_bid_projects' AND policyname='Admin and Manager can create branch bid projects') THEN
    CREATE POLICY "Admin and Manager can create branch bid projects" ON public.branch_bid_projects
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'manager'::app_role])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branch_bid_projects' AND policyname='Admin and Manager can update branch bid projects') THEN
    CREATE POLICY "Admin and Manager can update branch bid projects" ON public.branch_bid_projects
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'manager'::app_role])));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='branch_bid_projects' AND policyname='Admin and Manager can delete branch bid projects') THEN
    CREATE POLICY "Admin and Manager can delete branch bid projects" ON public.branch_bid_projects
      FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ANY (ARRAY['admin'::app_role,'manager'::app_role])));
  END IF;
END $$;

-- 3. Keep branch_bids.project_id = the FIRST (earliest) linked job ----------
-- Existing screens (list badge, export, old filters) keep working; unlinking the
-- first job promotes the next one; unlinking the last one clears it. DB-first so
-- it holds regardless of which code path writes the link table.
CREATE OR REPLACE FUNCTION public.sync_branch_bid_primary_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid uuid := COALESCE(NEW.branch_bid_id, OLD.branch_bid_id);
BEGIN
  UPDATE public.branch_bids b
     SET project_id = (
       SELECT l.project_id FROM public.branch_bid_projects l
        WHERE l.branch_bid_id = v_bid
        ORDER BY l.created_at, l.id
        LIMIT 1)
   WHERE b.id = v_bid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_branch_bid_primary_project ON public.branch_bid_projects;
CREATE TRIGGER sync_branch_bid_primary_project
  AFTER INSERT OR DELETE ON public.branch_bid_projects
  FOR EACH ROW EXECUTE FUNCTION public.sync_branch_bid_primary_project();

-- 4. Backfill (guarded; re-running is a no-op) -------------------------------

-- 4a. Seed the link table from every existing project_id (all leads, incl. soft-deleted).
--     created_at = the lead's updated_at (≈ when it was linked) so it sorts first.
INSERT INTO public.branch_bid_projects (branch_bid_id, project_id, created_at, created_by)
SELECT b.id, b.project_id, b.updated_at, b.created_by
  FROM public.branch_bids b
 WHERE b.project_id IS NOT NULL
ON CONFLICT (branch_bid_id, project_id) DO NOTHING;

-- 4b. Body Alive (5a643402…): source + stage; link 225-193 (already primary) AND 225-194.
UPDATE public.branch_bids
   SET source = 'website_form',
       source_detail = 'teamradcliff.com contact form, Tue 10/13/2026 2:05 PM, Isabel Wabrick',
       stage = 'estimate_requested'
 WHERE id = '5a643402-74f0-436e-b0cd-ed6449db6c1d'
   AND source = 'unknown';           -- guard: only the first run changes it

INSERT INTO public.branch_bid_projects (branch_bid_id, project_id, created_at, created_by)
SELECT '5a643402-74f0-436e-b0cd-ed6449db6c1d', p.id, clock_timestamp(), '8768d927-9096-449f-855a-24fde8a33b0b'
  FROM public.projects p
 WHERE p.project_number IN ('225-193','225-194')
ON CONFLICT (branch_bid_id, project_id) DO NOTHING;

-- 4c. Ant Fitness: new closed lead, fixed id so the insert is idempotent. No client, no project.
INSERT INTO public.branch_bids
  (id, name, description, client_id, source, source_detail, stage, closed_reason, closed_at, closed_by,
   created_by, created_at, updated_at)
VALUES
  ('7c1f3b2e-5d7a-4c0e-9b61-0a1f2e3d4c5b',
   'Ant Fitness', NULL, NULL,
   'website_form', 'teamradcliff.com contact form, 10/12/2026',
   'closed', 'we_passed',
   '2026-10-22 12:00:00-04', '8768d927-9096-449f-855a-24fde8a33b0b',
   '8768d927-9096-449f-855a-24fde8a33b0b', '2026-10-12 12:00:00-04', '2026-10-22 12:00:00-04')
ON CONFLICT (id) DO NOTHING;

-- 4d. The Cathedral (e5b93149…): converted to 225-120 on 2026-05-20 via the old
--     Convert button; the job is complete. Under the new model that lead is closed
--     as linked_to_job — leaving it at 'new' would misstate it.
UPDATE public.branch_bids
   SET stage = 'closed', closed_reason = 'linked_to_job',
       closed_at = '2026-05-20 12:58:24+00', closed_by = created_by
 WHERE id = 'e5b93149-972a-447a-aabf-f00b416d167a'
   AND stage = 'new' AND closed_reason IS NULL;

-- Every other lead keeps the column defaults: source 'unknown', stage 'new'.
-- The two test leads (fa806da7… "test bid 1", a35efa7c… "tommrhy tstesta") were
-- already soft-deleted (deleted_at set) and are left exactly as they are.
