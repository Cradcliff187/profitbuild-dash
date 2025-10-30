-- Create project_documents table
CREATE TABLE public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  description text,
  version_number integer DEFAULT 1,
  uploaded_by uuid,
  expires_at date,
  related_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_project_documents_project_id ON public.project_documents(project_id);
CREATE INDEX idx_project_documents_document_type ON public.project_documents(document_type);
CREATE INDEX idx_project_documents_related_quote ON public.project_documents(related_quote_id);

-- Enable RLS with simple authentication check (follows receipts pattern)
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage documents"
  ON public.project_documents FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true);

-- Simple storage RLS - authenticated users can manage files
CREATE POLICY "Authenticated users can manage document files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'project-documents' AND auth.role() = 'authenticated');