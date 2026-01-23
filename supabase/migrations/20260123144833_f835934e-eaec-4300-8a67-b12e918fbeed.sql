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
BEGIN
  clean_query := trim(p_query);
  
  -- Strip trailing semicolons (AI models often include them, which breaks subquery wrapping)
  clean_query := regexp_replace(clean_query, ';\s*$', '');
  
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