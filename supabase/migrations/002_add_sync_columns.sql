-- ============================================
-- ADD COLUMNS FOR CONTENT SYNC
-- ============================================

-- Add is_active to content_sources for enabling/disabling sync
ALTER TABLE public.content_sources
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add external_id and content_hash to content_items for sync tracking
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS raw_content text,
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds int,
  ADD COLUMN IF NOT EXISTS audio_file_size bigint,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for external_id lookups
CREATE INDEX IF NOT EXISTS idx_content_items_external_id ON public.content_items(external_id);

-- Add podcast_speakers and trivia to summaries
ALTER TABLE public.summaries
  ADD COLUMN IF NOT EXISTS trivia jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS podcast_speakers jsonb DEFAULT '[]'::jsonb;

-- Function to increment subscriber count
CREATE OR REPLACE FUNCTION increment_subscriber_count(source_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.content_sources
  SET subscriber_count = subscriber_count + 1
  WHERE id = source_id;
END;
$$;

-- Function to decrement subscriber count
CREATE OR REPLACE FUNCTION decrement_subscriber_count(source_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.content_sources
  SET subscriber_count = GREATEST(0, subscriber_count - 1)
  WHERE id = source_id;
END;
$$;
