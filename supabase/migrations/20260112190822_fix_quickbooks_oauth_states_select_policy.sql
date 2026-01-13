-- Add SELECT policy for upsert to check if row exists
-- Also add DELETE policy for cleanup of expired states

DROP POLICY IF EXISTS "oauth_states_select_policy" ON quickbooks_oauth_states;
DROP POLICY IF EXISTS "oauth_states_delete_policy" ON quickbooks_oauth_states;

-- Allow authenticated users to read their own states
CREATE POLICY "oauth_states_select_policy" 
ON quickbooks_oauth_states 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Allow authenticated users to delete their own states
CREATE POLICY "oauth_states_delete_policy" 
ON quickbooks_oauth_states 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
