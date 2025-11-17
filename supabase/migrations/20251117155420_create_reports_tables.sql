-- Create tables for report builder functionality
-- Tables: saved_reports, report_execution_log

-- Store saved report configurations
CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('financial', 'operational', 'client', 'vendor', 'schedule')),
  config JSONB NOT NULL,
  is_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_reports
-- Users can read all templates
CREATE POLICY "Users can read all templates"
  ON public.saved_reports
  FOR SELECT
  USING (is_template = true);

-- Users can read their own saved reports
CREATE POLICY "Users can read their own reports"
  ON public.saved_reports
  FOR SELECT
  USING (auth.uid() = created_by);

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.saved_reports
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own reports
CREATE POLICY "Users can update their own reports"
  ON public.saved_reports
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
  ON public.saved_reports
  FOR DELETE
  USING (auth.uid() = created_by);

-- Audit trail for report executions
CREATE TABLE IF NOT EXISTS public.report_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.saved_reports(id) ON DELETE SET NULL,
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time_ms INTEGER,
  row_count INTEGER,
  export_format TEXT,
  config_used JSONB
);

-- Enable RLS
ALTER TABLE public.report_execution_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_execution_log
-- Users can read their own execution logs
CREATE POLICY "Users can read their own execution logs"
  ON public.report_execution_log
  FOR SELECT
  USING (auth.uid() = executed_by);

-- Users can create execution logs
CREATE POLICY "Users can create execution logs"
  ON public.report_execution_log
  FOR INSERT
  WITH CHECK (auth.uid() = executed_by);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_by ON public.saved_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_reports_category ON public.saved_reports(category);
CREATE INDEX IF NOT EXISTS idx_saved_reports_is_template ON public.saved_reports(is_template);
CREATE INDEX IF NOT EXISTS idx_report_execution_log_report_id ON public.report_execution_log(report_id);
CREATE INDEX IF NOT EXISTS idx_report_execution_log_executed_by ON public.report_execution_log(executed_by);
CREATE INDEX IF NOT EXISTS idx_report_execution_log_executed_at ON public.report_execution_log(executed_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_saved_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_saved_reports_updated_at
  BEFORE UPDATE ON public.saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_reports_updated_at();

