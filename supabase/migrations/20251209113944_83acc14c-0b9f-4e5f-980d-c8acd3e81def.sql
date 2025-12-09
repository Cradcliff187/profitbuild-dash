-- This is a no-op migration to trigger TypeScript type regeneration
-- The sms_messages, scheduled_sms_messages, scheduled_sms_logs tables already exist
-- The profiles.phone and profiles.sms_notifications_enabled columns already exist
-- This comment-only migration will cause Lovable to regenerate the types.ts file

SELECT 1;