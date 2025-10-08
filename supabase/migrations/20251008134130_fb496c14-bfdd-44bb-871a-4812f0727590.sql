-- Create media_comments table
CREATE TABLE public.media_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.project_media(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (everyone can see everything, users can manage their own)
CREATE POLICY "Anyone can view comments"
  ON public.media_comments 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can add comments"
  ON public.media_comments 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit their own comments"
  ON public.media_comments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.media_comments 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_media_comments_media_id ON public.media_comments(media_id);
CREATE INDEX idx_media_comments_created_at ON public.media_comments(created_at DESC);
CREATE INDEX idx_media_comments_user_id ON public.media_comments(user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_media_comments_updated_at
  BEFORE UPDATE ON public.media_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();