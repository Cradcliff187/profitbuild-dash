-- Allow all authenticated users to view system projects for receipt uploads and imports
CREATE POLICY "Anyone can view system projects"
ON projects
FOR SELECT
TO authenticated
USING (
  project_number IN ('SYS-000', '000-UNASSIGNED')
);