-- Fix execute_simple_report function with correct expense_category enum values
CREATE OR REPLACE FUNCTION public.execute_simple_report(
  p_data_source text,
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_sort_by text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'DESC',
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_query text;
  v_where_clause text := '';
  v_order_clause text;
  v_filter_key text;
  v_filter_obj jsonb;
  v_field text;
  v_operator text;
  v_value jsonb;
  v_conditions text[] := ARRAY[]::text[];
  v_row_count integer;
BEGIN
  -- Build WHERE clause from filters
  IF p_filters IS NOT NULL AND p_filters != '{}'::jsonb THEN
    FOR v_filter_key, v_filter_obj IN SELECT * FROM jsonb_each(p_filters)
    LOOP
      v_field := v_filter_obj->>'field';
      v_operator := v_filter_obj->>'operator';
      v_value := v_filter_obj->'value';
      
      -- Build condition based on operator
      CASE v_operator
        WHEN 'equals' THEN
          IF jsonb_typeof(v_value) = 'string' THEN
            v_conditions := array_append(v_conditions, format('%I = %L', v_field, v_value #>> '{}'));
          ELSE
            v_conditions := array_append(v_conditions, format('%I = %s', v_field, v_value));
          END IF;
        WHEN 'not_equals' THEN
          IF jsonb_typeof(v_value) = 'string' THEN
            v_conditions := array_append(v_conditions, format('%I != %L', v_field, v_value #>> '{}'));
          ELSE
            v_conditions := array_append(v_conditions, format('%I != %s', v_field, v_value));
          END IF;
        WHEN 'greater_than' THEN
          IF jsonb_typeof(v_value) = 'string' THEN
            v_conditions := array_append(v_conditions, format('%I > %L', v_field, v_value #>> '{}'));
          ELSE
            v_conditions := array_append(v_conditions, format('%I > %s', v_field, v_value));
          END IF;
        WHEN 'less_than' THEN
          IF jsonb_typeof(v_value) = 'string' THEN
            v_conditions := array_append(v_conditions, format('%I < %L', v_field, v_value #>> '{}'));
          ELSE
            v_conditions := array_append(v_conditions, format('%I < %s', v_field, v_value));
          END IF;
        WHEN 'contains' THEN
          v_conditions := array_append(v_conditions, format('%I ILIKE %L', v_field, '%' || (v_value #>> '{}') || '%'));
        WHEN 'in' THEN
          v_conditions := array_append(v_conditions, format('%I = ANY(ARRAY(SELECT jsonb_array_elements_text(%L::jsonb)))', v_field, v_value::text));
        WHEN 'between' THEN
          v_conditions := array_append(v_conditions, format('%I BETWEEN %L AND %L', v_field, v_value->0 #>> '{}', v_value->1 #>> '{}'));
        WHEN 'is_null' THEN
          IF (v_value #>> '{}')::boolean THEN
            v_conditions := array_append(v_conditions, format('%I IS NULL', v_field));
          ELSE
            v_conditions := array_append(v_conditions, format('%I IS NOT NULL', v_field));
          END IF;
        ELSE
          NULL;
      END CASE;
    END LOOP;
    
    IF array_length(v_conditions, 1) > 0 THEN
      v_where_clause := ' AND ' || array_to_string(v_conditions, ' AND ');
    END IF;
  END IF;

  -- Build ORDER clause
  v_order_clause := format(' ORDER BY %I %s NULLS LAST', p_sort_by, p_sort_dir);

  -- Execute query based on data source
  CASE p_data_source
    WHEN 'projects' THEN
      v_query := format('
        SELECT row_to_json(t) FROM (
          SELECT 
            p.project_number,
            p.project_name,
            p.client_name,
            p.status::text,
            p.contracted_amount,
            p.current_margin,
            p.margin_percentage,
            COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id), 0) as total_expenses,
            p.target_margin,
            p.projected_margin,
            (p.contracted_amount - COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id), 0)) as remaining_budget,
            (COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id), 0) - COALESCE(p.original_est_costs, 0)) as cost_variance,
            CASE WHEN p.contracted_amount > 0 
              THEN ROUND((COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id), 0) / p.contracted_amount * 100)::numeric, 1)
              ELSE 0 
            END as budget_utilization_percent,
            p.contingency_remaining,
            p.start_date,
            p.end_date,
            COALESCE((SELECT SUM(client_amount) FROM change_orders WHERE project_id = p.id AND status = ''approved''), 0) as change_order_revenue,
            COALESCE((SELECT COUNT(*) FROM change_orders WHERE project_id = p.id), 0) as change_order_count,
            COALESCE((SELECT SUM(amount) FROM project_revenues WHERE project_id = p.id), 0) as total_invoiced
          FROM projects p
          WHERE 1=1 %s
          %s
          LIMIT %s
        ) t
      ', v_where_clause, v_order_clause, p_limit);

    WHEN 'expenses' THEN
      v_query := format('
        SELECT row_to_json(t) FROM (
          SELECT 
            e.expense_date,
            e.amount,
            e.category::text,
            COALESCE(pay.payee_name, ''Unknown'') as payee_name,
            p.project_number,
            p.project_name,
            e.description,
            e.approval_status
          FROM expenses e
          JOIN projects p ON e.project_id = p.id
          LEFT JOIN payees pay ON e.payee_id = pay.id
          WHERE 1=1 %s
          %s
          LIMIT %s
        ) t
      ', v_where_clause, v_order_clause, p_limit);

    WHEN 'quotes' THEN
      v_query := format('
        SELECT row_to_json(t) FROM (
          SELECT 
            q.quote_number,
            q.total_amount,
            q.status::text,
            q.date_received,
            COALESCE(pay.payee_name, ''Unknown'') as payee_name,
            p.project_number,
            p.project_name
          FROM quotes q
          JOIN projects p ON q.project_id = p.id
          LEFT JOIN payees pay ON q.payee_id = pay.id
          WHERE 1=1 %s
          %s
          LIMIT %s
        ) t
      ', v_where_clause, v_order_clause, p_limit);

    WHEN 'time_entries' THEN
      v_query := format('
        SELECT row_to_json(t) FROM (
          SELECT 
            e.expense_date,
            COALESCE(pay.full_name, pay.payee_name) as worker_name,
            pay.employee_number,
            ROUND((e.amount / NULLIF(pay.hourly_rate, 0))::numeric, 2) as hours,
            e.amount,
            pay.hourly_rate,
            p.project_number,
            p.project_name,
            e.approval_status
          FROM expenses e
          JOIN projects p ON e.project_id = p.id
          LEFT JOIN payees pay ON e.payee_id = pay.id
          WHERE e.category = ''labor_internal'' %s
          %s
          LIMIT %s
        ) t
      ', v_where_clause, v_order_clause, p_limit);

    WHEN 'weekly_labor_hours' THEN
      v_query := format('
        SELECT row_to_json(t) FROM (
          SELECT 
            pay.employee_number,
            COALESCE(pay.full_name, pay.payee_name) as employee_name,
            date_trunc(''week'', e.expense_date::date)::date as week_start_sunday,
            ROUND(SUM(e.amount / NULLIF(pay.hourly_rate, 0))::numeric, 2) as total_hours,
            SUM(e.amount) as total_cost,
            COUNT(*) as entry_count
          FROM expenses e
          LEFT JOIN payees pay ON e.payee_id = pay.id
          WHERE e.category = ''labor_internal'' %s
          GROUP BY pay.employee_number, COALESCE(pay.full_name, pay.payee_name), date_trunc(''week'', e.expense_date::date)
          %s
          LIMIT %s
        ) t
      ', v_where_clause, v_order_clause, p_limit);

    WHEN 'estimate_line_items' THEN
      v_query := format('
        SELECT row_to_json(t) FROM (
          SELECT 
            est.estimate_number,
            p.project_number,
            p.project_name,
            eli.category::text,
            eli.description,
            eli.quantity,
            eli.total,
            eli.total_cost
          FROM estimate_line_items eli
          JOIN estimates est ON eli.estimate_id = est.id
          JOIN projects p ON est.project_id = p.id
          WHERE 1=1 %s
          %s
          LIMIT %s
        ) t
      ', v_where_clause, v_order_clause, p_limit);

    WHEN 'internal_costs' THEN
      v_query := format('
        SELECT row_to_json(t) FROM (
          SELECT 
            e.category::text,
            e.expense_date,
            ROUND((e.amount / NULLIF(pay.hourly_rate, 0))::numeric, 2) as hours,
            e.amount,
            COALESCE(pay.full_name, pay.payee_name) as worker_name,
            p.project_number,
            p.project_name
          FROM expenses e
          JOIN projects p ON e.project_id = p.id
          LEFT JOIN payees pay ON e.payee_id = pay.id
          WHERE e.category IN (''labor_internal'', ''materials'', ''equipment'', ''tools'', ''other'') %s
          %s
          LIMIT %s
        ) t
      ', v_where_clause, v_order_clause, p_limit);

    ELSE
      RETURN jsonb_build_object('error', 'Unknown data source: ' || p_data_source);
  END CASE;

  -- Execute the query and collect results
  EXECUTE 'SELECT jsonb_agg(row_to_json) FROM (' || v_query || ') sub' INTO v_result;
  
  -- Get row count
  v_row_count := COALESCE(jsonb_array_length(v_result), 0);

  RETURN jsonb_build_object(
    'data', COALESCE(v_result, '[]'::jsonb),
    'metadata', jsonb_build_object(
      'data_source', p_data_source,
      'row_count', v_row_count,
      'filters_applied', p_filters,
      'sort_by', p_sort_by,
      'sort_dir', p_sort_dir
    )
  );
END;
$$;