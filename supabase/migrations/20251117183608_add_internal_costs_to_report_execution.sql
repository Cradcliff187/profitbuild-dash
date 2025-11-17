-- Add internal_costs as a data source option in execute_simple_report function
-- Includes both labor_internal and management categories with hours calculation for labor_internal

CREATE OR REPLACE FUNCTION public.execute_simple_report(
  p_data_source TEXT,
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'DESC',
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  query_text TEXT;
  result_data JSONB;
  row_count INTEGER;
  start_time TIMESTAMP;
  execution_time INTEGER;
  filter_clause TEXT := '';
  sort_clause TEXT := '';
  where_conditions TEXT[] := ARRAY[]::TEXT[];
  filter_key TEXT;
  filter_value JSONB;
  filter_operator TEXT;
  filter_field TEXT;
  filter_array TEXT[];
  array_element TEXT;
  array_sql TEXT;
  condition_sql TEXT;
  i INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  -- Build filter clause from JSONB
  IF p_filters IS NOT NULL AND p_filters != '{}'::jsonb THEN
    FOR filter_key, filter_value IN SELECT * FROM jsonb_each(p_filters)
    LOOP
      filter_field := filter_value->>'field';
      filter_operator := filter_value->>'operator';
      
      IF filter_operator = 'in' THEN
        filter_array := ARRAY[]::TEXT[];
        FOR array_element IN SELECT jsonb_array_elements_text(filter_value->'value')
        LOOP
          filter_array := array_append(filter_array, array_element);
        END LOOP;
        
        IF array_length(filter_array, 1) > 0 THEN
          array_sql := array_to_string(
            ARRAY(SELECT quote_literal(elem) FROM unnest(filter_array) AS elem),
            ','
          );
          
          -- Handle enum types (project_status, expense_category, etc.)
          IF filter_field = 'status' AND p_data_source = 'projects' THEN
            condition_sql := format('%I = ANY(ARRAY[%s]::project_status[])', filter_field, array_sql);
          ELSIF filter_field = 'category' THEN
            condition_sql := format('%I = ANY(ARRAY[%s]::expense_category[])', filter_field, array_sql);
          ELSIF filter_field = 'status' AND p_data_source = 'quotes' THEN
            condition_sql := format('%I = ANY(ARRAY[%s]::quote_status[])', filter_field, array_sql);
          ELSE
            condition_sql := format('%I = ANY(ARRAY[%s]::TEXT[])', filter_field, array_sql);
          END IF;
          
          where_conditions := array_append(where_conditions, condition_sql);
        END IF;
      ELSIF filter_operator = 'between' THEN
        IF jsonb_typeof(filter_value->'value') = 'array' AND jsonb_array_length(filter_value->'value') = 2 THEN
          where_conditions := array_append(where_conditions, 
            format('%I BETWEEN %L AND %L', 
              filter_field, 
              filter_value->'value'->>0, 
              filter_value->'value'->>1
            )
          );
        END IF;
      ELSIF filter_operator = 'contains' THEN
        where_conditions := array_append(where_conditions, 
          format('%I ILIKE %L', filter_field, '%' || (filter_value->>'value') || '%')
        );
      ELSIF filter_operator = 'greater_than' THEN
        where_conditions := array_append(where_conditions, 
          format('%I > %L', filter_field, filter_value->>'value')
        );
      ELSIF filter_operator = 'less_than' THEN
        where_conditions := array_append(where_conditions, 
          format('%I < %L', filter_field, filter_value->>'value')
        );
      ELSIF filter_operator = 'equals' THEN
        where_conditions := array_append(where_conditions, 
          format('%I = %L', filter_field, filter_value->>'value')
        );
      ELSIF filter_operator = 'not_equals' THEN
        where_conditions := array_append(where_conditions, 
          format('%I != %L', filter_field, filter_value->>'value')
        );
      ELSIF filter_operator = 'is_null' THEN
        where_conditions := array_append(where_conditions, 
          format('%I IS NULL', filter_field));
      END IF;
    END LOOP;
    
    IF array_length(where_conditions, 1) > 0 THEN
      filter_clause := 'WHERE ' || array_to_string(where_conditions, ' AND ');
    END IF;
  END IF;
  
  -- Build sort clause
  IF p_sort_by IS NOT NULL AND p_sort_dir IS NOT NULL THEN
    sort_clause := format('ORDER BY %I %s', p_sort_by, UPPER(p_sort_dir));
  END IF;
  
  -- Build and execute query based on data source
  IF p_data_source = 'projects' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT * FROM reporting.project_financials
        %s
        %s
        LIMIT %s
      ) t',
      filter_clause,
      sort_clause,
      p_limit
    );
  ELSIF p_data_source = 'expenses' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT 
          e.*,
          p.project_number,
          p.project_name,
          pay.payee_name,
          pay.payee_type
        FROM expenses e
        LEFT JOIN projects p ON p.id = e.project_id
        LEFT JOIN payees pay ON pay.id = e.payee_id
        %s
        %s
        LIMIT %s
      ) t',
      filter_clause,
      sort_clause,
      p_limit
    );
  ELSIF p_data_source = 'quotes' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT 
          q.*,
          p.project_number,
          p.project_name,
          pay.payee_name
        FROM quotes q
        LEFT JOIN projects p ON p.id = q.project_id
        LEFT JOIN payees pay ON pay.id = q.payee_id
        %s
        %s
        LIMIT %s
      ) t',
      filter_clause,
      sort_clause,
      p_limit
    );
  ELSIF p_data_source = 'time_entries' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT 
          e.id,
          e.expense_date,
          e.start_time,
          e.end_time,
          e.amount,
          e.description,
          e.approval_status,
          e.rejection_reason,
          e.created_at,
          e.user_id,
          e.payee_id,
          e.project_id,
          e.attachment_url,
          e.is_locked,
          CASE 
            WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
              EXTRACT(EPOCH FROM (e.end_time::time - e.start_time::time)) / 3600
            WHEN e.description IS NOT NULL THEN
              CAST(REGEXP_REPLACE(e.description, ''[^0-9.]'', '''', ''g'') AS NUMERIC)
            ELSE 0
          END as hours,
          pay.payee_name as worker_name,
          pay.hourly_rate,
          p.project_number,
          p.project_name,
          p.client_name,
          p.address as project_address
        FROM expenses e
        INNER JOIN payees pay ON pay.id = e.payee_id
        LEFT JOIN projects p ON p.id = e.project_id
        WHERE e.category = ''labor_internal''
          %s
        %s
        LIMIT %s
      ) t',
      CASE WHEN filter_clause != '' THEN 'AND ' || SUBSTRING(filter_clause, 7) ELSE '' END,
      sort_clause,
      p_limit
    );
  ELSIF p_data_source = 'estimate_line_items' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT * FROM reporting.estimate_line_items_quote_status
        %s
        %s
        LIMIT %s
      ) t',
      filter_clause,
      sort_clause,
      p_limit
    );
  ELSIF p_data_source = 'internal_costs' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT 
          e.id,
          e.category,
          e.expense_date,
          e.start_time,
          e.end_time,
          e.amount,
          e.description,
          e.approval_status,
          e.rejection_reason,
          e.created_at,
          e.updated_at,
          e.user_id,
          e.payee_id,
          e.project_id,
          e.attachment_url,
          e.is_locked,
          e.transaction_type,
          CASE 
            WHEN e.category = ''labor_internal'' THEN
              CASE 
                WHEN e.start_time IS NOT NULL AND e.end_time IS NOT NULL THEN
                  EXTRACT(EPOCH FROM (e.end_time::time - e.start_time::time)) / 3600
                WHEN e.description IS NOT NULL THEN
                  CAST(REGEXP_REPLACE(e.description, ''[^0-9.]'', '''', ''g'') AS NUMERIC)
                ELSE 0
              END
            ELSE NULL
          END as hours,
          pay.payee_name as worker_name,
          pay.hourly_rate,
          p.project_number,
          p.project_name,
          p.client_name,
          p.address as project_address,
          est.estimate_number
        FROM expenses e
        LEFT JOIN payees pay ON pay.id = e.payee_id
        LEFT JOIN projects p ON p.id = e.project_id
        LEFT JOIN LATERAL (
          SELECT estimate_number 
          FROM estimates est
          WHERE est.project_id = e.project_id 
            AND est.status = ''approved'' 
            AND est.is_current_version = true
          LIMIT 1
        ) est ON true
        WHERE e.category IN (''labor_internal'', ''management'')
          %s
        %s
        LIMIT %s
      ) t',
      CASE WHEN filter_clause != '' THEN 'AND ' || SUBSTRING(filter_clause, 7) ELSE '' END,
      sort_clause,
      p_limit
    );
  ELSE
    RAISE EXCEPTION 'Unsupported data source: %', p_data_source;
  END IF;
  
  -- Execute query and get results as JSONB array
  EXECUTE format('SELECT jsonb_agg(t.*) FROM (%s) t', query_text) INTO result_data;
  
  -- Get row count
  IF result_data IS NULL THEN
    row_count := 0;
    result_data := '[]'::jsonb;
  ELSE
    row_count := jsonb_array_length(result_data);
  END IF;
  
  -- Calculate execution time
  execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
  
  -- Return results with metadata
  RETURN jsonb_build_object(
    'data', COALESCE(result_data, '[]'::jsonb),
    'metadata', jsonb_build_object(
      'row_count', row_count,
      'execution_time_ms', execution_time,
      'data_source', p_data_source
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error executing report: %', SQLERRM;
END;
$$;

