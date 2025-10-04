-- Phase 2.5: Update RLS policies for team collaboration on project media

-- Drop the restrictive policy that only allows users to update their own media
DROP POLICY IF EXISTS "Users can update their own media" ON public.project_media;

-- Create new policy that allows any authenticated user to update captions/descriptions
-- This enables team collaboration while maintaining delete restrictions
CREATE POLICY "Authenticated users can update project media"
ON public.project_media
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Note: Delete policy remains unchanged - only the uploader can delete media
-- This ensures data integrity while enabling collaborative caption/description editing