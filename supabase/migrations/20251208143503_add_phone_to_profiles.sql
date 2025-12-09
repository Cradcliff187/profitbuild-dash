-- Migration: add_phone_to_profiles.sql
-- Add phone number field and SMS notification preference to profiles table

-- Add phone number field to profiles
ALTER TABLE profiles 
ADD COLUMN phone TEXT;

-- Add index for lookups
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;

-- Add sms_enabled preference (user can opt out)
ALTER TABLE profiles 
ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.phone IS 'Mobile phone number for SMS notifications (E.164 format preferred, e.g., +15551234567)';
COMMENT ON COLUMN profiles.sms_notifications_enabled IS 'Whether user wants to receive SMS notifications';

