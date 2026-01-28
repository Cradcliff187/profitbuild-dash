-- Create function to delete related project_documents when a contract is deleted
CREATE OR REPLACE FUNCTION delete_related_project_documents()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM project_documents 
  WHERE related_quote_id = OLD.quote_id 
    AND document_type = 'contract';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic cleanup
CREATE TRIGGER contracts_delete_cascade
BEFORE DELETE ON contracts
FOR EACH ROW EXECUTE FUNCTION delete_related_project_documents();

-- Clean up existing orphaned documents
DELETE FROM project_documents 
WHERE document_type = 'contract' 
  AND related_quote_id NOT IN (SELECT quote_id FROM contracts WHERE quote_id IS NOT NULL);