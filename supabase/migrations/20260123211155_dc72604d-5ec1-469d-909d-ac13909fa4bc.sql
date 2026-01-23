-- Fix double LIMIT bug in execute_ai_query
-- When AI generates queries with LIMIT (e.g., "last 5 entries"), the function 
-- would create invalid SQL: "SELECT ... LIMIT 5 LIMIT 500"
-- This fix strips any existing LIMIT before adding the safety limit

CREATE OR REPLACE FUNCTION public.execute_ai_query(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '10s'
AS $$
DECLARE
  result jsonb;
  clean_query text;
BEGIN
  clean_query := trim(p_query);
  
  -- Strip trailing semicolons
  clean_query := regexp_replace(clean_query, ';\s*$', '');
  
  -- Strip any existing LIMIT clause to prevent double-LIMIT syntax error
  clean_query := regexp_replace(clean_query, '\s+LIMIT\s+\d+\s*$', '', 'i');
  
  -- Security: Only allow SELECT statements
  IF NOT (lower(clean_query) ~ '^(select|with)') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed.';
  END IF;
  
  -- Security: Block dangerous keywords
  IF lower(clean_query) ~ '\b(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b' THEN
    RAISE EXCEPTION 'Query contains prohibited keywords.';
  END IF;
  
  -- Execute query with row limit
  EXECUTE format('
    SELECT jsonb_build_object(
      ''data'', COALESCE((SELECT jsonb_agg(row_to_json(subq)) FROM (%s LIMIT 500) subq), ''[]''::jsonb),
      ''row_count'', (SELECT COUNT(*) FROM (%s LIMIT 501) cnt)
    )', clean_query, clean_query) INTO result;
  
  result := result || jsonb_build_object(
    'truncated', (result->>'row_count')::int > 500,
    'executed_at', now()
  );
  
  RETURN result;
EXCEPTION
  WHEN query_canceled THEN
    RAISE EXCEPTION 'Query timed out after 10 seconds.';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;