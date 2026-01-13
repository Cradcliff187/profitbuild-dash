-- Add UPDATE policy for upsert operations
DROP POLICY IF EXISTS "oauth_states_update_policy" ON quickbooks_oauth_states;

CREATE POLICY "oauth_states_update_policy" 
ON quickbooks_oauth_states 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
