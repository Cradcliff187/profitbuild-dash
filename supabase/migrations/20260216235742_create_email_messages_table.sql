-- Create email_messages table for tracking all outbound emails
-- Mirrors the sms_messages pattern already used for SMS tracking
CREATE TABLE public.email_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_user_id UUID REFERENCES profiles(id),
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  project_id UUID REFERENCES projects(id),
  sent_by UUID REFERENCES profiles(id),
  resend_email_id TEXT,
  delivery_status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment explaining the table
COMMENT ON TABLE public.email_messages IS 'Tracks all outbound emails sent via Resend. Mirrors sms_messages pattern.';
COMMENT ON COLUMN public.email_messages.email_type IS 'Type of email: password-reset, user-invitation, receipt-notification, training-notification, media-report';
COMMENT ON COLUMN public.email_messages.entity_type IS 'Related entity type: auth, receipt, training, project, media-report';
COMMENT ON COLUMN public.email_messages.entity_id IS 'ID of the related entity (receipt_id, training_content_id, project_id, etc.)';
COMMENT ON COLUMN public.email_messages.resend_email_id IS 'Resend API email ID for cross-reference';
COMMENT ON COLUMN public.email_messages.delivery_status IS 'Status: sent, delivered, bounced, failed';

-- Enable RLS
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies matching existing patterns
CREATE POLICY "Admins can view all email messages"
  ON public.email_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own email messages"
  ON public.email_messages FOR SELECT
  USING (
    recipient_user_id = auth.uid() OR sent_by = auth.uid()
  );

-- Service role can insert (edge functions use service role key)
CREATE POLICY "Service role can insert email messages"
  ON public.email_messages FOR INSERT
  WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_email_messages_entity ON public.email_messages(entity_type, entity_id);
CREATE INDEX idx_email_messages_recipient ON public.email_messages(recipient_email);
CREATE INDEX idx_email_messages_project ON public.email_messages(project_id);
CREATE INDEX idx_email_messages_type ON public.email_messages(email_type);
CREATE INDEX idx_email_messages_sent_at ON public.email_messages(sent_at DESC);
