-- Create RPC function for executing simple reports
-- Function: execute_simple_report

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
BEGIN
  start_time := clock_timestamp();
  
  -- Build filter clause from JSONB
  IF p_filters IS NOT NULL AND jsonb_object_keys(p_filters) IS NOT NULL THEN
    FOR filter_key, filter_value IN SELECT * FROM jsonb_each(p_filters)
    LOOP
      -- Parse filter structure: { field: "status", operator: "in", value: ["in_progress", "complete"] }
      filter_field := filter_value->>'field';
      filter_operator := filter_value->>'operator';
      
      IF filter_operator = 'in' THEN
        -- Handle IN operator
        where_conditions := array_append(where_conditions, 
          format('%I = ANY(%L::text[])', filter_field, 
            ARRAY(SELECT jsonb_array_elements_text(filter_value->'value'))));
      ELSIF filter_operator = 'equals' THEN
        where_conditions := array_append(where_conditions, 
          format('%I = %L', filter_field, filter_value->>'value'));
      ELSIF filter_operator = 'not_equals' THEN
        where_conditions := array_append(where_conditions, 
          format('%I != %L', filter_field, filter_value->>'value'));
      ELSIF filter_operator = 'greater_than' THEN
        where_conditions := array_append(where_conditions, 
          format('%I > %L', filter_field, filter_value->>'value'));
      ELSIF filter_operator = 'less_than' THEN
        where_conditions := array_append(where_conditions, 
          format('%I < %L', filter_field, filter_value->>'value'));
      ELSIF filter_operator = 'contains' THEN
        where_conditions := array_append(where_conditions, 
          format('%I::text ILIKE %L', filter_field, '%' || (filter_value->>'value') || '%'));
      ELSIF filter_operator = 'between' THEN
        where_conditions := array_append(where_conditions, 
          format('%I BETWEEN %L AND %L', filter_field, 
            filter_value->'value'->>0, 
            filter_value->'value'->>1));
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_simple_report TO authenticated;

