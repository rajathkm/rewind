# PRD: Content Processing Pipeline Fix

## Introduction

Fix the content processing pipeline in Rewind to ensure articles are extracted accurately and podcasts are properly processed for summarization. Currently, article extraction uses basic regex parsing that misses main content, and podcasts lack sufficient text for meaningful summaries.

### Problems Being Solved

1. **Article extraction is inaccurate**: The HTML extractor uses regex and ignores defined content selectors, often extracting navigation/footer text instead of article body
2. **Many articles aren't processed**: RSS feeds often contain truncated content; full articles need to be fetched from source URLs
3. **Podcasts aren't being summarized**: `extracted_text` only contains brief RSS descriptions (~50-100 words), which is insufficient for meaningful summaries
4. **No retry mechanism**: Failed items stay in "failed" status with no way to retry
5. **Inconsistent auto-summarization**: Pipeline doesn't respect per-subscription settings

## Goals

- Improve article content extraction accuracy to >90% (main content captured, not nav/footer)
- Enable full article fetching when RSS content is insufficient (<300 words)
- Process podcasts with substantial show notes (>500 words) for summarization
- Implement retry logic with max 3 attempts and exponential backoff
- Auto-summarize new content by default, respecting per-subscription toggle
- Provide UI controls for manual retry of failed items

## User Stories

### US-001: Improve HTML Content Extraction
**Description:** As a user, I want articles to be extracted accurately so that summaries reflect the actual article content, not website navigation or ads.

**Acceptance Criteria:**
- [ ] Refactor `extractFromHtml` to use proper DOM parsing (use linkedom or cheerio)
- [ ] Implement content selector priority: `article`, `[role="main"]`, `.post-content`, `.article-content`, `.entry-content`, `main`, then fallback to body
- [ ] Remove boilerplate: nav, header, footer, aside, ads, comments, social sharing
- [ ] Preserve paragraph structure for better summarization
- [ ] Extract word count and reading time accurately
- [ ] Unit tests for extraction with sample HTML from 5 different sites
- [ ] npm run typecheck passes

### US-002: Full Article Fetching
**Description:** As a user, I want Rewind to fetch the full article from the source URL when RSS content is truncated so I get complete summaries.

**Acceptance Criteria:**
- [ ] Add `fetchFullArticle(url: string)` function in `lib/content/fetcher.ts`
- [ ] Fetch with proper headers (User-Agent, Accept) and timeout (10s)
- [ ] Handle redirects (max 3)
- [ ] Apply content extraction to fetched HTML
- [ ] In `content-sync.ts`, fetch full article if extracted RSS content < 300 words
- [ ] Store both `raw_content` (from RSS) and `extracted_text` (from full fetch if needed)
- [ ] Add `content_source` field to track origin: 'rss' | 'fetched'
- [ ] Respect robots.txt and rate limit fetches (1 req/sec per domain)
- [ ] npm run typecheck passes

### US-003: Podcast Content Processing
**Description:** As a user, I want podcasts with detailed show notes to be summarized so I can quickly understand episode content.

**Acceptance Criteria:**
- [ ] In `content-sync.ts`, extract podcast description from: `itunes:summary`, `description`, `content:encoded`
- [ ] Combine all available text sources for `extracted_text`
- [ ] Only mark podcast as summarizable if `extracted_text` >= 500 words
- [ ] Add `is_summarizable` boolean field to content_items
- [ ] Set `processing_status` to 'skipped' for podcasts with <500 words (not 'pending')
- [ ] Store word count in `word_count` field
- [ ] npm run typecheck passes

### US-004: Minimum Content Threshold
**Description:** As a developer, I want a configurable minimum word count for summarization so we don't waste API calls on insufficient content.

**Acceptance Criteria:**
- [ ] Add `MIN_WORDS_FOR_SUMMARY = 300` constant in `lib/summarization/config.ts`
- [ ] Add `MIN_WORDS_FOR_PODCAST_SUMMARY = 500` constant
- [ ] In `auto-summarize.ts`, skip items below threshold
- [ ] Update query to filter: `word_count >= MIN_WORDS_FOR_SUMMARY`
- [ ] Set `processing_status` to 'skipped' for items below threshold
- [ ] Add 'skipped' to `processing_status` enum in database
- [ ] npm run typecheck passes

### US-005: Retry Logic for Failed Items
**Description:** As a user, I want failed items to be automatically retried so temporary failures don't permanently block content.

**Acceptance Criteria:**
- [ ] Add `retry_count` column to `content_items` table (default 0)
- [ ] Add `last_retry_at` column to `content_items` table
- [ ] Add `MAX_RETRIES = 3` constant
- [ ] Implement exponential backoff: 5min, 30min, 2hr delays
- [ ] In `auto-summarize.ts`, include failed items where `retry_count < 3` and backoff elapsed
- [ ] Increment `retry_count` on each failure
- [ ] Reset `retry_count` to 0 on success
- [ ] After 3 failures, set status to 'permanently_failed'
- [ ] Add 'permanently_failed' to `processing_status` enum
- [ ] npm run typecheck passes

### US-006: Manual Retry UI
**Description:** As a user, I want to manually retry failed summaries from the content detail page so I can fix issues after they're resolved.

**Acceptance Criteria:**
- [ ] Add "Retry Summary" button on content detail page when status is 'failed' or 'permanently_failed'
- [ ] Button calls `POST /api/content/[id]/retry` endpoint
- [ ] Endpoint resets `retry_count` to 0 and `processing_status` to 'pending'
- [ ] Triggers immediate summarization attempt
- [ ] Shows loading state during retry
- [ ] Shows success/error toast after attempt
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Auto-Summarize Toggle Per Subscription
**Description:** As a user, I want to disable auto-summarization for specific subscriptions so I can control API usage.

**Acceptance Criteria:**
- [ ] `auto_summarize` field already exists in `subscriptions` table (default true)
- [ ] In `auto-summarize.ts`, join with subscriptions to check `auto_summarize` flag
- [ ] Only auto-summarize content from subscriptions where `auto_summarize = true`
- [ ] Add toggle switch to subscription card in subscriptions page
- [ ] Toggle calls `PATCH /api/subscriptions/[id]` with `{ autoSummarize: boolean }`
- [ ] Show visual indicator (sparkle icon) when auto-summarize is enabled
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Processing Status UI Indicators
**Description:** As a user, I want to see the processing status of content items so I know what's been summarized, pending, or failed.

**Acceptance Criteria:**
- [ ] Add status badge to ArticleCard and PodcastCard components
- [ ] Badge variants: 'pending' (yellow), 'processing' (blue pulse), 'completed' (green), 'failed' (red), 'skipped' (gray)
- [ ] Only show badge for non-completed statuses (don't clutter successful items)
- [ ] On content detail page, show full status with timestamp
- [ ] For 'skipped' status, show reason: "Content too short for summary"
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Database Migration
**Description:** As a developer, I need to add new columns and enum values to support the enhanced processing pipeline.

**Acceptance Criteria:**
- [ ] Create migration file `003_processing_pipeline.sql`
- [ ] Add `retry_count` (int, default 0) to `content_items`
- [ ] Add `last_retry_at` (timestamptz, nullable) to `content_items`
- [ ] Add `content_source` (text, nullable) to `content_items` - values: 'rss', 'fetched'
- [ ] Add `is_summarizable` (boolean, default true) to `content_items`
- [ ] Alter `processing_status` enum to add 'skipped', 'permanently_failed'
- [ ] Add index on `processing_status` for efficient queries
- [ ] Migration runs successfully on Supabase
- [ ] npm run typecheck passes

### US-010: Enhanced Sync Logging
**Description:** As a developer, I want detailed logging during sync so I can debug issues and monitor pipeline health.

**Acceptance Criteria:**
- [ ] Add structured logging with levels: debug, info, warn, error
- [ ] Log: source name, items found, items added, items skipped, items failed
- [ ] Log: content length before/after extraction, fetch attempts
- [ ] Log: summarization attempts, token usage, processing time
- [ ] Store sync results in `processing_jobs` table for history
- [ ] Add `/api/admin/sync-history` endpoint to retrieve recent sync jobs
- [ ] npm run typecheck passes

## Functional Requirements

- FR-1: Content extraction must use DOM parsing, not regex, for HTML
- FR-2: Content selectors must be tried in priority order to find main article body
- FR-3: Full article must be fetched if RSS content is < 300 words
- FR-4: Article fetching must respect rate limits (1 req/sec per domain)
- FR-5: Podcasts must combine all text sources (summary, description, content:encoded)
- FR-6: Items with < 300 words (articles) or < 500 words (podcasts) must be marked 'skipped'
- FR-7: Failed items must retry up to 3 times with exponential backoff
- FR-8: After 3 failures, items must be marked 'permanently_failed'
- FR-9: Manual retry must reset retry count and attempt immediately
- FR-10: Auto-summarization must respect per-subscription `auto_summarize` setting
- FR-11: Processing status must be visible in UI cards and detail pages
- FR-12: All sync operations must be logged with structured data

## Non-Goals (Out of Scope)

- Podcast audio transcription (using Whisper or similar) - deferred to future phase
- Newsletter email ingestion - separate feature
- Full-text search on extracted content - already exists
- User-configurable word thresholds - using fixed values for now
- Paywall bypass or authentication for article fetching
- Caching of fetched articles beyond database storage

## Technical Considerations

### Dependencies to Add
- `cheerio` or `linkedom` for DOM parsing (cheerio recommended - lighter weight)
- No new dependencies for fetching (use native fetch)

### Database Changes
- New enum values require careful migration (Postgres enum alterations)
- Consider using text field with check constraint instead of enum for flexibility

### Performance
- Full article fetching adds latency - run in background after initial sync
- Rate limiting per domain prevents being blocked
- Batch processing prevents API timeouts

### Existing Code to Modify
- `src/lib/content/extractor.ts` - complete rewrite
- `src/lib/sync/content-sync.ts` - add full article fetching
- `src/lib/sync/auto-summarize.ts` - add retry logic, subscription check
- `src/app/api/content/[id]/route.ts` - add retry endpoint
- `src/components/content/article-card.tsx` - add status badge
- `src/components/content/podcast-card.tsx` - add status badge
- `src/app/(main)/subscriptions/page.tsx` - add auto-summarize toggle

### File Structure
```
src/lib/
├── content/
│   ├── extractor.ts      # Rewrite with DOM parsing
│   ├── fetcher.ts        # NEW: Full article fetching
│   └── config.ts         # NEW: Thresholds and constants
├── sync/
│   ├── content-sync.ts   # Add fetch logic
│   └── auto-summarize.ts # Add retry, subscription check
└── summarization/
    └── config.ts         # NEW: Summarization constants
```

## Success Metrics

- Article extraction accuracy: >90% of articles have main content extracted (not nav/footer)
- Content coverage: >80% of synced articles have >300 words extracted
- Summarization success rate: >95% of summarizable items get summaries
- Retry effectiveness: >50% of failed items succeed on retry
- No increase in API errors or timeouts

## Open Questions

1. Should we store the fetched HTML separately from RSS content for debugging?
2. What User-Agent string should we use for fetching? (Current: "Rewind/1.0")
3. Should failed items be hidden from the feed by default?
4. How long should we keep 'permanently_failed' items before cleanup?

---

## Implementation Order

Recommended sequence for implementation:

1. **US-009**: Database migration (required for other stories)
2. **US-001**: HTML content extraction (core fix)
3. **US-004**: Minimum content threshold (config)
4. **US-002**: Full article fetching (depends on US-001)
5. **US-003**: Podcast content processing
6. **US-005**: Retry logic
7. **US-007**: Auto-summarize toggle
8. **US-006**: Manual retry UI
9. **US-008**: Processing status UI
10. **US-010**: Enhanced logging

---

*PRD Version: 1.0*
*Created: January 2025*
