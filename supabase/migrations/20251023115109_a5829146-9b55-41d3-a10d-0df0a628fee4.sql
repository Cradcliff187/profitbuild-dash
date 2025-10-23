-- Update RLS policy for project_media to allow field workers to delete media from accessible projects

-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete their own media" ON public.project_media;

-- Create new delete policy that allows field workers to delete any media from projects they can access
CREATE POLICY "Users can delete media from accessible projects"
ON public.project_media
FOR DELETE
USING (
  -- Users can always delete their own uploads
  uploaded_by = auth.uid() 
  OR 
  -- Field workers can delete any media from projects they can access
  (
    has_role(auth.uid(), 'field_worker'::app_role) 
    AND 
    can_access_project(auth.uid(), project_id)
  )
  OR
  -- Admins and managers can delete any media
  has_role(auth.uid(), 'admin'::app_role)
  OR
  has_role(auth.uid(), 'manager'::app_role)
);