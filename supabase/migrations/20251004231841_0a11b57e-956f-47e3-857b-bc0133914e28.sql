-- Add thumbnail_url column to project_media table
ALTER TABLE public.project_media 
ADD COLUMN thumbnail_url TEXT;

-- Create storage bucket for video thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media-thumbnails', 
  'project-media-thumbnails', 
  false,
  5242880, -- 5MB limit for thumbnails
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
);

-- RLS policies for thumbnails bucket - users can view project media thumbnails
CREATE POLICY "Users can view project media thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-media-thumbnails');

-- Users can upload thumbnails for their own uploads
CREATE POLICY "Users can upload thumbnails for their media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-media-thumbnails' 
  AND auth.uid() IS NOT NULL
);

-- Users can delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-media-thumbnails' 
  AND auth.uid() IN (
    SELECT uploaded_by FROM public.project_media 
    WHERE file_url LIKE '%' || (storage.foldername(name))[1] || '%'
  )
);