-- Update execute_simple_report to use appropriate default sort columns per data source
CREATE OR REPLACE FUNCTION public.execute_simple_report(
  p_data_source TEXT,
  p_filters JSONB DEFAULT '{}',
  p_sort_by TEXT DEFAULT NULL,
  p_sort_dir TEXT DEFAULT 'DESC',
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, reporting
AS $$
DECLARE
  query_text TEXT;
  filter_clause TEXT := '';
  result JSONB;
  start_time TIMESTAMPTZ;
  row_count INTEGER;
  filter_key TEXT;
  filter_value JSONB;
  actual_sort_by TEXT;
BEGIN
  start_time := clock_timestamp();
  
  -- Determine actual sort column based on data source
  -- Use work-date columns instead of created_at for labor/time reports
  actual_sort_by := CASE 
    WHEN p_data_source = 'weekly_labor_hours' AND (p_sort_by IS NULL OR p_sort_by = 'created_at') 
      THEN 'week_start_sunday'
    WHEN p_data_source IN ('time_entries', 'internal_labor_hours', 'internal_costs', 'expenses') AND (p_sort_by IS NULL OR p_sort_by = 'created_at') 
      THEN 'expense_date'
    WHEN p_data_source = 'estimate_line_items' AND (p_sort_by IS NULL OR p_sort_by = 'created_at') 
      THEN 'sort_order'
    ELSE COALESCE(p_sort_by, 'created_at')
  END;
  
  -- Build filter clause from JSONB filters
  FOR filter_key, filter_value IN SELECT * FROM jsonb_each(p_filters)
  LOOP
    IF filter_value->>'operator' = 'equals' THEN
      filter_clause := filter_clause || format(' AND %I = %L', filter_value->>'field', filter_value->>'value');
    ELSIF filter_value->>'operator' = 'not_equals' THEN
      filter_clause := filter_clause || format(' AND %I != %L', filter_value->>'field', filter_value->>'value');
    ELSIF filter_value->>'operator' = 'greater_than' THEN
      filter_clause := filter_clause || format(' AND %I > %L', filter_value->>'field', filter_value->>'value');
    ELSIF filter_value->>'operator' = 'less_than' THEN
      filter_clause := filter_clause || format(' AND %I < %L', filter_value->>'field', filter_value->>'value');
    ELSIF filter_value->>'operator' = 'contains' THEN
      filter_clause := filter_clause || format(' AND %I ILIKE %L', filter_value->>'field', '%' || (filter_value->>'value') || '%');
    ELSIF filter_value->>'operator' = 'in' THEN
      filter_clause := filter_clause || format(' AND %I = ANY(%L::text[])', filter_value->>'field', filter_value->'value');
    ELSIF filter_value->>'operator' = 'between' THEN
      filter_clause := filter_clause || format(' AND %I BETWEEN %L AND %L', 
        filter_value->>'field', 
        filter_value->'value'->>0, 
        filter_value->'value'->>1);
    ELSIF filter_value->>'operator' = 'is_null' THEN
      IF (filter_value->>'value')::boolean THEN
        filter_clause := filter_clause || format(' AND %I IS NULL', filter_value->>'field');
      ELSE
        filter_clause := filter_clause || format(' AND %I IS NOT NULL', filter_value->>'field');
      END IF;
    ELSIF filter_value->>'operator' = 'contains_any' THEN
      filter_clause := filter_clause || format(' AND %I && %L::text[]', filter_value->>'field', filter_value->'value');
    ELSIF filter_value->>'operator' = 'contains_only' THEN
      filter_clause := filter_clause || format(' AND %I <@ %L::text[]', filter_value->>'field', filter_value->'value');
    ELSIF filter_value->>'operator' = 'contains_all' THEN
      filter_clause := filter_clause || format(' AND %I @> %L::text[]', filter_value->>'field', filter_value->'value');
    END IF;
  END LOOP;
  
  -- Remove leading ' AND ' if present
  IF filter_clause != '' THEN
    filter_clause := ' WHERE ' || substring(filter_clause from 6);
  END IF;
  
  -- Build query based on data source
  IF p_data_source = 'projects' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT * FROM projects
        %s ORDER BY %I %s LIMIT %s
      ) t',
      filter_clause, actual_sort_by, p_sort_dir, p_limit
    );
  ELSIF p_data_source = 'expenses' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT e.*, p.project_name, p.project_number, pay.payee_name
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN payees pay ON e.payee_id = pay.id
        %s ORDER BY e.%I %s LIMIT %s
      ) t',
      filter_clause, actual_sort_by, p_sort_dir, p_limit
    );
  ELSIF p_data_source = 'quotes' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT q.*, p.project_name, p.project_number, pay.payee_name
        FROM quotes q
        LEFT JOIN projects p ON q.project_id = p.id
        LEFT JOIN payees pay ON q.payee_id = pay.id
        %s ORDER BY q.%I %s LIMIT %s
      ) t',
      filter_clause, actual_sort_by, p_sort_dir, p_limit
    );
  ELSIF p_data_source = 'time_entries' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT e.*, p.project_name, p.project_number, pr.full_name as employee_name
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN profiles pr ON e.user_id = pr.id
        WHERE e.category = ''internal_labor''
        %s ORDER BY e.%I %s LIMIT %s
      ) t',
      CASE WHEN filter_clause != '' THEN ' AND ' || substring(filter_clause from 8) ELSE '' END, 
      actual_sort_by, p_sort_dir, p_limit
    );
  ELSIF p_data_source = 'estimate_line_items' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT eli.*, e.estimate_number, p.project_name, p.project_number
        FROM estimate_line_items eli
        LEFT JOIN estimates e ON eli.estimate_id = e.id
        LEFT JOIN projects p ON e.project_id = p.id
        %s ORDER BY eli.%I %s LIMIT %s
      ) t',
      filter_clause, actual_sort_by, p_sort_dir, p_limit
    );
  ELSIF p_data_source = 'internal_costs' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT e.id, e.expense_date, e.amount, e.description, e.category,
               p.project_name, p.project_number,
               pay.payee_name,
               pr.full_name as entered_by
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN payees pay ON e.payee_id = pay.id
        LEFT JOIN profiles pr ON e.user_id = pr.id
        WHERE e.category IN (''internal_labor'', ''internal_materials'', ''internal_equipment'', ''internal_other'')
        %s ORDER BY e.%I %s LIMIT %s
      ) t',
      CASE WHEN filter_clause != '' THEN ' AND ' || substring(filter_clause from 8) ELSE '' END,
      actual_sort_by, p_sort_dir, p_limit
    );
  ELSIF p_data_source = 'internal_labor_hours' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT e.id, e.expense_date, e.amount as labor_cost,
               e.start_time, e.end_time,
               e.lunch_taken, e.lunch_duration_minutes,
               CASE 
                 WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
                   ROUND(
                     (EXTRACT(EPOCH FROM (e.end_time::time - e.start_time::time)) / 3600) -
                     COALESCE(CASE WHEN e.lunch_taken THEN e.lunch_duration_minutes / 60.0 ELSE 0 END, 0),
                     2
                   )
                 ELSE NULL
               END as net_hours,
               CASE 
                 WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
                   ROUND(EXTRACT(EPOCH FROM (e.end_time::time - e.start_time::time)) / 3600, 2)
                 ELSE NULL
               END as gross_hours,
               e.description,
               p.project_name, p.project_number,
               pr.full_name as employee_name,
               pr.id as employee_id
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN profiles pr ON e.user_id = pr.id
        WHERE e.category = ''internal_labor''
          AND e.start_time IS NOT NULL 
          AND e.end_time IS NOT NULL
        %s ORDER BY e.%I %s LIMIT %s
      ) t',
      CASE WHEN filter_clause != '' THEN ' AND ' || substring(filter_clause from 8) ELSE '' END,
      actual_sort_by, p_sort_dir, p_limit
    );
  ELSIF p_data_source = 'weekly_labor_hours' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT * FROM reporting.weekly_labor_hours
        %s ORDER BY %I %s LIMIT %s
      ) t',
      filter_clause, actual_sort_by, p_sort_dir, p_limit
    );
  ELSE
    RAISE EXCEPTION 'Unknown data source: %', p_data_source;
  END IF;
  
  -- Execute query and get results
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json), ''[]''::jsonb) FROM (' || query_text || ') subq'
  INTO result;
  
  -- Get row count
  row_count := jsonb_array_length(result);
  
  -- Return result with metadata
  RETURN jsonb_build_object(
    'data', result,
    'metadata', jsonb_build_object(
      'row_count', row_count,
      'execution_time_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::integer
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error executing report: %', SQLERRM;
END;
$$;