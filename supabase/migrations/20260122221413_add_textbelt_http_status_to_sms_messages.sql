-- Migration: add_textbelt_http_status_to_sms_messages
-- Version: 20260122221413
-- Date: 2026-01-22
-- Description: Add textbelt_http_status column to sms_messages table for enhanced error diagnostics

-- Add column to store HTTP status code from Textbelt API responses
-- This helps diagnose SMS delivery failures by capturing the HTTP response status
ALTER TABLE sms_messages 
ADD COLUMN IF NOT EXISTS textbelt_http_status integer;

COMMENT ON COLUMN sms_messages.textbelt_http_status IS 'HTTP status code from Textbelt API response. Helps diagnose delivery failures when error_message is null.';
