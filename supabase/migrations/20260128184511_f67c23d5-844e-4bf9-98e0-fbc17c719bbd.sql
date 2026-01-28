-- Fix the function search path for the delete_related_project_documents function
CREATE OR REPLACE FUNCTION public.delete_related_project_documents()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM project_documents 
  WHERE related_quote_id = OLD.quote_id 
    AND document_type = 'contract';
  RETURN OLD;
END;
$$;