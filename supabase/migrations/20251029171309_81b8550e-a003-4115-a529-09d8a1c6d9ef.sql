-- Make quote-attachments bucket public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'quote-attachments';

-- Drop old user-folder-based policies
DROP POLICY IF EXISTS "Users can view their own quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own quote attachments" ON storage.objects;

-- New simplified role-based policies for public bucket
CREATE POLICY "Authenticated users can upload quote attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-attachments');

CREATE POLICY "Authenticated users can view quote attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-attachments');

CREATE POLICY "Authenticated users can update quote attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'quote-attachments')
WITH CHECK (bucket_id = 'quote-attachments');

CREATE POLICY "Authenticated users can delete quote attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-attachments');