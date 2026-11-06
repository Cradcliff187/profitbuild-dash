-- ============================================================================
-- Project numbering: self-healing counter + admin "start next project at"
-- Applied to production (clsjdxwbsjbhjibvlqbz) on 2026-11-06 as migration
-- 20261106231618_project_numbering_self_healing. The MCP apply_migration
-- approval card timed out four times, so the SQL was run via execute_sql and
-- the ledger row inserted by hand with the same name. Local migration file is
-- a PLACEHOLDER per CLAUDE.md "Critical Migration Rules"; this file is the
-- readable copy of what was applied. See Rule 43.
--
-- Problem this closes: numbers are minted two ways — get_next_project_number()
-- (in-app New Project / Quick Work Order) and explicit INSERTs from the tracker
-- sync — and only the first path moved system_settings.project_counter. The
-- counter sat at 225175 while jobs ran to 225-205, so the next in-app create
-- would have collided on projects_project_number_key.
--
-- After this migration the TEXT in projects.project_number is the source of
-- truth and the counter can never fall behind it:
--   * every insert/renumber re-derives sequence_number and advances the counter
--   * get_next_project_number() starts from max(counter, highest in use) and
--     skips anything already taken
--   * admins can jump the sequence forward ("skip numbers") but never back
--     into a used number
-- Additive only; idempotent.
-- ============================================================================

-- 0. Shared formatter: 225-NNN, never wraps at 999 (225-1000, 225-1001, …).
CREATE OR REPLACE FUNCTION public.format_project_number(p_counter integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  -- lpad TRUNCATES past its length argument ('1000' → '100'), so the width
  -- grows with the number: 225-005, 225-206, 225-1000.
  SELECT '225-' || lpad((p_counter - 225000)::text,
                        GREATEST(3, length((p_counter - 225000)::text)), '0');
$$;

-- 1. Highest job number actually in use — parsed from project_number text,
--    not from sequence_number (which had drifted on 3 renumbered rows).
CREATE OR REPLACE FUNCTION public.max_project_sequence()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(split_part(project_number, '-', 2)::integer), 0)
    FROM public.projects
   WHERE project_number ~ '^225-\d{3,}$';
$$;

-- 2. sequence_number ALWAYS mirrors the numeric suffix (insert AND renumber).
--    Non-numeric suffixes (001-GAS, SYS-TEST) keep whatever they have.
CREATE OR REPLACE FUNCTION public.set_project_sequence_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_number IS NOT NULL AND split_part(NEW.project_number, '-', 2) ~ '^\d+$' THEN
    NEW.sequence_number := split_part(NEW.project_number, '-', 2)::integer;
  ELSIF NEW.sequence_number IS NULL THEN
    NEW.sequence_number := 0;
  END IF;
  RETURN NEW;
END;
$$;
-- (set_project_sequence_trigger — BEFORE INSERT OR UPDATE — already exists and
--  points at this function; its body is what changed.)

-- Repair the three rows whose sequence_number stopped matching the number
-- after a renumber (225-015 had 16, 225-049 had 53, 225-149 had 146).
UPDATE public.projects
   SET sequence_number = split_part(project_number, '-', 2)::integer
 WHERE project_number ~ '^225-\d{3,}$'
   AND sequence_number IS DISTINCT FROM split_part(project_number, '-', 2)::integer;

-- 3. The counter follows every number assigned outside the RPC (tracker sync,
--    manual SQL, renumbering). It only ever moves forward.
CREATE OR REPLACE FUNCTION public.advance_project_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
BEGIN
  IF NEW.project_number ~ '^225-\d{3,}$' THEN
    v_seq := split_part(NEW.project_number, '-', 2)::integer;
    UPDATE public.system_settings
       SET setting_value = (225000 + v_seq)::text,
           updated_at = now()
     WHERE setting_key = 'project_counter'
       AND setting_value::integer < 225000 + v_seq;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER advance_project_counter
  AFTER INSERT OR UPDATE OF project_number ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.advance_project_counter();

-- 4. Minting: never below the highest number in use, never a duplicate,
--    serialized across concurrent callers via the row lock.
CREATE OR REPLACE FUNCTION public.get_next_project_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter integer;
  v_next    integer;
  v_result  text;
BEGIN
  SELECT setting_value::integer INTO v_counter
    FROM public.system_settings
   WHERE setting_key = 'project_counter'
     FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.system_settings (setting_key, setting_value, description)
    VALUES ('project_counter', '225000', 'Last issued project number as 225000 + sequence');
    v_counter := 225000;
  END IF;

  v_next := GREATEST(v_counter, 225000 + public.max_project_sequence()) + 1;

  -- Belt and braces: step past anything already taken.
  LOOP
    v_result := public.format_project_number(v_next);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.projects WHERE project_number = v_result);
    v_next := v_next + 1;
  END LOOP;

  UPDATE public.system_settings
     SET setting_value = v_next::text, updated_at = now()
   WHERE setting_key = 'project_counter';

  RETURN v_result;
END;
$$;

-- 5. Admin read: where numbering stands.
CREATE OR REPLACE FUNCTION public.get_project_numbering_status()
RETURNS TABLE (
  counter          integer,
  highest_sequence integer,
  highest_in_use   text,
  next_number      text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter integer;
  v_max     integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view project numbering' USING ERRCODE = '42501';
  END IF;

  SELECT setting_value::integer INTO v_counter
    FROM public.system_settings WHERE setting_key = 'project_counter';
  v_counter := COALESCE(v_counter, 225000);
  v_max := public.max_project_sequence();

  RETURN QUERY SELECT
    v_counter,
    v_max,
    CASE WHEN v_max > 0 THEN public.format_project_number(225000 + v_max) ELSE NULL END,
    public.format_project_number(GREATEST(v_counter, 225000 + v_max) + 1);
END;
$$;

-- 6. Admin write: "start the next project at 225-NNN". Forward only — you can
--    skip numbers, you can never land on or behind one already in use.
CREATE OR REPLACE FUNCTION public.set_next_project_number(p_next_sequence integer)
RETURNS TABLE (
  counter          integer,
  highest_sequence integer,
  highest_in_use   text,
  next_number      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change project numbering' USING ERRCODE = '42501';
  END IF;
  IF p_next_sequence IS NULL OR p_next_sequence < 1 OR p_next_sequence > 99999 THEN
    RAISE EXCEPTION 'Next project number must be between 225-001 and 225-99999';
  END IF;

  v_max := public.max_project_sequence();
  IF p_next_sequence <= v_max THEN
    RAISE EXCEPTION 'Project numbers up to % are already in use. The next number must be higher.',
      public.format_project_number(225000 + v_max);
  END IF;

  UPDATE public.system_settings
     SET setting_value = (225000 + p_next_sequence - 1)::text, updated_at = now()
   WHERE setting_key = 'project_counter';
  IF NOT FOUND THEN
    INSERT INTO public.system_settings (setting_key, setting_value, description)
    VALUES ('project_counter', (225000 + p_next_sequence - 1)::text, 'Last issued project number as 225000 + sequence');
  END IF;

  RETURN QUERY SELECT * FROM public.get_project_numbering_status();
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_numbering_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_next_project_number(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_numbering_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_next_project_number(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.max_project_sequence() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.format_project_number(integer) TO authenticated, anon, service_role;

-- 7. Catch the counter up to the numbers already in use (225175 → 225205 today).
--    Guarded: a no-op whenever the counter is already at or ahead of the data.
UPDATE public.system_settings
   SET setting_value = (225000 + public.max_project_sequence())::text,
       updated_at = now()
 WHERE setting_key = 'project_counter'
   AND setting_value::integer < 225000 + public.max_project_sequence();
