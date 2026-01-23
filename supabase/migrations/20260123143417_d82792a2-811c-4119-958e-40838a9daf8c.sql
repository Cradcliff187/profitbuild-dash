-- Function to discover database schema dynamically
CREATE OR REPLACE FUNCTION public.get_database_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tables', (
      SELECT jsonb_agg(jsonb_build_object(
        'table_name', t.table_name,
        'columns', (
          SELECT jsonb_agg(jsonb_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'udt_name', c.udt_name,
            'is_nullable', c.is_nullable,
            'column_default', c.column_default
          ) ORDER BY c.ordinal_position)
          FROM information_schema.columns c
          WHERE c.table_schema = 'public' AND c.table_name = t.table_name
        )
      ))
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE '%backup%'
    ),
    'views', (
      SELECT jsonb_agg(jsonb_build_object(
        'view_name', t.table_name,
        'schema', t.table_schema,
        'columns', (
          SELECT jsonb_agg(jsonb_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'udt_name', c.udt_name
          ) ORDER BY c.ordinal_position)
          FROM information_schema.columns c
          WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
        )
      ))
      FROM information_schema.tables t
      WHERE (t.table_schema = 'reporting' OR (t.table_schema = 'public' AND t.table_type = 'VIEW'))
        AND t.table_name NOT LIKE '%backup%'
    ),
    'enums', (
      SELECT jsonb_agg(jsonb_build_object(
        'enum_name', t.typname,
        'values', (
          SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
          FROM pg_enum e
          WHERE e.enumtypid = t.oid
        )
      ))
      FROM pg_type t
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    ),
    'relationships', (
      SELECT jsonb_agg(jsonb_build_object(
        'constraint_name', tc.constraint_name,
        'table_name', tc.table_name,
        'column_name', kcu.column_name,
        'foreign_table', ccu.table_name,
        'foreign_column', ccu.column_name
      ))
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to safely execute AI-generated SELECT queries
CREATE OR REPLACE FUNCTION public.execute_ai_query(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '10s'
AS $$
DECLARE
  result jsonb;
  clean_query text;
  row_count integer;
BEGIN
  -- Clean and validate query
  clean_query := trim(p_query);
  
  -- Security: Only allow SELECT statements
  IF NOT (lower(clean_query) ~ '^(select|with)') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed. Query must start with SELECT or WITH.';
  END IF;
  
  -- Security: Block dangerous keywords
  IF lower(clean_query) ~ '(insert|update|delete|drop|truncate|alter|create|grant|revoke|execute|call)' THEN
    RAISE EXCEPTION 'Query contains prohibited keywords.';
  END IF;
  
  -- Security: Block system tables
  IF lower(clean_query) ~ '(pg_|information_schema|pg_catalog)' THEN
    RAISE EXCEPTION 'Access to system tables is not allowed.';
  END IF;
  
  -- Execute query with row limit
  EXECUTE format('
    SELECT jsonb_build_object(
      ''data'', COALESCE((SELECT jsonb_agg(row_to_json(subq)) FROM (%s LIMIT 500) subq), ''[]''::jsonb),
      ''row_count'', (SELECT COUNT(*) FROM (%s LIMIT 501) cnt)
    )', clean_query, clean_query) INTO result;
  
  -- Add metadata
  result := result || jsonb_build_object(
    'truncated', (result->>'row_count')::int > 500,
    'executed_at', now()
  );
  
  RETURN result;
EXCEPTION
  WHEN query_canceled THEN
    RAISE EXCEPTION 'Query timed out after 10 seconds. Please simplify your request.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_database_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_ai_query(text) TO authenticated;