/**
 * YouTube module exports
 *
 * Provides YouTube video processing capabilities including:
 * - URL validation and parsing
 * - Transcript extraction with retry logic
 * - Rate limiting to prevent being blocked
 * - Comprehensive error handling
 */

export {
  isYouTubeUrl,
  extractVideoId,
  validateYouTubeUrl,
  getYouTubeThumbnailUrl,
  getYouTubeEmbedUrl,
  type YouTubeVideoInfo,
  type YouTubeValidationError,
  type YouTubeValidationResult,
} from "./url-parser";

export {
  fetchYouTubeVideoData,
  type YouTubeVideoMetadata,
  type YouTubeTranscript,
  type TranscriptSegment,
  type YouTubeVideoData,
} from "./transcript";

// Error handling exports
export {
  YouTubeError,
  YouTubeErrorCode,
  createYouTubeError,
  classifyHttpError,
  detectErrorFromHtml,
  wrapError,
  getHttpStatusForError,
  type YouTubeErrorDetails,
} from "./errors";

// Rate limiter exports
export {
  getYouTubeRateLimiter,
  resetYouTubeRateLimiter,
  type RateLimitConfig,
  type YouTubeRateLimiter,
} from "./rate-limiter";

// Fetch utilities with retry
export {
  fetchWithRetry,
  fetchJsonWithRetry,
  fetchTextWithRetry,
  fetchHtmlWithRetry,
  type FetchWithRetryOptions,
} from "./fetch-with-retry";
