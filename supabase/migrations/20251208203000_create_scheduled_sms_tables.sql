-- Migration: create_scheduled_sms_tables.sql
-- Create tables for scheduled SMS messages and execution logs

-- Scheduled SMS Messages table
CREATE TABLE scheduled_sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  
  -- Link configuration
  link_type TEXT, -- 'clock_in', 'timesheet', 'project', 'receipt', 'custom', 'dashboard'
  link_url TEXT,
  project_id UUID REFERENCES projects(id),
  
  -- Schedule configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('recurring', 'one_time')),
  cron_expression TEXT, -- For recurring schedules (e.g., '45 15 * * 1-5' for Mon-Fri at 3:45 PM)
  scheduled_datetime TIMESTAMPTZ, -- For one-time sends
  timezone TEXT NOT NULL DEFAULT 'America/New_York', -- e.g., 'America/New_York' for EST
  
  -- Recipient targeting
  target_type TEXT NOT NULL CHECK (target_type IN ('users', 'roles')),
  target_user_ids JSONB, -- Array of user UUIDs: ["uuid1", "uuid2"]
  target_roles JSONB, -- Array of roles: ["field_worker", "manager"]
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled SMS Logs table
CREATE TABLE scheduled_sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_sms_id UUID REFERENCES scheduled_sms_messages(id) ON DELETE CASCADE,
  
  executed_at TIMESTAMPTZ DEFAULT now(),
  recipients_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  error_details JSONB, -- Array of error objects: [{"user_id": "uuid", "error": "message"}]
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for scheduled_sms_messages
CREATE INDEX idx_scheduled_sms_active ON scheduled_sms_messages(is_active) WHERE is_active = true;
CREATE INDEX idx_scheduled_sms_type ON scheduled_sms_messages(schedule_type);
CREATE INDEX idx_scheduled_sms_datetime ON scheduled_sms_messages(scheduled_datetime) WHERE scheduled_datetime IS NOT NULL;
CREATE INDEX idx_scheduled_sms_created_by ON scheduled_sms_messages(created_by);

-- Indexes for scheduled_sms_logs
CREATE INDEX idx_scheduled_sms_logs_scheduled_id ON scheduled_sms_logs(scheduled_sms_id);
CREATE INDEX idx_scheduled_sms_logs_executed_at ON scheduled_sms_logs(executed_at DESC);

-- RLS Policies for scheduled_sms_messages
ALTER TABLE scheduled_sms_messages ENABLE ROW LEVEL SECURITY;

-- Admins/managers can view all scheduled messages
CREATE POLICY "Admins can view scheduled SMS messages"
  ON scheduled_sms_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Admins/managers can insert scheduled messages
CREATE POLICY "Admins can create scheduled SMS messages"
  ON scheduled_sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
    AND created_by = auth.uid()
  );

-- Admins/managers can update scheduled messages
CREATE POLICY "Admins can update scheduled SMS messages"
  ON scheduled_sms_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Admins/managers can delete scheduled messages
CREATE POLICY "Admins can delete scheduled SMS messages"
  ON scheduled_sms_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for scheduled_sms_logs
ALTER TABLE scheduled_sms_logs ENABLE ROW LEVEL SECURITY;

-- Admins/managers can view all logs
CREATE POLICY "Admins can view scheduled SMS logs"
  ON scheduled_sms_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_sms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduled_sms_updated_at
  BEFORE UPDATE ON scheduled_sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_sms_updated_at();

-- Comments for documentation
COMMENT ON TABLE scheduled_sms_messages IS 'Stores scheduled SMS message configurations for automated sending';
COMMENT ON TABLE scheduled_sms_logs IS 'Tracks execution history of scheduled SMS messages';
COMMENT ON COLUMN scheduled_sms_messages.cron_expression IS 'Cron expression for recurring schedules (minute hour day month weekday)';
COMMENT ON COLUMN scheduled_sms_messages.timezone IS 'IANA timezone identifier (e.g., America/New_York for EST)';
COMMENT ON COLUMN scheduled_sms_messages.target_user_ids IS 'JSON array of user UUIDs: ["uuid1", "uuid2"]';
COMMENT ON COLUMN scheduled_sms_messages.target_roles IS 'JSON array of role names: ["field_worker", "manager"]';

