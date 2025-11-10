-- Allow users to view profiles of note authors on projects they can access
CREATE POLICY "Users can view profiles of note authors on accessible projects"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM project_notes pn
    WHERE pn.user_id = profiles.id
    AND can_access_project(auth.uid(), pn.project_id)
  )
);