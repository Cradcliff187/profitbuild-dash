-- =====================================================
-- Activity Feed System
-- =====================================================

-- 1. Create activity_feed table
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Activity Classification
  activity_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- User & Project Context
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Display Information
  description TEXT NOT NULL,
  
  -- Metadata (flexible for rejection reasons, old/new values, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Soft Delete Support
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Create Indexes for Performance
CREATE INDEX idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX idx_activity_feed_project_id ON public.activity_feed(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_activity_feed_user_id ON public.activity_feed(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_activity_feed_activity_type ON public.activity_feed(activity_type);
CREATE INDEX idx_activity_feed_entity_type_id ON public.activity_feed(entity_type, entity_id);

-- 3. Enable RLS
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view activities for accessible projects"
  ON public.activity_feed
  FOR SELECT
  USING (
    project_id IS NULL
    OR
    public.can_access_project(auth.uid(), project_id)
  );

CREATE POLICY "System can insert activities"
  ON public.activity_feed
  FOR INSERT
  WITH CHECK (true);

-- 5. Helper function to log activities
CREATE OR REPLACE FUNCTION public.log_activity(
  p_activity_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID,
  p_project_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_activity_id UUID;
BEGIN
  INSERT INTO public.activity_feed (
    activity_type,
    entity_type,
    entity_id,
    user_id,
    project_id,
    description,
    metadata
  ) VALUES (
    p_activity_type,
    p_entity_type,
    p_entity_id,
    p_user_id,
    p_project_id,
    p_description,
    p_metadata
  ) RETURNING id INTO new_activity_id;
  
  RETURN new_activity_id;
END;
$$;

-- 6. Time Entries Trigger Function
CREATE OR REPLACE FUNCTION public.log_time_entry_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payee_name TEXT;
  project_num TEXT;
  hours_worked NUMERIC;
BEGIN
  IF COALESCE(NEW.category, OLD.category) != 'labor_internal' THEN
    RETURN NEW;
  END IF;

  SELECT p.payee_name INTO payee_name
  FROM public.payees p
  WHERE p.id = COALESCE(NEW.payee_id, OLD.payee_id);

  SELECT proj.project_number INTO project_num
  FROM public.projects proj
  WHERE proj.id = COALESCE(NEW.project_id, OLD.project_id);

  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    hours_worked := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'time_entry.created',
      'time_entry',
      NEW.id,
      NEW.user_id,
      NEW.project_id,
      format('%s submitted %s hours for %s', payee_name, ROUND(hours_worked, 2), project_num),
      jsonb_build_object('hours', hours_worked, 'status', NEW.approval_status)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.approval_status != 'approved' AND NEW.approval_status = 'approved' THEN
      PERFORM public.log_activity(
        'time_entry.approved',
        'time_entry',
        NEW.id,
        NEW.approved_by,
        NEW.project_id,
        format('Approved %s hours for %s on %s', ROUND(hours_worked, 2), payee_name, project_num),
        jsonb_build_object('hours', hours_worked, 'approved_by', NEW.approved_by)
      );
    END IF;

    IF OLD.approval_status != 'rejected' AND NEW.approval_status = 'rejected' THEN
      PERFORM public.log_activity(
        'time_entry.rejected',
        'time_entry',
        NEW.id,
        NEW.approved_by,
        NEW.project_id,
        format('Rejected %s hours for %s on %s', ROUND(hours_worked, 2), payee_name, project_num),
        jsonb_build_object('hours', hours_worked, 'rejection_reason', NEW.rejection_reason)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Receipts Trigger Function
CREATE OR REPLACE FUNCTION public.log_receipt_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  project_num TEXT;
BEGIN
  SELECT p.full_name INTO user_name
  FROM public.profiles p
  WHERE p.id = COALESCE(NEW.user_id, OLD.user_id);

  IF COALESCE(NEW.project_id, OLD.project_id) IS NOT NULL THEN
    SELECT proj.project_number INTO project_num
    FROM public.projects proj
    WHERE proj.id = COALESCE(NEW.project_id, OLD.project_id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'receipt.uploaded',
      'receipt',
      NEW.id,
      NEW.user_id,
      NEW.project_id,
      format('%s uploaded receipt ($%s)%s', 
        user_name, 
        NEW.amount,
        CASE WHEN project_num IS NOT NULL THEN ' for ' || project_num ELSE '' END
      ),
      jsonb_build_object('amount', NEW.amount, 'project', project_num)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.approval_status != 'approved' AND NEW.approval_status = 'approved' THEN
      PERFORM public.log_activity(
        'receipt.approved',
        'receipt',
        NEW.id,
        NEW.approved_by,
        NEW.project_id,
        format('Approved receipt ($%s) from %s%s', 
          NEW.amount,
          user_name,
          CASE WHEN project_num IS NOT NULL THEN ' for ' || project_num ELSE '' END
        ),
        jsonb_build_object('amount', NEW.amount, 'approved_by', NEW.approved_by)
      );
    END IF;

    IF OLD.approval_status != 'rejected' AND NEW.approval_status = 'rejected' THEN
      PERFORM public.log_activity(
        'receipt.rejected',
        'receipt',
        NEW.id,
        NEW.approved_by,
        NEW.project_id,
        format('Rejected receipt ($%s) from %s - %s', 
          NEW.amount,
          user_name,
          COALESCE(NEW.rejection_reason, 'No reason provided')
        ),
        jsonb_build_object('amount', NEW.amount, 'rejection_reason', NEW.rejection_reason)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Expenses Trigger Function (Non-Time Entry)
CREATE OR REPLACE FUNCTION public.log_expense_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_num TEXT;
  payee_name TEXT;
BEGIN
  IF COALESCE(NEW.category, OLD.category) = 'labor_internal' THEN
    RETURN NEW;
  END IF;

  SELECT proj.project_number INTO project_num
  FROM public.projects proj
  WHERE proj.id = COALESCE(NEW.project_id, OLD.project_id);

  IF COALESCE(NEW.payee_id, OLD.payee_id) IS NOT NULL THEN
    SELECT p.payee_name INTO payee_name
    FROM public.payees p
    WHERE p.id = COALESCE(NEW.payee_id, OLD.payee_id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'expense.added',
      'expense',
      NEW.id,
      NEW.user_id,
      NEW.project_id,
      format('Added %s expense: $%s%s for %s', 
        NEW.category,
        NEW.amount,
        CASE WHEN payee_name IS NOT NULL THEN ' to ' || payee_name ELSE '' END,
        project_num
      ),
      jsonb_build_object('amount', NEW.amount, 'category', NEW.category, 'payee', payee_name)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
      PERFORM public.log_activity(
        'expense.updated',
        'expense',
        NEW.id,
        NEW.updated_by,
        NEW.project_id,
        format('Updated expense amount from $%s to $%s for %s', 
          OLD.amount,
          NEW.amount,
          project_num
        ),
        jsonb_build_object('old_amount', OLD.amount, 'new_amount', NEW.amount, 'category', NEW.category)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 9. Project Status Trigger Function
CREATE OR REPLACE FUNCTION public.log_project_status_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity(
      'project.status_changed',
      'project',
      NEW.id,
      auth.uid(),
      NEW.id,
      format('Project %s status changed: %s → %s', 
        NEW.project_number,
        OLD.status,
        NEW.status
      ),
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 10. Estimate Status Trigger Function
CREATE OR REPLACE FUNCTION public.log_estimate_status_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_num TEXT;
BEGIN
  SELECT proj.project_number INTO project_num
  FROM public.projects proj
  WHERE proj.id = COALESCE(NEW.project_id, OLD.project_id);

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity(
      'estimate.status_changed',
      'estimate',
      NEW.id,
      auth.uid(),
      NEW.project_id,
      format('Estimate %s for %s: %s → %s', 
        NEW.estimate_number,
        project_num,
        OLD.status,
        NEW.status
      ),
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'estimate_number', NEW.estimate_number)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 11. Quote Status Trigger Function
CREATE OR REPLACE FUNCTION public.log_quote_status_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_num TEXT;
  payee_name TEXT;
BEGIN
  SELECT proj.project_number INTO project_num
  FROM public.projects proj
  WHERE proj.id = COALESCE(NEW.project_id, OLD.project_id);

  SELECT p.payee_name INTO payee_name
  FROM public.payees p
  WHERE p.id = COALESCE(NEW.payee_id, OLD.payee_id);

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity(
      'quote.status_changed',
      'quote',
      NEW.id,
      auth.uid(),
      NEW.project_id,
      format('Quote %s from %s for %s: %s → %s', 
        NEW.quote_number,
        payee_name,
        project_num,
        OLD.status,
        NEW.status
      ),
      jsonb_build_object(
        'old_status', OLD.status, 
        'new_status', NEW.status, 
        'quote_number', NEW.quote_number,
        'payee', payee_name,
        'amount', NEW.total_amount
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 12. Change Order Trigger Function
CREATE OR REPLACE FUNCTION public.log_change_order_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_num TEXT;
BEGIN
  SELECT proj.project_number INTO project_num
  FROM public.projects proj
  WHERE proj.id = COALESCE(NEW.project_id, OLD.project_id);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'change_order.created',
      'change_order',
      NEW.id,
      auth.uid(),
      NEW.project_id,
      format('Created change order %s for %s ($%s)', 
        NEW.change_order_number,
        project_num,
        NEW.client_amount
      ),
      jsonb_build_object('amount', NEW.client_amount, 'co_number', NEW.change_order_number)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.log_activity(
        'change_order.approved',
        'change_order',
        NEW.id,
        NEW.approved_by,
        NEW.project_id,
        format('Approved change order %s for %s ($%s)', 
          NEW.change_order_number,
          project_num,
          NEW.client_amount
        ),
        jsonb_build_object('amount', NEW.client_amount, 'approved_by', NEW.approved_by)
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.log_activity(
        'change_order.rejected',
        'change_order',
        NEW.id,
        auth.uid(),
        NEW.project_id,
        format('Rejected change order %s for %s', 
          NEW.change_order_number,
          project_num
        ),
        jsonb_build_object('reason', NEW.reason_for_change)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 13. Create Triggers
CREATE TRIGGER trigger_log_time_entry_activity
  AFTER INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_time_entry_activity();

CREATE TRIGGER trigger_log_receipt_activity
  AFTER INSERT OR UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_receipt_activity();

CREATE TRIGGER trigger_log_expense_activity
  AFTER INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_expense_activity();

CREATE TRIGGER trigger_log_project_status_activity
  AFTER UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_status_activity();

CREATE TRIGGER trigger_log_estimate_status_activity
  AFTER UPDATE ON public.estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.log_estimate_status_activity();

CREATE TRIGGER trigger_log_quote_status_activity
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_quote_status_activity();

CREATE TRIGGER trigger_log_change_order_activity
  AFTER INSERT OR UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_change_order_activity();