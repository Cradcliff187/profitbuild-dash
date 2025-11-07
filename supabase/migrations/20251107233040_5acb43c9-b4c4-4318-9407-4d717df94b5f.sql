-- Create project_notes table
CREATE TABLE public.project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_project_notes_project_id ON public.project_notes(project_id);
CREATE INDEX idx_project_notes_created_at ON public.project_notes(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Loose - all authenticated users can view/manage all notes
CREATE POLICY "Authenticated users can view all project notes"
  ON public.project_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert project notes"
  ON public.project_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update all project notes"
  ON public.project_notes FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all project notes"
  ON public.project_notes FOR DELETE
  TO authenticated
  USING (true);