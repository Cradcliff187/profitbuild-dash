-- Add attachment_name column to project_notes table for storing original filenames
ALTER TABLE public.project_notes
ADD COLUMN attachment_name text;

-- Add comment for documentation
COMMENT ON COLUMN public.project_notes.attachment_name IS 'Original filename for file attachments';