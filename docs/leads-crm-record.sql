-- ============================================================================
-- Leads → CRM record (2026-11-07). Readable copy of migration
-- `leads_crm_record` (NOT YET APPLIED — awaiting approval in the Supabase MCP prompt; the file
-- under supabase/migrations/ is the usual placeholder). Additive only; every
-- statement is idempotent. Design: docs/LEADS_CRM_PLAN.md §4.1 and the Oct 23
-- sales design. NO automated decisions live here — stage/status is only ever
-- written by a person; the triggers below LOG what people did and maintain a
-- derived timestamp.
-- ============================================================================

-- 1. Contacts may be prospects: a person with no client and no payee yet.
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_exactly_one_parent;
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_at_most_one_parent;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_at_most_one_parent CHECK (num_nonnulls(client_id, payee_id) <= 1);

-- 2. The lead record: a person, an owner, the one next step, a size band, and
--    last contact (derived from the timeline — see trigger 4).
ALTER TABLE public.branch_bids
  ADD COLUMN IF NOT EXISTS contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_step       text,
  ADD COLUMN IF NOT EXISTS next_step_due   date,
  ADD COLUMN IF NOT EXISTS size_band       text,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_bids_size_band_check') THEN
    ALTER TABLE public.branch_bids ADD CONSTRAINT branch_bids_size_band_check
      CHECK (size_band IS NULL OR size_band IN ('under_25k','25k_100k','100k_500k','500k_1m','over_1m'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_branch_bids_contact_id ON public.branch_bids (contact_id);
CREATE INDEX IF NOT EXISTS idx_branch_bids_owner_user_id ON public.branch_bids (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_branch_bids_next_step_due
  ON public.branch_bids (next_step_due) WHERE deleted_at IS NULL AND stage <> 'closed';

-- 3. The timeline: one row per touch. Polymorphic target (lead today; job and
--    client are reserved for the mail logger / estimate chase) — no FK on
--    target_id on purpose; leads are soft-deleted and the row is history.
CREATE TABLE IF NOT EXISTS public.lead_timeline (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type      text NOT NULL CHECK (target_type IN ('lead','job','client')),
  target_id        uuid NOT NULL,
  kind             text NOT NULL CHECK (kind IN (
                     'note','call','email_in','email_out','text','meeting','site_walk',
                     'stage_change','link','file','draft')),
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  summary          text,
  body             text,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  written_by       text,
  gmail_message_id text,
  agent_key        text,
  awaiting_ok      boolean NOT NULL DEFAULT false,
  attachments      jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_timeline_target
  ON public.lead_timeline (target_type, target_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_timeline_user_id ON public.lead_timeline (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_timeline_gmail_message_id
  ON public.lead_timeline (gmail_message_id) WHERE gmail_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_timeline_agent_key
  ON public.lead_timeline (agent_key) WHERE agent_key IS NOT NULL;

DROP TRIGGER IF EXISTS update_lead_timeline_updated_at ON public.lead_timeline;
CREATE TRIGGER update_lead_timeline_updated_at
  BEFORE UPDATE ON public.lead_timeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lead_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/managers can view lead timeline" ON public.lead_timeline;
CREATE POLICY "Admins/managers can view lead timeline" ON public.lead_timeline
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "Admins/managers can create lead timeline" ON public.lead_timeline;
CREATE POLICY "Admins/managers can create lead timeline" ON public.lead_timeline
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "Admins/managers can update lead timeline" ON public.lead_timeline;
CREATE POLICY "Admins/managers can update lead timeline" ON public.lead_timeline
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
DROP POLICY IF EXISTS "Admins/managers can delete lead timeline" ON public.lead_timeline;
CREATE POLICY "Admins/managers can delete lead timeline" ON public.lead_timeline
  FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_timeline TO authenticated;
REVOKE ALL ON public.lead_timeline FROM anon;

-- 4. last_contact_at = newest human touch on the lead. Derived data, not a
--    decision. Recomputed on delete so removing a touch can't leave a stale stamp.
CREATE OR REPLACE FUNCTION public.sync_lead_last_contact()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target uuid := COALESCE(NEW.target_id, OLD.target_id);
  v_type   text := COALESCE(NEW.target_type, OLD.target_type);
BEGIN
  IF v_type <> 'lead' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  UPDATE public.branch_bids b
     SET last_contact_at = (
       SELECT max(t.occurred_at)
         FROM public.lead_timeline t
        WHERE t.target_type = 'lead'
          AND t.target_id = v_target
          AND t.kind IN ('note','call','email_in','email_out','text','meeting','site_walk')
     )
   WHERE b.id = v_target;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_lead_last_contact ON public.lead_timeline;
CREATE TRIGGER sync_lead_last_contact
  AFTER INSERT OR UPDATE OF occurred_at, kind OR DELETE ON public.lead_timeline
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_last_contact();

-- 5. Log stage changes a PERSON makes. The trigger never changes a stage; it
--    writes the history row so the timeline shows "New → Talking · Chris".
CREATE OR REPLACE FUNCTION public.log_lead_stage_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage
     OR NEW.closed_reason IS DISTINCT FROM OLD.closed_reason THEN
    INSERT INTO public.lead_timeline (target_type, target_id, kind, occurred_at, user_id, written_by, metadata)
    VALUES (
      'lead', NEW.id, 'stage_change', now(), auth.uid(), 'app',
      jsonb_build_object(
        'from', OLD.stage, 'to', NEW.stage,
        'closed_reason', NEW.closed_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_lead_stage_change ON public.branch_bids;
CREATE TRIGGER log_lead_stage_change
  AFTER UPDATE OF stage, closed_reason ON public.branch_bids
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_stage_change();

-- 6. Log job links / unlinks the same way.
CREATE OR REPLACE FUNCTION public.log_lead_project_link()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_project uuid := COALESCE(NEW.project_id, OLD.project_id);
  v_number  text;
BEGIN
  SELECT project_number INTO v_number FROM public.projects WHERE id = v_project;
  INSERT INTO public.lead_timeline (target_type, target_id, kind, occurred_at, user_id, written_by, metadata)
  VALUES (
    'lead', COALESCE(NEW.branch_bid_id, OLD.branch_bid_id), 'link', now(), auth.uid(), 'app',
    jsonb_build_object(
      'action', CASE WHEN TG_OP = 'INSERT' THEN 'linked' ELSE 'unlinked' END,
      'project_id', v_project, 'project_number', v_number
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS log_lead_project_link ON public.branch_bid_projects;
CREATE TRIGGER log_lead_project_link
  AFTER INSERT OR DELETE ON public.branch_bid_projects
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_project_link();

-- 7. Backfill history so day one isn't empty. bid_notes stays as-is (history
--    table; nothing reads it after this), every existing note becomes a
--    timeline note (idempotent on metadata.bid_note_id).
INSERT INTO public.lead_timeline (target_type, target_id, kind, occurred_at, body, user_id, written_by, metadata, created_at)
SELECT 'lead', n.bid_id, 'note', n.created_at, n.note_text, n.user_id, 'backfill',
       jsonb_build_object('bid_note_id', n.id), n.created_at
  FROM public.bid_notes n
 WHERE NOT EXISTS (
   SELECT 1 FROM public.lead_timeline t WHERE t.metadata->>'bid_note_id' = n.id::text
 );

-- Closed leads: one stage_change row at the recorded close.
INSERT INTO public.lead_timeline (target_type, target_id, kind, occurred_at, user_id, written_by, metadata, created_at)
SELECT 'lead', b.id, 'stage_change', b.closed_at, b.closed_by, 'backfill',
       jsonb_build_object('from', NULL, 'to', 'closed', 'closed_reason', b.closed_reason, 'backfill', true),
       b.closed_at
  FROM public.branch_bids b
 WHERE b.stage = 'closed' AND b.closed_at IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.lead_timeline t
      WHERE t.target_type = 'lead' AND t.target_id = b.id AND t.kind = 'stage_change'
        AND (t.metadata->>'backfill') = 'true'
   );

-- Existing job links: one link row each at the link's created_at.
INSERT INTO public.lead_timeline (target_type, target_id, kind, occurred_at, user_id, written_by, metadata, created_at)
SELECT 'lead', l.branch_bid_id, 'link', l.created_at, l.created_by, 'backfill',
       jsonb_build_object('action', 'linked', 'project_id', l.project_id, 'project_number', p.project_number, 'link_id', l.id),
       l.created_at
  FROM public.branch_bid_projects l
  JOIN public.projects p ON p.id = l.project_id
 WHERE NOT EXISTS (
   SELECT 1 FROM public.lead_timeline t WHERE t.metadata->>'link_id' = l.id::text
 );

-- Seed last_contact_at from the backfilled notes.
UPDATE public.branch_bids b
   SET last_contact_at = s.last_touch
  FROM (
    SELECT target_id, max(occurred_at) AS last_touch
      FROM public.lead_timeline
     WHERE target_type = 'lead'
       AND kind IN ('note','call','email_in','email_out','text','meeting','site_walk')
     GROUP BY target_id
  ) s
 WHERE b.id = s.target_id AND b.last_contact_at IS DISTINCT FROM s.last_touch;

-- Default owner = whoever created the lead (a person can reassign from the record).
UPDATE public.branch_bids SET owner_user_id = created_by WHERE owner_user_id IS NULL;
