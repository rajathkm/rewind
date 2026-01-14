# Product Requirements Document: YouTube Video Summarization

## Overview

### Problem Statement
Users currently can summarize articles and podcasts in Rewind, but cannot process YouTube video content. YouTube is a major source of educational, informational, and entertainment content that users want to capture and reference later.

### Solution
Extend the existing AI summarization pipeline to support YouTube videos by extracting transcripts and generating summaries in the same format as podcasts (with speakers and timeline information).

### Success Metrics
- Number of YouTube videos successfully summarized
- Transcript extraction success rate
- User engagement with video summaries (views, saves)
- Error rate for failed video processing

---

## Scope

### In Scope (MVP)
- Manual YouTube video URL submission
- Transcript extraction using YouTube captions (manual/uploaded preferred, auto-generated fallback)
- AI-powered summarization with podcast-style output (headline, TLDR, key points, takeaways, speakers, timeline)
- No video length limits
- Storage and display of video summaries alongside existing content types

### Out of Scope (Future Phases)
- YouTube channel subscriptions
- YouTube playlist subscriptions
- Third-party transcription services (premium feature)
- Video thumbnail/preview extraction
- Embedded video player in summary view

---

## User Stories

### US-1: Submit YouTube Video for Summarization
**As a** user  
**I want to** paste a YouTube video URL  
**So that** I can get an AI-generated summary of the video content

**Acceptance Criteria:**
- User can paste a valid YouTube URL (youtube.com/watch, youtu.be formats)
- System validates the URL before processing
- User sees processing status while video is being summarized
- Summary appears in user's content feed upon completion

### US-2: View YouTube Video Summary
**As a** user  
**I want to** view a summary of a YouTube video  
**So that** I can quickly understand the video's content without watching it

**Acceptance Criteria:**
- Summary displays in podcast-style format with:
  - Video title and channel name
  - Thumbnail image
  - TLDR summary
  - Key points and takeaways
  - Speaker identification (when multiple speakers detected)
  - Timeline/chapter breakdown
- Link to original YouTube video is accessible
- Content type is clearly identified as "YouTube Video"

### US-3: Handle Videos Without Captions
**As a** user  
**I want to** be informed when a video cannot be summarized  
**So that** I understand why processing failed

**Acceptance Criteria:**
- Clear error message when video has no captions available
- Suggestion to try a different video
- Failed attempts do not appear in content feed

---

## Technical Requirements

### TR-1: YouTube URL Parsing
- Support URL formats:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://youtube.com/watch?v=VIDEO_ID&t=123` (with timestamps)
- Extract video ID from URL for API calls

### TR-2: Transcript Extraction
- Use YouTube Data API or transcript extraction library (e.g., `youtube-transcript-api`)
- Priority order for caption tracks:
  1. Manually uploaded captions (any language, prefer English)
  2. Auto-generated captions
- Handle videos with no captions gracefully (error state)
- Store raw transcript for potential re-processing

### TR-3: Content Processing Pipeline Integration
- Create new content type: `youtube_video`
- Extend existing `ContentProcessor` to handle video transcripts
- Use same AI summarization prompts as podcasts (adapted for video context)
- Store video metadata:
  - Video ID
  - Title
  - Channel name
  - Channel ID
  - Duration
  - Publish date
  - Thumbnail URL

### TR-4: Database Schema Updates
- Add `youtube_video` to content type enum
- Add video-specific fields to content table or create related table:
  - `video_id` (YouTube video ID)
  - `channel_name`
  - `channel_id`
  - `duration_seconds`
  - `transcript_source` (manual/auto-generated)

### TR-5: API Endpoints
- `POST /api/content/youtube` - Submit YouTube URL for processing
  - Request: `{ url: string }`
  - Response: `{ contentId: string, status: 'processing' | 'completed' | 'failed' }`
- Extend existing content endpoints to return YouTube video summaries

### TR-6: Rate Limiting & Error Handling
- Implement rate limiting for YouTube API calls
- Handle common errors:
  - Video not found (deleted/private)
  - Captions disabled
  - Age-restricted content
  - Region-restricted content
- Retry logic for transient failures

---

## UI/UX Requirements

### UX-1: URL Submission
- Add YouTube option to content submission interface
- URL input field with paste support
- Real-time URL validation with visual feedback
- Processing indicator while video is being summarized

### UX-2: Content Display
- YouTube videos appear in content feed with distinct visual indicator
- Video thumbnail displayed prominently
- Duration badge on thumbnail
- Channel name displayed below title
- "Watch on YouTube" link in summary view

### UX-3: Summary Format
- Match existing podcast summary structure:
  - Headline/Title
  - TLDR (2-3 sentences)
  - Key Points (bulleted list)
  - Key Takeaways (actionable insights)
  - Speakers (if multiple detected)
  - Timeline/Chapters (with approximate timestamps)

---

## Dependencies

- YouTube Data API access (or transcript extraction library)
- Existing AI summarization infrastructure (Claude API)
- Existing content processing pipeline
- Database migration capability

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube API rate limits | Processing delays | Implement queuing, respect rate limits |
| Videos without captions | Poor user experience | Clear error messaging, filter unsupported videos |
| Long videos = high token costs | Increased API costs | Monitor usage, consider chunking for very long videos |
| Transcript quality (auto-generated) | Lower summary quality | Prefer manual captions, set quality expectations |
| YouTube ToS compliance | Service disruption | Review ToS, use official APIs where possible |

---

## Implementation Phases

### Phase 1: MVP (This PRD)
- Manual URL submission
- YouTube caption extraction
- Podcast-style summaries
- Basic error handling

### Phase 2: Enhanced Features (Future)
- Channel subscriptions
- Playlist support
- Improved speaker detection
- Timestamp linking to video

### Phase 3: Premium Features (Future)
- Third-party transcription for videos without captions
- Multi-language support
- Video clip extraction

---

## Open Questions

1. Should we store/cache video thumbnails locally or hotlink to YouTube?
2. What is the maximum video duration we should reasonably support before warning users about processing time?
3. Should we attempt speaker diarization from transcript, or rely on AI inference?