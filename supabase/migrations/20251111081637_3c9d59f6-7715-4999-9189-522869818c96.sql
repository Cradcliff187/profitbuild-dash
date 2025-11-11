-- Add attachment columns to project_notes table
ALTER TABLE public.project_notes
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_type TEXT CHECK (attachment_type IN ('image', 'video'));

-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', true);

-- Allow authenticated users to upload note attachments
CREATE POLICY "Authenticated users can upload note attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'note-attachments');

-- Allow authenticated users to view note attachments
CREATE POLICY "Authenticated users can view note attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'note-attachments');

-- Allow users to delete their note attachments
CREATE POLICY "Users can delete their note attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'note-attachments' AND owner = auth.uid());