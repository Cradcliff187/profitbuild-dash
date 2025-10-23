-- Update RLS policy for project_media to allow field workers to delete media from accessible projects

-- First drop the existing policy
DROP POLICY IF EXISTS "Users can delete their own media" ON public.project_media;
DROP POLICY IF EXISTS "Users can delete media from accessible projects" ON public.project_media;

-- Create comprehensive delete policy
CREATE POLICY "Users can delete media from accessible projects"
ON public.project_media
FOR DELETE
USING (
  uploaded_by = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR (has_role(auth.uid(), 'field_worker'::app_role) AND can_access_project(auth.uid(), project_id))
);