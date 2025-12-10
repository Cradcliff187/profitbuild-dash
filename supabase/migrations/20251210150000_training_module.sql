-- =============================================================================
-- TRAINING MODULE DATABASE MIGRATION
-- RCG Work - Internal Training & Content Management
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Training content types
CREATE TYPE training_content_type AS ENUM (
  'video_link',      -- YouTube, Vimeo, Loom links
  'video_embed',     -- Embeddable video (iframe)
  'document',        -- PDF, Word docs (uploaded to storage)
  'presentation',    -- PowerPoint/deck (uploaded to storage)
  'external_link'    -- Any external URL
);

-- Training content status
CREATE TYPE training_status AS ENUM (
  'draft',           -- Not visible to users
  'published',       -- Active and assignable
  'archived'         -- Hidden but preserved
);

-- =============================================================================
-- TRAINING CONTENT TABLE
-- The library of all training materials
-- =============================================================================
CREATE TABLE public.training_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content metadata
  title TEXT NOT NULL,
  description TEXT,
  content_type training_content_type NOT NULL,
  
  -- Content source (use ONE based on content_type)
  content_url TEXT,                          -- For video_link, external_link
  storage_path TEXT,                         -- For document, presentation (Supabase storage path)
  embed_code TEXT,                           -- For video_embed (iframe HTML)
  
  -- Display settings
  thumbnail_url TEXT,                        -- Preview image URL
  duration_minutes INTEGER,                  -- Estimated completion time
  
  -- Status & visibility
  status training_status DEFAULT 'draft',
  is_required BOOLEAN DEFAULT false,         -- Required for all employees
  
  -- Targeting (who should see this by default)
  -- NULL = all roles, or array of specific roles
  target_roles public.app_role[] DEFAULT NULL,
  
  -- Audit fields
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_training_content_status ON public.training_content(status);
CREATE INDEX idx_training_content_created_at ON public.training_content(created_at DESC);
CREATE INDEX idx_training_content_is_required ON public.training_content(is_required) WHERE is_required = true;

-- Updated_at trigger
CREATE TRIGGER training_content_updated_at
  BEFORE UPDATE ON public.training_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- TRAINING ASSIGNMENTS TABLE
-- Who needs to complete what
-- =============================================================================
CREATE TABLE public.training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  training_content_id UUID NOT NULL REFERENCES public.training_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_by UUID REFERENCES public.profiles(id),
  due_date DATE,
  priority INTEGER DEFAULT 0,                 -- Higher = more urgent
  notes TEXT,                                 -- Admin notes for this assignment
  
  -- Notification tracking
  notification_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  
  assigned_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate assignments
  UNIQUE(training_content_id, user_id)
);

-- Indexes
CREATE INDEX idx_training_assignments_user ON public.training_assignments(user_id);
CREATE INDEX idx_training_assignments_content ON public.training_assignments(training_content_id);
CREATE INDEX idx_training_assignments_due_date ON public.training_assignments(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_training_assignments_pending ON public.training_assignments(user_id, training_content_id) 
  WHERE notification_sent_at IS NULL;

-- =============================================================================
-- TRAINING COMPLETIONS TABLE
-- Tracking who finished what
-- =============================================================================
CREATE TABLE public.training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  training_content_id UUID NOT NULL REFERENCES public.training_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Completion data
  completed_at TIMESTAMPTZ DEFAULT now(),
  time_spent_minutes INTEGER,                 -- Optional: actual time spent
  
  -- Acknowledgment
  acknowledged BOOLEAN DEFAULT true,          -- User clicked "I completed this"
  notes TEXT,                                 -- User can add notes/feedback
  
  -- Prevent duplicate completions
  UNIQUE(training_content_id, user_id)
);

-- Indexes
CREATE INDEX idx_training_completions_user ON public.training_completions(user_id);
CREATE INDEX idx_training_completions_content ON public.training_completions(training_content_id);
CREATE INDEX idx_training_completions_date ON public.training_completions(completed_at DESC);

-- =============================================================================
-- TRAINING NOTIFICATIONS TABLE
-- Email delivery tracking (for audit and resend capability)
-- =============================================================================
CREATE TABLE public.training_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  training_content_id UUID NOT NULL REFERENCES public.training_content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('assignment', 'reminder', 'overdue')),
  email_id TEXT,                              -- Resend email ID
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered BOOLEAN DEFAULT false,
  error_message TEXT
);

-- Index
CREATE INDEX idx_training_notifications_content ON public.training_notifications(training_content_id);
CREATE INDEX idx_training_notifications_user ON public.training_notifications(user_id);

-- =============================================================================
-- REPORTING VIEW
-- For integration with existing report builder
-- =============================================================================
CREATE VIEW reporting.training_status AS
SELECT 
  -- User info
  p.id AS user_id,
  p.full_name AS employee_name,
  p.email AS employee_email,
  p.is_active AS employee_active,
  
  -- Content info
  tc.id AS content_id,
  tc.title AS content_title,
  tc.description AS content_description,
  tc.content_type,
  tc.is_required,
  tc.duration_minutes AS estimated_duration,
  tc.status AS content_status,
  
  -- Assignment info
  ta.id AS assignment_id,
  ta.assigned_at,
  ta.due_date,
  ta.priority,
  ta.notification_sent_at,
  ta.reminder_sent_at,
  
  -- Assigner info
  assigner.full_name AS assigned_by_name,
  
  -- Completion info
  tco.id AS completion_id,
  tco.completed_at,
  tco.time_spent_minutes AS actual_duration,
  tco.acknowledged,
  
  -- Calculated status
  CASE 
    WHEN tco.completed_at IS NOT NULL THEN 'completed'
    WHEN ta.due_date < CURRENT_DATE THEN 'overdue'
    WHEN ta.due_date IS NULL THEN 'assigned'
    WHEN ta.due_date >= CURRENT_DATE THEN 'pending'
    ELSE 'assigned'
  END AS status,
  
  -- Days calculations
  CASE 
    WHEN tco.completed_at IS NOT NULL THEN NULL
    WHEN ta.due_date IS NULL THEN NULL
    ELSE ta.due_date - CURRENT_DATE
  END AS days_remaining,
  
  -- Completion metrics (for aggregation)
  CASE WHEN tco.completed_at IS NOT NULL THEN 1 ELSE 0 END AS is_completed,
  CASE WHEN ta.due_date < CURRENT_DATE AND tco.completed_at IS NULL THEN 1 ELSE 0 END AS is_overdue

FROM public.training_assignments ta
JOIN public.profiles p ON p.id = ta.user_id
JOIN public.training_content tc ON tc.id = ta.training_content_id
LEFT JOIN public.profiles assigner ON assigner.id = ta.assigned_by
LEFT JOIN public.training_completions tco 
  ON tco.training_content_id = ta.training_content_id 
  AND tco.user_id = ta.user_id
WHERE p.is_active = true
  AND tc.status = 'published';

-- Grant access to the view
GRANT SELECT ON reporting.training_status TO authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE public.training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- TRAINING_CONTENT POLICIES
-- -----------------------------------------------------------------------------

-- Admins/Managers can do everything with content
CREATE POLICY "Admins and managers can manage training content"
  ON public.training_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Users can view published content that's assigned to them
CREATE POLICY "Users can view assigned published content"
  ON public.training_content
  FOR SELECT
  USING (
    status = 'published' 
    AND EXISTS (
      SELECT 1 FROM public.training_assignments 
      WHERE training_content_id = training_content.id 
      AND user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- TRAINING_ASSIGNMENTS POLICIES
-- -----------------------------------------------------------------------------

-- Admins/Managers can manage all assignments
CREATE POLICY "Admins and managers can manage assignments"
  ON public.training_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Users can view their own assignments
CREATE POLICY "Users can view own assignments"
  ON public.training_assignments
  FOR SELECT
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- TRAINING_COMPLETIONS POLICIES
-- -----------------------------------------------------------------------------

-- Admins/Managers can view all completions
CREATE POLICY "Admins and managers can view all completions"
  ON public.training_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Users can create their own completions
CREATE POLICY "Users can mark own completions"
  ON public.training_completions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can view their own completions
CREATE POLICY "Users can view own completions"
  ON public.training_completions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own completions (e.g., add notes)
CREATE POLICY "Users can update own completions"
  ON public.training_completions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- TRAINING_NOTIFICATIONS POLICIES
-- -----------------------------------------------------------------------------

-- Admins/Managers can manage notifications
CREATE POLICY "Admins and managers can manage notifications"
  ON public.training_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.training_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- =============================================================================
-- STORAGE BUCKET (Optional - if uploading files)
-- Run this separately in Supabase dashboard or via SQL
-- =============================================================================

-- Create storage bucket for training content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-content',
  'training-content',
  false,  -- Private bucket, use signed URLs
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'video/mp4', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can upload training content"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'training-content'
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update training content"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'training-content'
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete training content"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'training-content'
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Authenticated users can view training content"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'training-content');

-- =============================================================================
-- UPDATE SAVED_REPORTS CATEGORY CONSTRAINT
-- Add 'Training' to allowed categories before inserting seed data
-- =============================================================================

-- Drop the existing category constraint
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the constraint name (check for both possible names)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.saved_reports'::regclass
    AND contype = 'c'
    AND (pg_get_constraintdef(oid) LIKE '%category%IN%' OR conname = 'saved_reports_category_check');
  
  -- Drop the constraint if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.saved_reports DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- Add new constraint with 'Training' included (drop first if exists)
ALTER TABLE public.saved_reports
DROP CONSTRAINT IF EXISTS saved_reports_category_check;

ALTER TABLE public.saved_reports
ADD CONSTRAINT saved_reports_category_check 
CHECK (category IN ('financial', 'operational', 'client', 'vendor', 'schedule', 'Training'));

-- =============================================================================
-- SEED REPORT TEMPLATES
-- Add training report templates to saved_reports
-- =============================================================================

INSERT INTO public.saved_reports (name, description, category, config, is_template, created_by)
VALUES 
(
  'Training Completion Summary',
  'Overview of training completion rates by employee',
  'Training',
  '{
    "data_source": "reporting.training_status",
    "fields": ["employee_name", "content_title", "status", "due_date", "completed_at", "assigned_at"],
    "filters": [],
    "sort_by": "employee_name",
    "sort_dir": "ASC",
    "grouping": null
  }'::jsonb,
  true,
  NULL
),
(
  'Overdue Training Report',
  'List of all overdue training assignments',
  'Training',
  '{
    "data_source": "reporting.training_status",
    "fields": ["employee_name", "employee_email", "content_title", "due_date", "days_remaining", "assigned_at"],
    "filters": [{"field": "status", "operator": "=", "value": "overdue"}],
    "sort_by": "days_remaining",
    "sort_dir": "ASC",
    "grouping": null
  }'::jsonb,
  true,
  NULL
),
(
  'Required Training Status',
  'Status of all required training items',
  'Training',
  '{
    "data_source": "reporting.training_status",
    "fields": ["employee_name", "assigned_at", "content_title", "status", "completed_at"],
    "filters": [{"field": "is_required", "operator": "=", "value": true}],
    "sort_by": "content_title",
    "sort_dir": "ASC",
    "grouping": "content_title"
  }'::jsonb,
  true,
  NULL
);

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

