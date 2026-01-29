-- Fix ENUM type casting in execute_simple_report
-- This resolves: "operator does not exist: project_status = text"

CREATE OR REPLACE FUNCTION public.execute_simple_report(
  p_data_source TEXT,
  p_filters JSONB DEFAULT '{}',
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'DESC',
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query TEXT;
  v_base_query TEXT;
  v_where_clauses TEXT[] := ARRAY[]::TEXT[];
  v_filter_key TEXT;
  v_filter JSONB;
  v_field TEXT;
  v_operator TEXT;
  v_value TEXT;
  v_value_array TEXT[];
  v_result JSONB;
  v_start_time TIMESTAMPTZ;
  v_execution_time INTEGER;
  v_row_count INTEGER;
  v_enum_fields TEXT[] := ARRAY['status', 'category', 'approval_status', 'project_type', 'quote_status', 'estimate_status', 'expense_category'];
  v_enum_type TEXT;
BEGIN
  v_start_time := clock_timestamp();

  -- Determine base query based on data source
  CASE p_data_source
    WHEN 'projects' THEN
      v_base_query := 'SELECT * FROM reporting.project_financials';
    WHEN 'expenses' THEN
      v_base_query := '
        SELECT 
          e.*,
          p.project_number,
          p.project_name,
          p.client_name,
          py.payee_name
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN payees py ON e.payee_id = py.id
      ';
    WHEN 'quotes' THEN
      v_base_query := '
        SELECT 
          q.*,
          p.project_number,
          p.project_name,
          p.client_name,
          py.payee_name
        FROM quotes q
        LEFT JOIN projects p ON q.project_id = p.id
        LEFT JOIN payees py ON q.payee_id = py.id
      ';
    WHEN 'time_entries' THEN
      v_base_query := '
        SELECT 
          e.*,
          p.project_number,
          p.project_name,
          p.client_name,
          py.payee_name as worker_name,
          py.hourly_rate,
          py.employee_number
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN payees py ON e.payee_id = py.id
        WHERE e.category = ''labor_internal''
      ';
    WHEN 'weekly_labor_hours' THEN
      v_base_query := 'SELECT * FROM weekly_labor_hours';
    WHEN 'estimate_line_items' THEN
      v_base_query := '
        SELECT 
          eli.*,
          e.estimate_number,
          e.status as estimate_status,
          p.project_number,
          p.project_name,
          p.client_name,
          COALESCE(
            (SELECT COUNT(*) FROM quotes q WHERE q.estimate_id = e.id AND q.line_item_id = eli.id),
            0
          ) as quote_count,
          COALESCE(
            (SELECT COUNT(*) FROM quotes q WHERE q.estimate_id = e.id AND q.line_item_id = eli.id AND q.status = ''accepted''),
            0
          ) > 0 as has_accepted_quote,
          COALESCE(
            (SELECT COUNT(*) FROM quotes q WHERE q.estimate_id = e.id AND q.line_item_id = eli.id AND q.status = ''accepted''),
            0
          ) as accepted_quote_count,
          COALESCE(
            (SELECT COUNT(*) FROM quotes q WHERE q.estimate_id = e.id AND q.line_item_id = eli.id AND q.status = ''pending''),
            0
          ) as pending_quote_count,
          COALESCE(
            (SELECT COUNT(*) FROM quotes q WHERE q.estimate_id = e.id AND q.line_item_id = eli.id),
            0
          ) > 0 as has_quotes
        FROM estimate_line_items eli
        LEFT JOIN estimates e ON eli.estimate_id = e.id
        LEFT JOIN projects p ON e.project_id = p.id
      ';
    WHEN 'internal_costs' THEN
      v_base_query := '
        SELECT 
          e.*,
          p.project_number,
          p.project_name,
          p.client_name,
          p.status,
          py.payee_name as worker_name,
          py.hourly_rate,
          py.employee_number,
          est.estimate_number
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN payees py ON e.payee_id = py.id
        LEFT JOIN estimates est ON p.id = est.project_id AND est.status = ''approved'' AND est.is_current_version = true
        WHERE e.category IN (''labor_internal'', ''management'')
      ';
    WHEN 'internal_labor_hours' THEN
      v_base_query := '
        SELECT 
          p.id as project_id,
          p.project_number,
          p.project_name,
          p.client_name,
          p.status,
          COALESCE(
            (SELECT SUM(eli.quantity) 
             FROM estimate_line_items eli 
             JOIN estimates e ON eli.estimate_id = e.id 
             WHERE e.project_id = p.id 
               AND e.status = ''approved'' 
               AND e.is_current_version = true 
               AND eli.category = ''labor_internal''
               AND eli.unit = ''hours''),
            0
          ) as estimated_hours,
          COALESCE(
            (SELECT SUM(exp.hours) 
             FROM expenses exp 
             WHERE exp.project_id = p.id 
               AND exp.category = ''labor_internal''),
            0
          ) as actual_hours,
          COALESCE(
            (SELECT SUM(eli.quantity) 
             FROM estimate_line_items eli 
             JOIN estimates e ON eli.estimate_id = e.id 
             WHERE e.project_id = p.id 
               AND e.status = ''approved'' 
               AND e.is_current_version = true 
               AND eli.category = ''labor_internal''
               AND eli.unit = ''hours''),
            0
          ) - COALESCE(
            (SELECT SUM(exp.hours) 
             FROM expenses exp 
             WHERE exp.project_id = p.id 
               AND exp.category = ''labor_internal''),
            0
          ) as hours_variance
        FROM projects p
        WHERE p.category = ''construction''
      ';
    WHEN 'reporting.training_status' THEN
      v_base_query := 'SELECT * FROM reporting.training_status';
    ELSE
      RAISE EXCEPTION 'Unknown data source: %', p_data_source;
  END CASE;

  -- Build WHERE clauses from filters
  IF p_filters IS NOT NULL AND p_filters != '{}'::JSONB THEN
    FOR v_filter_key IN SELECT jsonb_object_keys(p_filters) LOOP
      v_filter := p_filters->v_filter_key;
      v_field := v_filter->>'field';
      v_operator := v_filter->>'operator';
      v_value := v_filter->>'value';

      -- Skip null or empty values (except for is_null/is_not_null which don't need a value)
      IF v_operator NOT IN ('is_null', 'is_not_null') AND (v_value IS NULL OR v_value = '' OR v_value = 'null') THEN
        CONTINUE;
      END IF;

      -- Determine if this field needs enum casting
      v_enum_type := NULL;
      IF v_field = 'status' AND p_data_source IN ('projects', 'internal_labor_hours', 'internal_costs') THEN
        v_enum_type := 'project_status';
      ELSIF v_field = 'status' AND p_data_source = 'quotes' THEN
        v_enum_type := 'quote_status';
      ELSIF v_field = 'estimate_status' OR (v_field = 'status' AND p_data_source = 'estimate_line_items') THEN
        v_enum_type := 'estimate_status';
      ELSIF v_field = 'category' AND p_data_source IN ('expenses', 'time_entries', 'internal_costs', 'estimate_line_items') THEN
        v_enum_type := 'expense_category';
      ELSIF v_field = 'approval_status' THEN
        v_enum_type := 'approval_status';
      ELSIF v_field = 'project_type' THEN
        v_enum_type := 'project_type';
      END IF;

      -- Build the WHERE clause based on operator
      CASE v_operator
        WHEN 'equals' THEN
          IF v_enum_type IS NOT NULL THEN
            v_where_clauses := array_append(v_where_clauses, 
              format('%I = %L::%s', v_field, v_value, v_enum_type));
          ELSE
            v_where_clauses := array_append(v_where_clauses, 
              format('%I = %L', v_field, v_value));
          END IF;
        WHEN 'not_equals' THEN
          IF v_enum_type IS NOT NULL THEN
            v_where_clauses := array_append(v_where_clauses, 
              format('%I != %L::%s', v_field, v_value, v_enum_type));
          ELSE
            v_where_clauses := array_append(v_where_clauses, 
              format('%I != %L', v_field, v_value));
          END IF;
        WHEN 'greater_than' THEN
          v_where_clauses := array_append(v_where_clauses, 
            format('%I > %L', v_field, v_value));
        WHEN 'less_than' THEN
          v_where_clauses := array_append(v_where_clauses, 
            format('%I < %L', v_field, v_value));
        WHEN 'contains' THEN
          v_where_clauses := array_append(v_where_clauses, 
            format('%I ILIKE %L', v_field, '%' || v_value || '%'));
        WHEN 'in' THEN
          -- Handle array values for IN operator
          BEGIN
            v_value_array := ARRAY(SELECT jsonb_array_elements_text(v_filter->'value'));
            IF v_enum_type IS NOT NULL THEN
              v_where_clauses := array_append(v_where_clauses,
                format('%I = ANY(ARRAY[%s]::%s[])', 
                  v_field, 
                  array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(v_value_array) x), ','),
                  v_enum_type));
            ELSE
              v_where_clauses := array_append(v_where_clauses,
                format('%I = ANY(ARRAY[%s])', 
                  v_field, 
                  array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(v_value_array) x), ',')));
            END IF;
          EXCEPTION WHEN OTHERS THEN
            -- If value is not JSON array, treat as comma-separated string
            v_value_array := string_to_array(v_value, ',');
            IF v_enum_type IS NOT NULL THEN
              v_where_clauses := array_append(v_where_clauses,
                format('%I = ANY(ARRAY[%s]::%s[])', 
                  v_field, 
                  array_to_string(ARRAY(SELECT quote_literal(trim(x)) FROM unnest(v_value_array) x), ','),
                  v_enum_type));
            ELSE
              v_where_clauses := array_append(v_where_clauses,
                format('%I = ANY(ARRAY[%s])', 
                  v_field, 
                  array_to_string(ARRAY(SELECT quote_literal(trim(x)) FROM unnest(v_value_array) x), ',')));
            END IF;
          END;
        WHEN 'between' THEN
          BEGIN
            v_value_array := ARRAY(SELECT jsonb_array_elements_text(v_filter->'value'));
            IF array_length(v_value_array, 1) = 2 THEN
              v_where_clauses := array_append(v_where_clauses,
                format('%I BETWEEN %L AND %L', v_field, v_value_array[1], v_value_array[2]));
            END IF;
          EXCEPTION WHEN OTHERS THEN
            NULL; -- Skip invalid between values
          END;
        WHEN 'is_null' THEN
          v_where_clauses := array_append(v_where_clauses, 
            format('%I IS NULL', v_field));
        WHEN 'is_not_null' THEN
          v_where_clauses := array_append(v_where_clauses, 
            format('%I IS NOT NULL', v_field));
        WHEN 'contains_any' THEN
          BEGIN
            v_value_array := ARRAY(SELECT jsonb_array_elements_text(v_filter->'value'));
            v_where_clauses := array_append(v_where_clauses,
              format('%I && ARRAY[%s]', 
                v_field, 
                array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(v_value_array) x), ',')));
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        WHEN 'contains_all' THEN
          BEGIN
            v_value_array := ARRAY(SELECT jsonb_array_elements_text(v_filter->'value'));
            v_where_clauses := array_append(v_where_clauses,
              format('%I @> ARRAY[%s]', 
                v_field, 
                array_to_string(ARRAY(SELECT quote_literal(x) FROM unnest(v_value_array) x), ',')));
          EXCEPTION WHEN OTHERS THEN
            NULL;
          END;
        ELSE
          NULL; -- Skip unknown operators
      END CASE;
    END LOOP;
  END IF;

  -- Build final query
  v_query := v_base_query;
  
  -- Add WHERE clauses
  IF array_length(v_where_clauses, 1) > 0 THEN
    -- Check if base query already has WHERE
    IF position('WHERE' IN upper(v_base_query)) > 0 THEN
      v_query := v_query || ' AND ' || array_to_string(v_where_clauses, ' AND ');
    ELSE
      v_query := v_query || ' WHERE ' || array_to_string(v_where_clauses, ' AND ');
    END IF;
  END IF;

  -- Add ORDER BY (with validation)
  IF p_sort_by IS NOT NULL AND p_sort_by != '' THEN
    v_query := v_query || format(' ORDER BY %I %s NULLS LAST', p_sort_by, 
      CASE WHEN upper(p_sort_dir) = 'ASC' THEN 'ASC' ELSE 'DESC' END);
  END IF;

  -- Add LIMIT
  v_query := v_query || format(' LIMIT %s', p_limit);

  -- Execute and return results
  EXECUTE format('
    SELECT jsonb_build_object(
      ''data'', COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb),
      ''metadata'', jsonb_build_object(
        ''row_count'', COUNT(*),
        ''execution_time_ms'', EXTRACT(MILLISECONDS FROM clock_timestamp() - %L::timestamptz)::integer
      )
    )
    FROM (%s) t
  ', v_start_time, v_query) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.execute_simple_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_simple_report TO service_role;

COMMENT ON FUNCTION public.execute_simple_report IS 'Execute dynamic reports with proper ENUM type casting for status, category, and approval_status fields';
