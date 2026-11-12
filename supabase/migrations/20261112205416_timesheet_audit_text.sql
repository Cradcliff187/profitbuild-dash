-- Daily timesheet audit text (read-only). Builds the short per-person summary
-- that the "Daily Timesheet Audit" scheduled SMS sends to Chris at noon ET on weekdays.
-- Period: Monday of the current work week through the day before p_as_of.
-- On a Monday that means all of last week (Mon-Sun), with Mon-Fri checked for missing days.
--
-- Already applied to production on 2026-11-12 (version 20261112205416).
--
-- Two pieces of setup live in the database only, not in this migration, because
-- they reference a generated row id:
--   1. scheduled_sms_messages row "Daily Timesheet Audit (to Chris)":
--      recurring, cron '0 12 * * 1-5', timezone America/New_York, target = Chris's profile.
--      The existing process-scheduled-sms dispatcher sends it like any other scheduled SMS.
--   2. pg_cron job 'timesheet-audit-refresh' ('55 15,16 * * 1-5' UTC = 11:55 ET in both
--      EST and EDT) which rewrites that row's message_template from this function.
create or replace function public.timesheet_audit_text(p_as_of date default null)
returns text
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_as_of date := coalesce(p_as_of, (now() at time zone 'America/New_York')::date);
  v_end date := v_as_of - 1;
  v_last_workday date := v_as_of - 1;
  v_start date;
  v_header text;
  v_body text;
begin
  while extract(isodow from v_last_workday) > 5 loop
    v_last_workday := v_last_workday - 1;
  end loop;
  v_start := date_trunc('week', v_last_workday)::date; -- Monday

  v_header := 'Timesheets ' || to_char(v_start, 'Dy FMMM/FMDD')
    || case when v_last_workday > v_start
            then '-' || to_char(v_last_workday, 'Dy FMMM/FMDD') else '' end;

  with crew as (
    -- Employees: active internal labor with an app login.
    -- Tom Finn is a test login; Matt Radcliff is not on the audit list.
    select p.id, split_part(p.payee_name, ' ', 1) as first_name
    from payees p
    where p.is_internal and p.is_active
      and p.payee_type = 'internal_labor'
      and p.user_id is not null
      and p.payee_name not in ('Tom Finn', 'Matt Radcliff')
  ),
  entries as (
    select e.payee_id, e.expense_date, coalesce(e.hours, 0) as hours,
           e.approval_status, e.project_id, pr.project_number, pr.project_name
    from expenses e
    left join projects pr on pr.id = e.project_id
    where e.is_time_entry
      and e.expense_date between v_start and v_end
  ),
  workdays as (
    select d::date as d
    from generate_series(v_start::timestamp, v_last_workday::timestamp, interval '1 day') d
    where extract(isodow from d) <= 5
  ),
  per as (
    select c.first_name,
      coalesce((select sum(x.hours) from entries x where x.payee_id = c.id), 0) as total,
      (select string_agg(
                trim(trailing '.' from trim(trailing '0' from round(o.h, 2)::text)) || ' ' || o.lbl,
                ', ' order by o.lbl)
         from (select lower(split_part(x.project_name, ' ', 1)) as lbl, sum(x.hours) as h
               from entries x
               where x.payee_id = c.id
                 and x.project_number is not null
                 and x.project_number not like '225-%'
               group by 1) o) as overhead,
      (select string_agg(to_char(w.d, 'Dy'), ', ' order by w.d)
         from workdays w
         where not exists (select 1 from entries x
                           where x.payee_id = c.id and x.expense_date = w.d)) as missing,
      (select count(*) from entries x
         where x.payee_id = c.id and coalesce(x.approval_status, '') <> 'approved') as not_approved,
      (select count(*) from entries x
         where x.payee_id = c.id and x.project_id is null) as no_project
    from crew c
  )
  select string_agg(
           first_name || ' '
           || trim(trailing '.' from trim(trailing '0' from round(total, 2)::text)) || 'h'
           || coalesce(' (' || overhead || ')', '')
           || ': '
           || coalesce(nullif(concat_ws('; ',
                 case when missing is not null then 'no entry ' || missing end,
                 case when not_approved > 0 then not_approved || ' not approved' end,
                 case when no_project > 0 then no_project || ' no project' end), ''), 'ok'),
           E'\n' order by first_name)
    into v_body
  from per;

  return v_header || E'\n' || coalesce(v_body, 'No active crew found');
end;
$function$;

-- Employee hours: not callable through the public API.
revoke all on function public.timesheet_audit_text(date) from public, anon, authenticated;
grant execute on function public.timesheet_audit_text(date) to service_role;
