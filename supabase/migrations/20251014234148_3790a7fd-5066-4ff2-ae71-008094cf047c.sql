-- Create time_tracker_documents bucket for receipts and documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-tracker-documents',
  'time-tracker-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- RLS Policies for time_tracker_documents bucket
CREATE POLICY "Authenticated users can upload time tracker documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'time-tracker-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own time tracker documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'time-tracker-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own time tracker documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'time-tracker-documents' AND auth.uid()::text = (storage.foldername(name))[1]);