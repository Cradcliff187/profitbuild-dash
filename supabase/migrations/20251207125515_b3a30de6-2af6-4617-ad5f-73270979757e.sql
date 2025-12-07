-- Drop the existing check constraint and recreate with 'file' option
ALTER TABLE project_notes DROP CONSTRAINT IF EXISTS project_notes_attachment_type_check;

ALTER TABLE project_notes 
ADD CONSTRAINT project_notes_attachment_type_check 
CHECK (attachment_type IN ('image', 'video', 'file') OR attachment_type IS NULL);

-- Now fix the existing record
UPDATE project_notes 
SET attachment_type = 'file', attachment_name = 'Punchlist File.pdf'
WHERE id = 'd32f279c-1cbe-4d73-853e-988d2b9c7ade';