-- Add duration column to project_media table for video duration tracking
ALTER TABLE project_media 
ADD COLUMN duration NUMERIC;

COMMENT ON COLUMN project_media.duration IS 'Video duration in seconds (e.g., 11.278)';