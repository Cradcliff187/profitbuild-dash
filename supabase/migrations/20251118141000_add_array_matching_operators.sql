-- Add array matching operators for category composition filtering
-- Supports: contains_any, contains_only, contains_all

CREATE OR REPLACE FUNCTION reporting.execute_simple_report(
  p_data_source TEXT,
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_sort_by TEXT DEFAULT NULL,
  p_sort_direction TEXT DEFAULT 'ASC',
  p_limit INTEGER DEFAULT 1000
)
RETURNS TABLE(result JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = reporting, public
AS $$
DECLARE
  query_text TEXT;
  where_conditions TEXT[] := ARRAY[]::TEXT[];
  filter_key TEXT;
  filter_value JSONB;
  filter_field TEXT;
  filter_operator TEXT;
  filter_array TEXT[];
  array_element TEXT;
  condition_sql TEXT;
  sort_clause TEXT := '';
  filter_clause TEXT := '';
  start_time TIMESTAMP;
  i INTEGER;
BEGIN
  start_time := clock_timestamp();
  
  -- Build filter clause from JSONB
  IF p_filters IS NOT NULL AND p_filters != '{}'::jsonb THEN
    FOR filter_key, filter_value IN SELECT * FROM jsonb_each(p_filters)
    LOOP
      filter_field := filter_value->>'field';
      filter_operator := filter_value->>'operator';
      
      -- Map alias column names to real columns
      IF filter_field = 'worker_name' AND p_data_source IN ('internal_costs', 'time_entries') THEN
        filter_field := 'payee_name';
      END IF;
      
      -- Handle boolean field filters with direct boolean values
      IF filter_field IN ('has_labor_internal', 'has_subcontractors', 'has_materials', 
                           'has_equipment', 'only_labor_internal', 'has_quotes', 'has_accepted_quote') THEN
        IF filter_operator = 'equals' THEN
          -- Handle both boolean and string values for backward compatibility
          IF jsonb_typeof(filter_value->'value') = 'boolean' THEN
            IF (filter_value->>'value')::boolean = TRUE THEN
              where_conditions := array_append(where_conditions, format('%I = TRUE', filter_field));
            ELSE
              where_conditions := array_append(where_conditions, format('%I = FALSE', filter_field));
            END IF;
          ELSIF (filter_value->>'value') = 'true' THEN
            where_conditions := array_append(where_conditions, format('%I = TRUE', filter_field));
          ELSIF (filter_value->>'value') = 'false' THEN
            where_conditions := array_append(where_conditions, format('%I = FALSE', filter_field));
          END IF;
          CONTINUE;
        END IF;
      END IF;
      
      -- Handle array matching operators for category composition
      IF filter_operator = 'contains_any' THEN
        -- Array overlap: category_list && ARRAY[selected]
        filter_array := ARRAY[]::TEXT[];
        FOR array_element IN SELECT jsonb_array_elements_text(filter_value->'value')
        LOOP
          filter_array := array_append(filter_array, array_element);
        END LOOP;
        
        IF array_length(filter_array, 1) > 0 THEN
          condition_sql := format('%I && ARRAY[%s]::text[]',
            filter_field,
            (SELECT string_agg(quote_literal(v), ',') FROM unnest(filter_array) AS v));
          where_conditions := array_append(where_conditions, condition_sql);
        END IF;
        CONTINUE;
        
      ELSIF filter_operator = 'contains_only' THEN
        -- Exact match: category_list = ARRAY[selected] (order doesn't matter, but same elements)
        filter_array := ARRAY[]::TEXT[];
        FOR array_element IN SELECT jsonb_array_elements_text(filter_value->'value')
        LOOP
          filter_array := array_append(filter_array, array_element);
        END LOOP;
        
        IF array_length(filter_array, 1) > 0 THEN
          -- Use array contains both ways to ensure exact match regardless of order
          condition_sql := format('(%I @> ARRAY[%s]::text[] AND %I <@ ARRAY[%s]::text[])',
            filter_field,
            (SELECT string_agg(quote_literal(v), ',') FROM unnest(filter_array) AS v),
            filter_field,
            (SELECT string_agg(quote_literal(v), ',') FROM unnest(filter_array) AS v));
          where_conditions := array_append(where_conditions, condition_sql);
        END IF;
        CONTINUE;
        
      ELSIF filter_operator = 'contains_all' THEN
        -- Array contains: category_list @> ARRAY[selected]
        filter_array := ARRAY[]::TEXT[];
        FOR array_element IN SELECT jsonb_array_elements_text(filter_value->'value')
        LOOP
          filter_array := array_append(filter_array, array_element);
        END LOOP;
        
        IF array_length(filter_array, 1) > 0 THEN
          condition_sql := format('%I @> ARRAY[%s]::text[]',
            filter_field,
            (SELECT string_agg(quote_literal(v), ',') FROM unnest(filter_array) AS v));
          where_conditions := array_append(where_conditions, condition_sql);
        END IF;
        CONTINUE;
      END IF;
      
      IF filter_operator = 'in' THEN
        filter_array := ARRAY[]::TEXT[];
        FOR array_element IN SELECT jsonb_array_elements_text(filter_value->'value')
        LOOP
          filter_array := array_append(filter_array, array_element);
        END LOOP;
        
        IF array_length(filter_array, 1) > 0 THEN
          -- Handle enum types (project_status, expense_category, etc.)
          condition_sql := format('%I = ANY(ARRAY[%s]::%s[])', 
            filter_field,
            (SELECT string_agg(quote_literal(v), ',') FROM unnest(filter_array) AS v),
            CASE 
              WHEN filter_field = 'status' AND p_data_source = 'projects' THEN 'project_status'
              WHEN filter_field = 'status' AND p_data_source = 'quotes' THEN 'quote_status'
              WHEN filter_field = 'status' AND p_data_source = 'estimates' THEN 'estimate_status'
              WHEN filter_field = 'category' THEN 'expense_category'
              WHEN filter_field = 'approval_status' THEN 'text'
              ELSE 'text'
            END
          );
          where_conditions := array_append(where_conditions, condition_sql);
        END IF;
        
      ELSIF filter_operator = 'equals' THEN
        IF filter_field = 'client_name' OR filter_field = 'payee_name' OR filter_field = 'worker_name' THEN
          where_conditions := array_append(where_conditions, 
            format('%I ILIKE %L', filter_field, '%' || (filter_value->>'value') || '%'));
        ELSIF filter_field = 'status' OR filter_field = 'category' OR filter_field = 'approval_status' THEN
          where_conditions := array_append(where_conditions,
            format('%I = %L', filter_field, filter_value->>'value'));
        ELSE
          where_conditions := array_append(where_conditions,
            format('%I = %L', filter_field, filter_value->>'value'));
        END IF;
        
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
          format('%I ILIKE %L', filter_field, '%' || (filter_value->>'value') || '%'));
          
      ELSIF filter_operator = 'between' THEN
        IF jsonb_typeof(filter_value->'value') = 'array' THEN
          IF (filter_value->'value'->0) IS NOT NULL AND (filter_value->'value'->1) IS NOT NULL THEN
            where_conditions := array_append(where_conditions,
              format('%I BETWEEN %L AND %L', 
                filter_field,
                filter_value->'value'->>0,
                filter_value->'value'->>1));
          ELSIF (filter_value->'value'->0) IS NOT NULL THEN
            where_conditions := array_append(where_conditions,
              format('%I >= %L', filter_field, filter_value->'value'->>0));
          ELSIF (filter_value->'value'->1) IS NOT NULL THEN
            where_conditions := array_append(where_conditions,
              format('%I <= %L', filter_field, filter_value->'value'->>1));
          END IF;
        END IF;
        
      ELSIF filter_operator = 'is_null' THEN
        where_conditions := array_append(where_conditions,
          format('%I IS NULL', filter_field));
      END IF;
    END LOOP;
    
    -- Build WHERE clause
    IF array_length(where_conditions, 1) > 0 THEN
      filter_clause := 'WHERE ' || array_to_string(where_conditions, ' AND ');
    END IF;
  END IF;
  
  -- Build sort clause
  IF p_sort_by IS NOT NULL THEN
    sort_clause := format('ORDER BY %I %s', p_sort_by, 
      CASE WHEN p_sort_direction = 'DESC' THEN 'DESC' ELSE 'ASC' END);
  END IF;
  
  -- Build query based on data source (keeping all existing data source queries)
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
          e.id,
          e.category,
          e.expense_date,
          e.amount,
          e.description,
          e.approval_status,
          e.rejection_reason,
          e.created_at,
          e.updated_at,
          e.user_id,
          e.payee_id,
          e.project_id,
          pay.payee_name,
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
        WHERE e.category NOT IN (''labor_internal'', ''management'')
          %s
        %s
        LIMIT %s
      ) t',
      CASE WHEN filter_clause != '' THEN 'AND ' || SUBSTRING(filter_clause, 7) ELSE '' END,
      sort_clause,
      p_limit
    );
  ELSIF p_data_source = 'quotes' THEN
    query_text := format(
      'SELECT row_to_json(t) FROM (
        SELECT 
          q.id,
          q.quote_number,
          q.date_received,
          q.date_expires,
          q.status,
          q.total_amount,
          q.notes,
          q.attachment_url,
          q.created_at,
          q.updated_at,
          q.project_id,
          q.estimate_id,
          q.payee_id,
          pay.payee_name,
          p.project_number,
          p.project_name,
          p.client_name,
          p.address as project_address,
          est.estimate_number
        FROM quotes q
        LEFT JOIN payees pay ON pay.id = q.payee_id
        LEFT JOIN projects p ON p.id = q.project_id
        LEFT JOIN estimates est ON est.id = q.estimate_id
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
        SELECT 
          eli.id,
          eli.estimate_id,
          eli.category,
          eli.description,
          eli.quantity,
          eli.unit,
          eli.price_per_unit,
          eli.cost_per_unit,
          eli.total,
          eli.total_cost,
          eli.sort_order,
          eli.created_at,
          est.estimate_number,
          p.project_number,
          p.project_name,
          p.client_name,
          COALESCE(quote_stats.quote_count, 0) as quote_count,
          COALESCE(quote_stats.accepted_count, 0) > 0 as has_accepted_quote,
          COALESCE(quote_stats.quote_count, 0) > 0 as has_quotes,
          COALESCE(quote_stats.accepted_count, 0) as accepted_quote_count,
          COALESCE(quote_stats.pending_count, 0) as pending_quote_count
        FROM estimate_line_items eli
        LEFT JOIN estimates est ON est.id = eli.estimate_id
        LEFT JOIN projects p ON p.id = est.project_id
        LEFT JOIN LATERAL (
          SELECT 
            COUNT(*) as quote_count,
            COUNT(*) FILTER (WHERE status = ''accepted'') as accepted_count,
            COUNT(*) FILTER (WHERE status = ''pending'') as pending_count
          FROM quotes q
          WHERE q.estimate_line_item_id = eli.id
        ) quote_stats ON true
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
  
  -- Execute and return
  RAISE NOTICE 'Query execution time: % ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time));
  RETURN QUERY EXECUTE query_text;
END;
$$;

