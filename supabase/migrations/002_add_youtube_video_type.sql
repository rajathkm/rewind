-- ============================================
-- ADD YOUTUBE VIDEO SUPPORT
-- Migration to add youtube_video content type
-- ============================================

-- Add youtube_video to the content_type enum
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'youtube_video';

-- Add youtube to the subscription_type enum for YouTube channels (future use)
-- ALTER TYPE subscription_type ADD VALUE IF NOT EXISTS 'youtube';

-- Add YouTube-specific fields to content_items
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS youtube_video_id text,
  ADD COLUMN IF NOT EXISTS youtube_channel_name text,
  ADD COLUMN IF NOT EXISTS youtube_channel_id text,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS transcript_source text; -- 'auto', 'manual', or null if no transcript

-- Create an index on youtube_video_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_content_items_youtube_video_id
  ON public.content_items(youtube_video_id)
  WHERE youtube_video_id IS NOT NULL;

-- Add a unique constraint to prevent duplicate YouTube videos per user
-- We'll track this via the guid field which will be set to the video ID

COMMENT ON COLUMN public.content_items.youtube_video_id IS 'YouTube video ID extracted from URL';
COMMENT ON COLUMN public.content_items.youtube_channel_name IS 'Name of the YouTube channel';
COMMENT ON COLUMN public.content_items.youtube_channel_id IS 'YouTube channel ID';
COMMENT ON COLUMN public.content_items.youtube_thumbnail_url IS 'URL to video thumbnail';
COMMENT ON COLUMN public.content_items.transcript_source IS 'Source of transcript: auto, manual, or null';
