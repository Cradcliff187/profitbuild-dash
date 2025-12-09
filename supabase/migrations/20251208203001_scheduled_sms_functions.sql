-- Migration: scheduled_sms_functions.sql
-- Create helper function for resolving scheduled SMS recipients

CREATE OR REPLACE FUNCTION get_scheduled_sms_recipients(
  p_target_type TEXT,
  p_target_user_ids JSONB,
  p_target_roles JSONB
)
RETURNS TABLE(user_id UUID, phone TEXT, full_name TEXT)
AS $$
BEGIN
  IF p_target_type = 'users' THEN
    -- Return users from target_user_ids array
    RETURN QUERY
    SELECT 
      p.id,
      p.phone,
      p.full_name
    FROM profiles p
    WHERE p.id = ANY(
      SELECT jsonb_array_elements_text(p_target_user_ids)::uuid
    )
    AND p.sms_notifications_enabled = true
    AND p.phone IS NOT NULL
    AND p.phone != '';
  ELSIF p_target_type = 'roles' THEN
    -- Return users with target roles
    RETURN QUERY
    SELECT DISTINCT
      p.id,
      p.phone,
      p.full_name
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.id
    WHERE ur.role = ANY(
      SELECT jsonb_array_elements_text(p_target_roles)::text
    )
    AND p.sms_notifications_enabled = true
    AND p.phone IS NOT NULL
    AND p.phone != '';
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comment for documentation
COMMENT ON FUNCTION get_scheduled_sms_recipients IS 'Returns list of eligible recipients (user_id, phone, full_name) based on target_type, filtering by sms_notifications_enabled and valid phone numbers';

