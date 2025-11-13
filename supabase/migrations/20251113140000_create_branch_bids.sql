-- Create branch_bids table
CREATE TABLE IF NOT EXISTS public.branch_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Create indexes for branch_bids
CREATE INDEX idx_branch_bids_created_by ON public.branch_bids(created_by);
CREATE INDEX idx_branch_bids_project_id ON public.branch_bids(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_branch_bids_estimate_id ON public.branch_bids(estimate_id) WHERE estimate_id IS NOT NULL;
CREATE INDEX idx_branch_bids_created_at ON public.branch_bids(created_at DESC);
CREATE INDEX idx_branch_bids_active ON public.branch_bids(id) WHERE deleted_at IS NULL;

-- Create bid_notes table
CREATE TABLE IF NOT EXISTS public.bid_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID REFERENCES public.branch_bids(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for bid_notes
CREATE INDEX idx_bid_notes_bid_id ON public.bid_notes(bid_id);
CREATE INDEX idx_bid_notes_created_at ON public.bid_notes(created_at DESC);
CREATE INDEX idx_bid_notes_user_id ON public.bid_notes(user_id);

-- Create bid_media table
CREATE TABLE IF NOT EXISTS public.bid_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID REFERENCES public.branch_bids(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'document')),
  file_size NUMERIC NOT NULL,
  duration NUMERIC,
  caption TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for bid_media
CREATE INDEX idx_bid_media_bid_id ON public.bid_media(bid_id);
CREATE INDEX idx_bid_media_created_at ON public.bid_media(created_at DESC);
CREATE INDEX idx_bid_media_uploaded_by ON public.bid_media(uploaded_by);
CREATE INDEX idx_bid_media_file_type ON public.bid_media(file_type);

-- Add updated_at trigger for branch_bids
CREATE TRIGGER update_branch_bids_updated_at
  BEFORE UPDATE ON public.branch_bids
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for bid_notes
CREATE TRIGGER update_bid_notes_updated_at
  BEFORE UPDATE ON public.bid_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for bid_media
CREATE TRIGGER update_bid_media_updated_at
  BEFORE UPDATE ON public.bid_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.branch_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branch_bids (Admin and Manager only)
CREATE POLICY "Admin and Manager can view all branch bids"
  ON public.branch_bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can create branch bids"
  ON public.branch_bids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can update branch bids"
  ON public.branch_bids FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can delete branch bids"
  ON public.branch_bids FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for bid_notes (Admin and Manager only)
CREATE POLICY "Admin and Manager can view bid notes"
  ON public.bid_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can create bid notes"
  ON public.bid_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can update bid notes"
  ON public.bid_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can delete bid notes"
  ON public.bid_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for bid_media (Admin and Manager only)
CREATE POLICY "Admin and Manager can view bid media"
  ON public.bid_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can create bid media"
  ON public.bid_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can update bid media"
  ON public.bid_media FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can delete bid media"
  ON public.bid_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.branch_bids IS 'Pre-estimate workspace for gathering notes, photos, videos, and documents before creating projects and estimates';
COMMENT ON TABLE public.bid_notes IS 'Notes associated with branch bids';
COMMENT ON TABLE public.bid_media IS 'Media files (photos, videos, documents) associated with branch bids';

-- Create storage bucket for bid media (photos/videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bid-media',
  'bid-media',
  true,
  157286400, -- 150MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for bid documents (PDFs, etc)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bid-documents',
  'bid-documents',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for bid-media storage bucket
CREATE POLICY "Admin and Manager can upload bid media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bid-media' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can view bid media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bid-media' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can delete bid media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bid-media' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for bid-documents storage bucket
CREATE POLICY "Admin and Manager can upload bid documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bid-documents' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can view bid documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bid-documents' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admin and Manager can delete bid documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bid-documents' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

