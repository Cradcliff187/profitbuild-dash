-- Add metadata fields to bid_media table to match project_media capabilities
-- This migration adds GPS coordinates, device info, and upload tracking fields

-- Add new columns to bid_media
ALTER TABLE public.bid_media
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS altitude NUMERIC,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS device_model TEXT,
  ADD COLUMN IF NOT EXISTS upload_source TEXT CHECK (upload_source IN ('camera', 'gallery', 'web'));

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bid_media_location ON public.bid_media(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bid_media_taken_at ON public.bid_media(taken_at DESC) WHERE taken_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bid_media_upload_source ON public.bid_media(upload_source) WHERE upload_source IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.bid_media.latitude IS 'GPS latitude coordinate where media was captured';
COMMENT ON COLUMN public.bid_media.longitude IS 'GPS longitude coordinate where media was captured';
COMMENT ON COLUMN public.bid_media.altitude IS 'GPS altitude in meters where media was captured';
COMMENT ON COLUMN public.bid_media.location_name IS 'Human-readable location name or address';
COMMENT ON COLUMN public.bid_media.taken_at IS 'Timestamp when photo/video was actually taken (vs uploaded)';
COMMENT ON COLUMN public.bid_media.device_model IS 'Device model used to capture the media';
COMMENT ON COLUMN public.bid_media.upload_source IS 'Source of upload: camera (direct capture), gallery (file picker), or web (browser upload)';
