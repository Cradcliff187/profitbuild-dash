-- Widen line-item quantity from numeric(10,2) to numeric(15,5).
--
-- Why: dollar-sourced labor imports derive hours by division (e.g. $2,000 / $75 = 26.6667 hr).
-- numeric(10,2) silently rounded that to 26.67, so totals recomputed from quantity drifted from
-- the source dollars (26.67 x 75 = $2,000.25; estimate 225-136 landed at $32,501.24 instead of
-- $32,500.00). 5 decimals mirrors cost_per_unit / price_per_unit numeric(15,5), and makes the
-- dollars -> hours -> dollars round trip exact to the cent for any realistic hourly rate.
-- change_order_line_items.quantity is already unconstrained numeric and needs no change.
--
-- Postgres cannot ALTER TYPE on a column referenced by generated columns, and the generated
-- columns are referenced by three views, so: drop views -> drop generated columns -> widen ->
-- re-add generated columns (expressions verbatim) -> recreate views (definitions verbatim) ->
-- restore grants. Existing rows keep their 2dp quantities, so no stored totals change here.

-- 1. Drop dependent views (recreated verbatim in step 4).
DROP VIEW IF EXISTS reporting.estimate_quote_status_summary;
DROP VIEW IF EXISTS reporting.estimate_line_items_quote_status;
DROP VIEW IF EXISTS reporting.internal_labor_hours_by_project;
DROP VIEW IF EXISTS public.estimate_financial_summary;

-- 2. estimate_line_items: rebuild generated columns around the widened quantity.
ALTER TABLE public.estimate_line_items
  DROP COLUMN total,
  DROP COLUMN total_cost,
  DROP COLUMN total_markup;

ALTER TABLE public.estimate_line_items
  ALTER COLUMN quantity TYPE numeric(15,5);

ALTER TABLE public.estimate_line_items
  ADD COLUMN total numeric(15,2) GENERATED ALWAYS AS ((quantity * price_per_unit)::numeric(15,2)) STORED,
  ADD COLUMN total_cost numeric(12,2) GENERATED ALWAYS AS ((quantity * COALESCE(cost_per_unit, 0::numeric))::numeric(12,2)) STORED,
  ADD COLUMN total_markup numeric GENERATED ALWAYS AS (quantity *
    CASE
      WHEN markup_percent IS NOT NULL THEN (cost_per_unit * (markup_percent / 100::numeric))
      WHEN markup_amount IS NOT NULL THEN markup_amount
      ELSE 0::numeric
    END) STORED;

-- 3. quote_line_items: same treatment.
ALTER TABLE public.quote_line_items
  DROP COLUMN total,
  DROP COLUMN total_cost,
  DROP COLUMN total_markup;

ALTER TABLE public.quote_line_items
  ALTER COLUMN quantity TYPE numeric(15,5);

ALTER TABLE public.quote_line_items
  ADD COLUMN total numeric(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  ADD COLUMN total_cost numeric GENERATED ALWAYS AS (quantity * cost_per_unit) STORED,
  ADD COLUMN total_markup numeric GENERATED ALWAYS AS (
    CASE
      WHEN markup_percent IS NOT NULL THEN ((quantity * cost_per_unit) * (markup_percent / 100::numeric))
      WHEN markup_amount IS NOT NULL THEN (quantity * markup_amount)
      ELSE 0::numeric
    END) STORED;

-- 4. Recreate views verbatim.

CREATE VIEW public.estimate_financial_summary AS
 SELECT e.id AS estimate_id,
    e.project_id,
    e.estimate_number,
    e.status,
    e.contingency_percent,
    COALESCE(sum(eli.total), 0::numeric) AS subtotal,
    COALESCE(sum(eli.total_cost), 0::numeric) AS total_estimated_cost,
    COALESCE(sum(eli.total_markup), 0::numeric) AS estimated_gross_profit,
    COALESCE(sum(
        CASE
            WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
            ELSE 0::numeric
        END), 0::numeric) AS total_labor_hours,
    COALESCE(sum(
        CASE
            WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_cushion_amount
            ELSE 0::numeric
        END), 0::numeric) AS total_labor_cushion,
    COALESCE(sum(
        CASE
            WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
            ELSE 0::numeric
        END), 0::numeric) AS total_labor_actual_cost,
    COALESCE(sum(
        CASE
            WHEN eli.category = 'labor_internal'::expense_category THEN eli.total_cost
            ELSE 0::numeric
        END), 0::numeric) AS total_labor_billing_cost,
    COALESCE(sum(
        CASE
            WHEN eli.category = 'labor_internal'::expense_category THEN eli.total
            ELSE 0::numeric
        END), 0::numeric) AS total_labor_client_price,
        CASE
            WHEN COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
                ELSE 0::numeric
            END), 0::numeric) > 0::numeric AND COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
                ELSE 0::numeric
            END), 0::numeric) > 0::numeric THEN COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_cushion_amount
                ELSE 0::numeric
            END), 0::numeric) / (COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
                ELSE 0::numeric
            END), 0::numeric) / NULLIF(COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
                ELSE 0::numeric
            END), 0::numeric), 0::numeric))
            ELSE 0::numeric
        END AS cushion_hours_capacity,
    COALESCE(sum(
        CASE
            WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
            ELSE 0::numeric
        END), 0::numeric) +
        CASE
            WHEN COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
                ELSE 0::numeric
            END), 0::numeric) > 0::numeric AND COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
                ELSE 0::numeric
            END), 0::numeric) > 0::numeric THEN COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_cushion_amount
                ELSE 0::numeric
            END), 0::numeric) / (COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
                ELSE 0::numeric
            END), 0::numeric) / NULLIF(COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
                ELSE 0::numeric
            END), 0::numeric), 0::numeric))
            ELSE 0::numeric
        END AS total_labor_capacity,
        CASE
            WHEN COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
                ELSE 0::numeric
            END), 0::numeric) > 0::numeric THEN
            CASE
                WHEN COALESCE(sum(
                CASE
                    WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
                    ELSE 0::numeric
                END), 0::numeric) > 0::numeric THEN COALESCE(sum(
                CASE
                    WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_cushion_amount
                    ELSE 0::numeric
                END), 0::numeric) / (COALESCE(sum(
                CASE
                    WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
                    ELSE 0::numeric
                END), 0::numeric) / NULLIF(COALESCE(sum(
                CASE
                    WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
                    ELSE 0::numeric
                END), 0::numeric), 0::numeric))
                ELSE 0::numeric
            END / NULLIF(COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours
                ELSE 0::numeric
            END), 0::numeric), 0::numeric) * 100::numeric
            ELSE 0::numeric
        END AS schedule_buffer_percent,
    COALESCE(sum(eli.total_markup), 0::numeric) + COALESCE(sum(
        CASE
            WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_cushion_amount
            ELSE 0::numeric
        END), 0::numeric) AS max_gross_profit_potential,
        CASE
            WHEN COALESCE(sum(eli.total_cost), 0::numeric) > 0::numeric THEN COALESCE(sum(eli.total_markup), 0::numeric) / COALESCE(sum(eli.total_cost), 0::numeric) * 100::numeric
            ELSE 0::numeric
        END AS estimated_gross_margin_percent,
        CASE
            WHEN COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
                ELSE eli.total_cost
            END), 0::numeric) > 0::numeric THEN (COALESCE(sum(eli.total_markup), 0::numeric) + COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_cushion_amount
                ELSE 0::numeric
            END), 0::numeric)) / COALESCE(sum(
            CASE
                WHEN eli.category = 'labor_internal'::expense_category THEN eli.labor_hours * eli.actual_cost_rate_per_hour
                ELSE eli.total_cost
            END), 0::numeric) * 100::numeric
            ELSE 0::numeric
        END AS max_potential_margin_percent,
    COALESCE(sum(eli.total), 0::numeric) * (e.contingency_percent / 100::numeric) AS contingency_amount,
    COALESCE(sum(eli.total), 0::numeric) + COALESCE(sum(eli.total), 0::numeric) * (e.contingency_percent / 100::numeric) AS total_with_contingency,
    e.created_at,
    e.updated_at
   FROM estimates e
     LEFT JOIN estimate_line_items eli ON eli.estimate_id = e.id
  GROUP BY e.id, e.project_id, e.estimate_number, e.status, e.contingency_percent, e.created_at, e.updated_at;

GRANT ALL ON public.estimate_financial_summary TO anon, authenticated, service_role;

CREATE VIEW reporting.estimate_line_items_quote_status AS
 SELECT e.id AS estimate_id,
    e.estimate_number,
    e.project_id,
    p.project_number,
    p.project_name,
    p.client_name,
    eli.id AS line_item_id,
    eli.category,
    eli.description,
    eli.quantity,
    eli.price_per_unit,
    eli.total,
    eli.cost_per_unit,
    eli.total_cost,
    eli.unit,
    eli.sort_order,
    count(DISTINCT qli.quote_id) AS quote_count,
    count(DISTINCT
        CASE
            WHEN q.status = 'accepted'::quote_status THEN qli.quote_id
            ELSE NULL::uuid
        END) AS accepted_quote_count,
    count(DISTINCT
        CASE
            WHEN q.status = 'pending'::quote_status THEN qli.quote_id
            ELSE NULL::uuid
        END) AS pending_quote_count,
    count(DISTINCT
        CASE
            WHEN q.status = 'rejected'::quote_status THEN qli.quote_id
            ELSE NULL::uuid
        END) AS rejected_quote_count,
    count(DISTINCT
        CASE
            WHEN q.status = 'expired'::quote_status THEN qli.quote_id
            ELSE NULL::uuid
        END) AS expired_quote_count,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('quote_id', q_1.id, 'quote_number', q_1.quote_number, 'vendor', pay.payee_name, 'vendor_id', q_1.payee_id, 'status', q_1.status, 'total_amount', qli_1.total, 'date_received', q_1.date_received, 'valid_until', q_1.valid_until) ORDER BY q_1.date_received DESC) AS jsonb_agg
           FROM quote_line_items qli_1
             JOIN quotes q_1 ON q_1.id = qli_1.quote_id
             LEFT JOIN payees pay ON pay.id = q_1.payee_id
          WHERE qli_1.estimate_line_item_id = eli.id), '[]'::jsonb) AS quote_details,
    count(DISTINCT qli.quote_id) > 0 AS has_quotes,
    count(DISTINCT
        CASE
            WHEN q.status = 'accepted'::quote_status THEN qli.quote_id
            ELSE NULL::uuid
        END) > 0 AS has_accepted_quote
   FROM estimates e
     JOIN projects p ON p.id = e.project_id
     JOIN estimate_line_items eli ON eli.estimate_id = e.id
     LEFT JOIN quote_line_items qli ON qli.estimate_line_item_id = eli.id
     LEFT JOIN quotes q ON q.id = qli.quote_id
  WHERE p.project_number <> ALL (ARRAY['SYS-000'::text, '000-UNASSIGNED'::text])
  GROUP BY e.id, e.estimate_number, e.project_id, p.project_number, p.project_name, p.client_name, eli.id, eli.category, eli.description, eli.quantity, eli.price_per_unit, eli.total, eli.cost_per_unit, eli.total_cost, eli.unit, eli.sort_order;

CREATE VIEW reporting.internal_labor_hours_by_project AS
 WITH estimate_totals AS (
         SELECT p_1.id AS project_id,
            COALESCE(sum(
                CASE
                    WHEN eli.category = 'labor_internal'::expense_category AND ((upper(TRIM(BOTH FROM COALESCE(eli.unit, ''::text))) = ANY (ARRAY['HR'::text, 'HRS'::text, 'HOUR'::text, 'HOURS'::text, 'H'::text, ''::text])) OR eli.unit IS NULL) THEN eli.quantity
                    ELSE 0::numeric
                END), 0::numeric) AS estimated_hours,
            COALESCE(sum(
                CASE
                    WHEN eli.category = 'labor_internal'::expense_category THEN eli.total_cost
                    ELSE 0::numeric
                END), 0::numeric) AS estimated_cost
           FROM projects p_1
             LEFT JOIN estimates est ON est.project_id = p_1.id AND est.status = 'approved'::estimate_status AND est.is_current_version = true
             LEFT JOIN estimate_line_items eli ON eli.estimate_id = est.id AND eli.category = 'labor_internal'::expense_category
          WHERE p_1.category = 'construction'::project_category
          GROUP BY p_1.id
        ), expense_totals AS (
         SELECT p_1.id AS project_id,
            COALESCE(sum(
                CASE
                    WHEN e.category = 'labor_internal'::expense_category AND e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN EXTRACT(epoch FROM e.end_time::time without time zone - e.start_time::time without time zone) / 3600::numeric
                    WHEN e.category = 'labor_internal'::expense_category AND e.description IS NOT NULL THEN NULLIF(regexp_replace(e.description, '[^0-9.]'::text, ''::text, 'g'::text), ''::text)::numeric
                    WHEN e.category = 'labor_internal'::expense_category AND e.payee_id IS NOT NULL THEN e.amount / NULLIF(( SELECT payees.hourly_rate
                       FROM payees
                      WHERE payees.id = e.payee_id), 0::numeric)
                    ELSE 0::numeric
                END), 0::numeric) AS actual_hours,
            COALESCE(sum(
                CASE
                    WHEN e.category = 'labor_internal'::expense_category THEN e.amount
                    ELSE 0::numeric
                END), 0::numeric) AS actual_cost
           FROM projects p_1
             LEFT JOIN expenses e ON e.project_id = p_1.id AND e.category = 'labor_internal'::expense_category AND e.is_split = false
          WHERE p_1.category = 'construction'::project_category
          GROUP BY p_1.id
        ), split_labor_totals AS (
         SELECT es.project_id,
            COALESCE(sum(
                CASE
                    WHEN pe.start_time IS NOT NULL AND pe.end_time IS NOT NULL THEN EXTRACT(epoch FROM pe.end_time::time without time zone - pe.start_time::time without time zone) / 3600::numeric * COALESCE(es.split_percentage / 100.0, es.split_amount / NULLIF(pe.amount, 0::numeric))
                    WHEN pe.description IS NOT NULL THEN NULLIF(regexp_replace(pe.description, '[^0-9.]'::text, ''::text, 'g'::text), ''::text)::numeric * COALESCE(es.split_percentage / 100.0, es.split_amount / NULLIF(pe.amount, 0::numeric))
                    WHEN pe.payee_id IS NOT NULL THEN es.split_amount / NULLIF(( SELECT payees.hourly_rate
                       FROM payees
                      WHERE payees.id = pe.payee_id), 0::numeric)
                    ELSE 0::numeric
                END), 0::numeric) AS split_hours,
            COALESCE(sum(es.split_amount), 0::numeric) AS split_cost
           FROM expense_splits es
             JOIN expenses pe ON pe.id = es.expense_id
             JOIN projects p_1 ON p_1.id = es.project_id AND p_1.category = 'construction'::project_category
          WHERE pe.category = 'labor_internal'::expense_category
          GROUP BY es.project_id
        ), has_labor AS (
         SELECT DISTINCT p_1.id AS project_id
           FROM projects p_1
          WHERE p_1.category = 'construction'::project_category AND ((EXISTS ( SELECT 1
                   FROM estimates est
                     JOIN estimate_line_items eli ON eli.estimate_id = est.id
                  WHERE est.project_id = p_1.id AND est.status = 'approved'::estimate_status AND est.is_current_version = true AND eli.category = 'labor_internal'::expense_category)) OR (EXISTS ( SELECT 1
                   FROM expenses e
                  WHERE e.project_id = p_1.id AND e.category = 'labor_internal'::expense_category AND e.is_split = false)) OR (EXISTS ( SELECT 1
                   FROM expense_splits es
                     JOIN expenses pe ON pe.id = es.expense_id
                  WHERE es.project_id = p_1.id AND pe.category = 'labor_internal'::expense_category)))
        )
 SELECT p.id AS project_id,
    p.project_number,
    p.project_name,
    p.client_name,
    p.status,
    COALESCE(et.estimated_hours, 0::numeric) AS estimated_hours,
    COALESCE(et.estimated_cost, 0::numeric) AS estimated_cost,
    COALESCE(ext.actual_hours, 0::numeric) + COALESCE(slt.split_hours, 0::numeric) AS actual_hours,
    COALESCE(ext.actual_cost, 0::numeric) + COALESCE(slt.split_cost, 0::numeric) AS actual_cost,
    COALESCE(et.estimated_hours, 0::numeric) - (COALESCE(ext.actual_hours, 0::numeric) + COALESCE(slt.split_hours, 0::numeric)) AS hours_variance,
    COALESCE(et.estimated_cost, 0::numeric) - (COALESCE(ext.actual_cost, 0::numeric) + COALESCE(slt.split_cost, 0::numeric)) AS cost_variance
   FROM projects p
     JOIN has_labor hl ON hl.project_id = p.id
     LEFT JOIN estimate_totals et ON et.project_id = p.id
     LEFT JOIN expense_totals ext ON ext.project_id = p.id
     LEFT JOIN split_labor_totals slt ON slt.project_id = p.id;

CREATE VIEW reporting.estimate_quote_status_summary AS
 SELECT estimate_id,
    estimate_number,
    project_id,
    project_number,
    project_name,
    client_name,
    count(DISTINCT line_item_id) AS total_line_items,
    count(DISTINCT
        CASE
            WHEN has_quotes THEN line_item_id
            ELSE NULL::uuid
        END) AS line_items_with_quotes,
    count(DISTINCT
        CASE
            WHEN NOT has_quotes THEN line_item_id
            ELSE NULL::uuid
        END) AS line_items_without_quotes,
    count(DISTINCT
        CASE
            WHEN has_accepted_quote THEN line_item_id
            ELSE NULL::uuid
        END) AS line_items_with_accepted_quotes,
        CASE
            WHEN count(DISTINCT line_item_id) > 0 THEN round(count(DISTINCT
            CASE
                WHEN has_quotes THEN line_item_id
                ELSE NULL::uuid
            END)::numeric / count(DISTINCT line_item_id)::numeric * 100::numeric, 1)
            ELSE 0::numeric
        END AS quote_coverage_percent,
    sum(quote_count) AS total_quotes_received,
    sum(accepted_quote_count) AS total_accepted_quotes,
    sum(pending_quote_count) AS total_pending_quotes,
    sum(rejected_quote_count) AS total_rejected_quotes,
    sum(expired_quote_count) AS total_expired_quotes,
    sum(total) AS total_estimate_amount,
    sum(total_cost) AS total_estimate_cost
   FROM reporting.estimate_line_items_quote_status
  GROUP BY estimate_id, estimate_number, project_id, project_number, project_name, client_name;
