-- Sales desk functions (CLAUDE.md Rule 46) — applied to production as migration
-- `sales_desk_functions` (Nov 24 2026). The file under supabase/migrations/ is the
-- usual placeholder; this is the readable copy.
--
-- One write path for the Leads area, shared by the app and the RCG Sales chat.
-- Every function RECORDS what a person said. None of them decides anything:
-- no stage moves on a clock, no close on silence, no chase. (Chris, Nov 7 2026.)
--
-- Caller gate (sales_assert_caller): a signed-in app user must be admin or
-- manager (the same RLS boundary the tables carry). A caller with no auth.uid()
-- — the service role, or the sales chat on a direct connection — is allowed.
-- EXECUTE is revoked from anon and PUBLIC.
--
-- Attribution: every function takes p_written_by (a task or chat name). Rows the
-- functions insert carry it in written_by; rows the log-only triggers insert
-- read it from the transaction setting `sales.written_by` (default 'app').
--
-- Numbering (Rule 42/43, Chris Nov 24 2026): sales_create_job mints the next
-- number in the app and links the job to the lead. Matt's tracker sheet stays
-- the source of truth for the number and for every project/estimate status;
-- if the sheet disagrees, the app row is renumbered to match (the
-- advance_project_counter trigger keeps the counter ahead either way).

-- ---------------------------------------------------------------------------
-- 0. Attribution for the log-only triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_written_by()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('sales.written_by', true), ''), 'app');
$$;

CREATE OR REPLACE FUNCTION public.log_lead_stage_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage
     OR NEW.closed_reason IS DISTINCT FROM OLD.closed_reason THEN
    INSERT INTO public.lead_timeline (target_type, target_id, kind, occurred_at, user_id, written_by, metadata)
    VALUES (
      'lead', NEW.id, 'stage_change', now(), auth.uid(), public.sales_written_by(),
      jsonb_build_object('from', OLD.stage, 'to', NEW.stage, 'closed_reason', NEW.closed_reason)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_lead_project_link()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_project uuid := COALESCE(NEW.project_id, OLD.project_id);
  v_number  text;
BEGIN
  SELECT project_number INTO v_number FROM public.projects WHERE id = v_project;
  INSERT INTO public.lead_timeline (target_type, target_id, kind, occurred_at, user_id, written_by, metadata)
  VALUES (
    'lead', COALESCE(NEW.branch_bid_id, OLD.branch_bid_id), 'link', now(), auth.uid(), public.sales_written_by(),
    jsonb_build_object(
      'action', CASE WHEN TG_OP = 'INSERT' THEN 'linked' ELSE 'unlinked' END,
      'project_id', v_project, 'project_number', v_number
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. Caller gate + small helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_assert_caller(p_written_by text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF p_written_by IS NULL OR btrim(p_written_by) = '' THEN
    RAISE EXCEPTION 'p_written_by is required (the task or chat name doing the writing)' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'admin or manager role required' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('sales.written_by', p_written_by, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_norm_phone(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p IS NULL THEN NULL
    WHEN length(regexp_replace(p, '\D', '', 'g')) = 11 AND left(regexp_replace(p, '\D', '', 'g'), 1) = '1'
      THEN substr(regexp_replace(p, '\D', '', 'g'), 2)
    WHEN length(regexp_replace(p, '\D', '', 'g')) >= 7 THEN regexp_replace(p, '\D', '', 'g')
    ELSE NULL END;
$$;

-- Business days strictly after d1 up to and including d2 (Mon–Fri; no holidays).
-- Mirrors businessDaysBetween() in src/utils/leadAttention.ts.
CREATE OR REPLACE FUNCTION public.sales_business_days_between(d1 date, d2 date)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE((
    SELECT count(*)::int FROM generate_series(d1 + 1, d2, interval '1 day') g
    WHERE extract(isodow FROM g) < 6
  ), 0);
$$;

-- ---------------------------------------------------------------------------
-- 2. Contacts: match before create
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_find_or_add_contact(
  p_name        text,
  p_email       text DEFAULT NULL,
  p_phone       text DEFAULT NULL,
  p_client_id   uuid DEFAULT NULL,
  p_title       text DEFAULT NULL,
  p_notes       text DEFAULT NULL,
  p_written_by  text DEFAULT 'sales'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_email text := NULLIF(lower(btrim(p_email)), '');
  v_phone text := public.sales_norm_phone(p_phone);
  v_name  text := NULLIF(btrim(p_name), '');
  v_id    uuid;
BEGIN
  PERFORM public.sales_assert_caller(p_written_by);
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'a contact needs a name' USING ERRCODE = '22023';
  END IF;

  -- e-mail first, then phone, then name + company (a prospect has no company).
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_id FROM public.contacts WHERE lower(btrim(email)) = v_email AND is_active ORDER BY created_at LIMIT 1;
  END IF;
  IF v_id IS NULL AND v_phone IS NOT NULL THEN
    SELECT id INTO v_id FROM public.contacts WHERE public.sales_norm_phone(phone) = v_phone AND is_active ORDER BY created_at LIMIT 1;
  END IF;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.contacts
     WHERE lower(btrim(name)) = lower(v_name) AND is_active
       AND client_id IS NOT DISTINCT FROM p_client_id
     ORDER BY created_at LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    -- Fill blanks only; never overwrite what a person typed.
    UPDATE public.contacts
       SET email = COALESCE(email, v_email),
           phone = COALESCE(phone, NULLIF(btrim(p_phone), '')),
           title = COALESCE(title, NULLIF(btrim(p_title), '')),
           client_id = COALESCE(client_id, CASE WHEN payee_id IS NULL THEN p_client_id END),
           updated_at = now()
     WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.contacts (client_id, name, title, email, phone, notes, is_primary, is_active)
  VALUES (
    p_client_id, v_name, NULLIF(btrim(p_title), ''), v_email, NULLIF(btrim(p_phone), ''), NULLIF(btrim(p_notes), ''),
    -- first person on a client becomes its primary; prospects are never primary
    p_client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.client_id = p_client_id AND c.is_primary),
    true
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Touches: one row per conversation, idempotent on a message id or agent key
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_log_touch(
  p_target_type      text,
  p_target_id        uuid,
  p_kind             text,
  p_occurred_at      timestamptz DEFAULT now(),
  p_summary          text DEFAULT NULL,
  p_body             text DEFAULT NULL,
  p_gmail_message_id text DEFAULT NULL,
  p_agent_key        text DEFAULT NULL,
  p_written_by       text DEFAULT 'sales',
  p_attachments      jsonb DEFAULT '[]'::jsonb,
  p_metadata         jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.sales_assert_caller(p_written_by);

  IF p_kind NOT IN ('note','call','email_in','email_out','text','meeting','site_walk','file','draft') THEN
    RAISE EXCEPTION 'kind % is not a touch (stage_change and link are written by triggers)', p_kind USING ERRCODE = '22023';
  END IF;
  IF p_target_type = 'lead' THEN
    IF NOT EXISTS (SELECT 1 FROM public.branch_bids WHERE id = p_target_id AND deleted_at IS NULL) THEN
      RAISE EXCEPTION 'lead % not found', p_target_id USING ERRCODE = 'P0002';
    END IF;
  ELSIF p_target_type = 'job' THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_target_id) THEN
      RAISE EXCEPTION 'job % not found', p_target_id USING ERRCODE = 'P0002';
    END IF;
  ELSIF p_target_type = 'client' THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_target_id) THEN
      RAISE EXCEPTION 'client % not found', p_target_id USING ERRCODE = 'P0002';
    END IF;
  ELSE
    RAISE EXCEPTION 'target_type must be lead, job or client' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(p_attachments, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'attachments must be a JSON array' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(p_summary), '') IS NULL AND NULLIF(btrim(p_body), '') IS NULL
     AND jsonb_array_length(COALESCE(p_attachments, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'a touch needs a summary, a body or an attachment' USING ERRCODE = '22023';
  END IF;

  -- Idempotent: the same message or the same agent key logged twice is one row.
  IF p_gmail_message_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.lead_timeline WHERE gmail_message_id = p_gmail_message_id;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;
  IF p_agent_key IS NOT NULL THEN
    SELECT id INTO v_id FROM public.lead_timeline WHERE agent_key = p_agent_key;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  INSERT INTO public.lead_timeline
    (target_type, target_id, kind, occurred_at, summary, body, user_id, written_by,
     gmail_message_id, agent_key, awaiting_ok, attachments, metadata)
  VALUES
    (p_target_type, p_target_id, p_kind, COALESCE(p_occurred_at, now()),
     NULLIF(btrim(p_summary), ''), NULLIF(btrim(p_body), ''), auth.uid(), p_written_by,
     p_gmail_message_id, p_agent_key, p_kind = 'draft', COALESCE(p_attachments, '[]'::jsonb),
     COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Leads: create, update facts, set stage, set next step
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sales_create_lead(
  p_name           text,
  p_source         text,
  p_contact_id     uuid DEFAULT NULL,
  p_client_id      uuid DEFAULT NULL,
  p_address        text DEFAULT NULL,
  p_project_type   text DEFAULT 'construction_project',
  p_job_type       text DEFAULT NULL,
  p_size_band      text DEFAULT NULL,
  p_owner_user_id  uuid DEFAULT NULL,
  p_source_detail  text DEFAULT NULL,
  p_description    text DEFAULT NULL,
  p_written_by     text DEFAULT 'sales'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_id      uuid;
  v_creator uuid := COALESCE(auth.uid(), p_owner_user_id);
BEGIN
  PERFORM public.sales_assert_caller(p_written_by);
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'a lead needs a name' USING ERRCODE = '22023';
  END IF;
  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'p_owner_user_id is required when no user is signed in (it becomes created_by)' USING ERRCODE = '22023';
  END IF;

  -- The same open lead logged twice is one lead.
  SELECT id INTO v_id FROM public.branch_bids
   WHERE deleted_at IS NULL AND stage <> 'closed'
     AND lower(btrim(name)) = lower(btrim(p_name))
     AND contact_id IS NOT DISTINCT FROM p_contact_id
   ORDER BY created_at LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.branch_bids
    (name, description, address, project_type, job_type, source, source_detail, stage,
     client_id, contact_id, owner_user_id, size_band, created_by)
  VALUES
    (btrim(p_name), NULLIF(btrim(p_description), ''), NULLIF(btrim(p_address), ''),
     COALESCE(p_project_type, 'construction_project'), NULLIF(btrim(p_job_type), ''),
     COALESCE(p_source, 'unknown'), NULLIF(btrim(p_source_detail), ''), 'new',
     p_client_id, p_contact_id, COALESCE(p_owner_user_id, v_creator), p_size_band, v_creator)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Facts only. Stage goes through sales_set_stage; the next step through sales_set_next_step.
CREATE OR REPLACE FUNCTION public.sales_update_lead(
  p_lead_id    uuid,
  p_patch      jsonb,
  p_written_by text DEFAULT 'sales'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_bad text;
BEGIN
  PERFORM public.sales_assert_caller(p_written_by);
  IF jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'p_patch must be a JSON object' USING ERRCODE = '22023';
  END IF;
  SELECT string_agg(k, ', ') INTO v_bad FROM jsonb_object_keys(p_patch) k
   WHERE k NOT IN ('name','description','address','project_type','job_type','size_band',
                   'source','source_detail','client_id','contact_id','owner_user_id');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'sales_update_lead cannot set: % (stage → sales_set_stage, next step → sales_set_next_step)', v_bad
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.branch_bids SET
    name          = CASE WHEN p_patch ? 'name'          THEN btrim(p_patch->>'name')     ELSE name END,
    description   = CASE WHEN p_patch ? 'description'   THEN p_patch->>'description'     ELSE description END,
    address       = CASE WHEN p_patch ? 'address'       THEN p_patch->>'address'         ELSE address END,
    project_type  = CASE WHEN p_patch ? 'project_type'  THEN p_patch->>'project_type'    ELSE project_type END,
    job_type      = CASE WHEN p_patch ? 'job_type'      THEN p_patch->>'job_type'        ELSE job_type END,
    size_band     = CASE WHEN p_patch ? 'size_band'     THEN p_patch->>'size_band'       ELSE size_band END,
    source        = CASE WHEN p_patch ? 'source'        THEN p_patch->>'source'          ELSE source END,
    source_detail = CASE WHEN p_patch ? 'source_detail' THEN p_patch->>'source_detail'   ELSE source_detail END,
    client_id     = CASE WHEN p_patch ? 'client_id'     THEN (p_patch->>'client_id')::uuid     ELSE client_id END,
    contact_id    = CASE WHEN p_patch ? 'contact_id'    THEN (p_patch->>'contact_id')::uuid    ELSE contact_id END,
    owner_user_id = CASE WHEN p_patch ? 'owner_user_id' THEN (p_patch->>'owner_user_id')::uuid ELSE owner_user_id END,
    updated_at    = now()
  WHERE id = p_lead_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead % not found', p_lead_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- A person decided the conversation moved. Closing needs a reason (DB CHECK).
CREATE OR REPLACE FUNCTION public.sales_set_stage(
  p_lead_id    uuid,
  p_stage      text,
  p_reason     text DEFAULT NULL,
  p_written_by text DEFAULT 'sales'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sales_assert_caller(p_written_by);
  IF p_stage = 'closed' AND p_reason IS NULL THEN
    RAISE EXCEPTION 'closing a lead needs a reason (linked_to_job, we_passed, no_fit, went_cold, lost_before_estimate)' USING ERRCODE = '22023';
  END IF;
  UPDATE public.branch_bids SET
    stage         = p_stage,
    closed_reason = CASE WHEN p_stage = 'closed' THEN p_reason ELSE NULL END,
    closed_at     = CASE WHEN p_stage = 'closed' THEN COALESCE(closed_at, now()) ELSE NULL END,
    closed_by     = CASE WHEN p_stage = 'closed' THEN COALESCE(closed_by, auth.uid()) ELSE NULL END,
    updated_at    = now()
  WHERE id = p_lead_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead % not found', p_lead_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- The one field that drives the follow-up list. Null text + null date clears it.
-- Leads only today: projects and clients carry no next_step column.
CREATE OR REPLACE FUNCTION public.sales_set_next_step(
  p_lead_id        uuid,
  p_text           text,
  p_due_date       date,
  p_owner_user_id  uuid DEFAULT NULL,
  p_written_by     text DEFAULT 'sales'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sales_assert_caller(p_written_by);
  UPDATE public.branch_bids SET
    next_step     = NULLIF(btrim(p_text), ''),
    next_step_due = p_due_date,
    owner_user_id = COALESCE(p_owner_user_id, owner_user_id),
    updated_at    = now()
  WHERE id = p_lead_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead % not found', p_lead_id USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. The hand-off: create the job, link it, mark the lead Estimate requested
-- ---------------------------------------------------------------------------
-- Output columns are job_id / job_number (not project_*: PL/pgSQL would read
-- those names as its own OUT variables inside the INSERT ... ON CONFLICT).
-- Mints the next number through get_next_project_number() (Rule 43). Creates
-- NO estimate row: estimates are not a system of record here (Rule 46). The
-- lead's contact and source flow onto the job through the existing
-- inherit_lead_facts_to_project trigger on branch_bid_projects.
CREATE OR REPLACE FUNCTION public.sales_create_job(
  p_lead_id       uuid,
  p_job_name      text DEFAULT NULL,
  p_client_id     uuid DEFAULT NULL,
  p_client_name   text DEFAULT NULL,
  p_address       text DEFAULT NULL,
  p_project_type  text DEFAULT NULL,
  p_written_by    text DEFAULT 'sales'
)
RETURNS TABLE (job_id uuid, job_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_lead        public.branch_bids%ROWTYPE;
  v_client_id   uuid := p_client_id;
  v_client_name text;
  v_number      text;
  v_project     uuid;
  v_name        text;
BEGIN
  PERFORM public.sales_assert_caller(p_written_by);

  SELECT * INTO v_lead FROM public.branch_bids WHERE id = p_lead_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead % not found', p_lead_id USING ERRCODE = 'P0002';
  END IF;
  IF v_lead.stage = 'closed' THEN
    RAISE EXCEPTION 'lead is closed (%); reopen it first', v_lead.closed_reason USING ERRCODE = '22023';
  END IF;

  -- A job needs a client (projects.client_name is NOT NULL). Pick the given one,
  -- else the lead's, else find-or-create by name.
  IF v_client_id IS NULL THEN v_client_id := v_lead.client_id; END IF;
  IF v_client_id IS NULL AND NULLIF(btrim(p_client_name), '') IS NOT NULL THEN
    SELECT id INTO v_client_id FROM public.clients WHERE lower(btrim(client_name)) = lower(btrim(p_client_name));
    IF v_client_id IS NULL THEN
      INSERT INTO public.clients (client_name) VALUES (btrim(p_client_name)) RETURNING id INTO v_client_id;
    END IF;
  END IF;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'a client is required to create a job: pass p_client_id or p_client_name' USING ERRCODE = '22023';
  END IF;
  SELECT client_name INTO v_client_name FROM public.clients WHERE id = v_client_id;
  IF v_client_name IS NULL THEN
    RAISE EXCEPTION 'client % not found', v_client_id USING ERRCODE = 'P0002';
  END IF;

  v_name   := COALESCE(NULLIF(btrim(p_job_name), ''), v_lead.name);
  v_number := public.get_next_project_number();

  INSERT INTO public.projects
    (project_number, project_name, client_id, client_name, address, project_type, job_type, status, category)
  VALUES
    (v_number, v_name, v_client_id, v_client_name,
     COALESCE(NULLIF(btrim(p_address), ''), v_lead.address),
     COALESCE(p_project_type, v_lead.project_type, 'construction_project')::public.project_type,
     v_lead.job_type, 'estimating', 'construction')
  RETURNING id INTO v_project;

  -- Link (triggers: primary-project mirror, lead facts → job, timeline 'link' row).
  INSERT INTO public.branch_bid_projects (branch_bid_id, project_id, created_by)
  VALUES (p_lead_id, v_project, auth.uid())
  ON CONFLICT (branch_bid_id, project_id) DO NOTHING;

  -- The lead now has a client and, if its person was a prospect, that person
  -- belongs to the client. Bookkeeping, not a decision.
  UPDATE public.branch_bids SET client_id = COALESCE(client_id, v_client_id), updated_at = now() WHERE id = p_lead_id;
  UPDATE public.contacts SET client_id = v_client_id, updated_at = now()
   WHERE id = v_lead.contact_id AND client_id IS NULL AND payee_id IS NULL;

  -- Asking for a job IS asking for an estimate; earlier stages move forward.
  IF v_lead.stage IN ('new', 'talking', 'site_walk') THEN
    UPDATE public.branch_bids SET stage = 'estimate_requested', updated_at = now() WHERE id = p_lead_id;
  END IF;

  job_id := v_project;
  job_number := v_number;
  RETURN NEXT;
END;
$$;

-- The name the rcg-sales skill already uses. Same thing; no estimate row is created.
CREATE OR REPLACE FUNCTION public.sales_request_estimate(
  p_lead_id       uuid,
  p_job_name      text DEFAULT NULL,
  p_client_id     uuid DEFAULT NULL,
  p_address       text DEFAULT NULL,
  p_project_type  text DEFAULT NULL,
  p_written_by    text DEFAULT 'sales'
)
RETURNS TABLE (job_id uuid, job_number text)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT * FROM public.sales_create_job(p_lead_id, p_job_name, p_client_id, NULL, p_address, p_project_type, p_written_by);
$$;

-- ---------------------------------------------------------------------------
-- 6. Reads: what is due, and the pipeline
-- ---------------------------------------------------------------------------
-- Attention mirrors getLeadAttention() in src/utils/leadAttention.ts:
-- overdue → due_today → new_unanswered (1 business day) → stale (14 days) → no_next_step → none.
CREATE OR REPLACE FUNCTION public.sales_list_due(p_since timestamptz DEFAULT NULL)
RETURNS TABLE (
  lead_id uuid, name text, stage text, attention text,
  next_step text, next_step_due date, last_contact_at timestamptz, days_since_contact integer,
  owner_user_id uuid, owner_name text,
  contact_id uuid, contact_name text, contact_phone text, contact_email text,
  client_name text, address text, size_band text, source text,
  linked_jobs text, created_at timestamptz,
  touches_since integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT b.*,
      (current_date - COALESCE(b.last_contact_at, b.created_at)::date) AS since_days,
      CASE
        WHEN b.next_step_due IS NOT NULL AND b.next_step_due < current_date THEN 'overdue'
        WHEN b.next_step_due = current_date THEN 'due_today'
        WHEN b.stage = 'new' AND b.last_contact_at IS NULL
             AND public.sales_business_days_between(b.created_at::date, current_date) >= 1 THEN 'new_unanswered'
        WHEN (current_date - COALESCE(b.last_contact_at, b.created_at)::date) >= 14 THEN 'stale'
        WHEN b.next_step_due IS NULL AND b.next_step IS NULL THEN 'no_next_step'
        ELSE 'none'
      END AS attention
    FROM public.branch_bids b
    WHERE b.deleted_at IS NULL AND b.stage <> 'closed'
  )
  SELECT
    x.id, x.name, x.stage, x.attention,
    x.next_step, x.next_step_due, x.last_contact_at, x.since_days,
    x.owner_user_id, pr.full_name,
    c.id, c.name, c.phone, c.email,
    cl.client_name, x.address, x.size_band, x.source,
    (SELECT string_agg(p.project_number, ', ' ORDER BY p.project_number)
       FROM public.branch_bid_projects l JOIN public.projects p ON p.id = l.project_id
      WHERE l.branch_bid_id = x.id),
    x.created_at,
    (SELECT count(*)::int FROM public.lead_timeline t
      WHERE t.target_type = 'lead' AND t.target_id = x.id
        AND p_since IS NOT NULL AND t.created_at > p_since)
  FROM base x
  LEFT JOIN public.profiles pr ON pr.id = x.owner_user_id
  LEFT JOIN public.contacts c  ON c.id = x.contact_id
  LEFT JOIN public.clients cl  ON cl.id = x.client_id
  WHERE auth.uid() IS NULL
     OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role)
  ORDER BY
    CASE x.attention WHEN 'overdue' THEN 0 WHEN 'due_today' THEN 1 WHEN 'new_unanswered' THEN 2
                     WHEN 'stale' THEN 3 WHEN 'no_next_step' THEN 4 ELSE 5 END,
    x.next_step_due NULLS LAST, x.created_at;
$$;

-- Leads only. Project and estimate statuses live on Matt's sheet (Rule 46) and are not reported here.
CREATE OR REPLACE FUNCTION public.sales_pipeline()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL
         AND NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
    THEN NULL
    ELSE jsonb_build_object(
      'as_of', now(),
      'open_by_stage', (
        SELECT COALESCE(jsonb_object_agg(stage, n), '{}'::jsonb) FROM (
          SELECT stage, count(*) AS n FROM public.branch_bids
          WHERE deleted_at IS NULL AND stage <> 'closed' GROUP BY stage) s),
      'open_leads', (
        SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.attention, d.next_step_due NULLS LAST), '[]'::jsonb)
        FROM public.sales_list_due() d),
      'closed_last_30d', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'lead_id', b.id, 'name', b.name, 'closed_reason', b.closed_reason, 'closed_at', b.closed_at,
          'linked_jobs', (SELECT string_agg(p.project_number, ', ') FROM public.branch_bid_projects l
                          JOIN public.projects p ON p.id = l.project_id WHERE l.branch_bid_id = b.id))
          ORDER BY b.closed_at DESC), '[]'::jsonb)
        FROM public.branch_bids b
        WHERE b.deleted_at IS NULL AND b.stage = 'closed' AND b.closed_at > now() - interval '30 days'),
      'touches_last_7d', (
        SELECT count(*) FROM public.lead_timeline t
        WHERE t.kind IN ('note','call','email_in','email_out','text','meeting','site_walk')
          AND t.occurred_at > now() - interval '7 days'),
      'leads_created_last_30d', (
        SELECT count(*) FROM public.branch_bids WHERE deleted_at IS NULL AND created_at > now() - interval '30 days')
    ) END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Grants: no anonymous callers
-- ---------------------------------------------------------------------------
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'sales_assert_caller(text)',
    'sales_find_or_add_contact(text,text,text,uuid,text,text,text)',
    'sales_log_touch(text,uuid,text,timestamptz,text,text,text,text,text,jsonb,jsonb)',
    'sales_create_lead(text,text,uuid,uuid,text,text,text,text,uuid,text,text,text)',
    'sales_update_lead(uuid,jsonb,text)',
    'sales_set_stage(uuid,text,text,text)',
    'sales_set_next_step(uuid,text,date,uuid,text)',
    'sales_create_job(uuid,text,uuid,text,text,text,text)',
    'sales_request_estimate(uuid,text,uuid,text,text,text)',
    'sales_list_due(timestamptz)',
    'sales_pipeline()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;
