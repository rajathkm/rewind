-- ============================================
-- PROCESSING PIPELINE ENHANCEMENTS
-- Migration for retry logic, content source tracking, and status improvements
-- ============================================

-- Add new enum values to processing_status
-- Note: PostgreSQL requires adding values one at a time
ALTER TYPE processing_status ADD VALUE IF NOT EXISTS 'skipped';
ALTER TYPE processing_status ADD VALUE IF NOT EXISTS 'permanently_failed';

-- Add retry tracking columns to content_items
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS retry_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_source text,
  ADD COLUMN IF NOT EXISTS is_summarizable boolean DEFAULT true;

-- Add check constraint for content_source values
ALTER TABLE public.content_items
  ADD CONSTRAINT content_source_check
  CHECK (content_source IS NULL OR content_source IN ('rss', 'fetched'));

-- Add index on processing_status for efficient queries
CREATE INDEX IF NOT EXISTS idx_content_items_processing_status
  ON public.content_items(processing_status);

-- Add composite index for retry queries (failed items that need retry)
CREATE INDEX IF NOT EXISTS idx_content_items_retry
  ON public.content_items(processing_status, retry_count, last_retry_at)
  WHERE processing_status IN ('failed', 'pending');

-- Add index on is_summarizable for filtering
CREATE INDEX IF NOT EXISTS idx_content_items_summarizable
  ON public.content_items(is_summarizable)
  WHERE is_summarizable = true;

-- Update existing content items: set is_summarizable based on word_count
UPDATE public.content_items
SET is_summarizable = CASE
  WHEN content_type = 'podcast_episode' THEN word_count >= 500
  ELSE word_count >= 300
END
WHERE is_summarizable IS NULL OR is_summarizable = true;

-- Set processing_status to 'skipped' for items that are not summarizable and still pending
UPDATE public.content_items
SET processing_status = 'skipped'
WHERE is_summarizable = false
  AND processing_status = 'pending';
