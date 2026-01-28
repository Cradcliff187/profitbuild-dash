-- Idempotent: safe when bucket/policies already exist (e.g. from 20260128025855 applied via MCP).
-- Create private storage bucket for contract templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-templates', 'contract-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role (edge functions) to read templates
DROP POLICY IF EXISTS "Service role can read templates" ON storage.objects;
CREATE POLICY "Service role can read templates"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'contract-templates');

-- Allow admins to manage templates (executive role can be added to app_role enum if needed)
DROP POLICY IF EXISTS "Admins can manage templates" ON storage.objects;
CREATE POLICY "Admins can manage templates"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'contract-templates'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
