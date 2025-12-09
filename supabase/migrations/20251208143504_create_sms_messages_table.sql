-- Migration: create_sms_messages_table.sql
-- Create SMS messages table for tracking sent messages

CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient info
  recipient_user_id UUID REFERENCES profiles(id),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  
  -- Message content
  message_body TEXT NOT NULL,
  link_type TEXT, -- 'clock_in', 'timesheet', 'project', 'custom', etc.
  link_url TEXT,
  
  -- Sending info
  sent_by UUID REFERENCES profiles(id) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  
  -- Textbelt response
  textbelt_text_id TEXT,
  delivery_status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
  status_checked_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Context
  project_id UUID REFERENCES projects(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sms_messages_recipient ON sms_messages(recipient_user_id);
CREATE INDEX idx_sms_messages_sent_by ON sms_messages(sent_by);
CREATE INDEX idx_sms_messages_sent_at ON sms_messages(sent_at DESC);
CREATE INDEX idx_sms_messages_project ON sms_messages(project_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(delivery_status);

-- RLS Policies
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Admins/managers can view all messages
CREATE POLICY "Admins can view all SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Admins/managers can insert messages
CREATE POLICY "Admins can send SMS messages"
  ON sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Users can see messages sent to them
CREATE POLICY "Users can view their own SMS messages"
  ON sms_messages FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

