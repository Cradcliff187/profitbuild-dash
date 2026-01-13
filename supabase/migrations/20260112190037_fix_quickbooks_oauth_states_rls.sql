-- Fix RLS policies for quickbooks_oauth_states table
-- Drop existing policy if it exists, then create new one
DROP POLICY IF EXISTS "oauth_states_insert_policy" ON quickbooks_oauth_states;

-- Allow authenticated users to insert their own states
CREATE POLICY "oauth_states_insert_policy" 
ON quickbooks_oauth_states 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
