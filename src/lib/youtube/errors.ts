/**
 * YouTube-specific error types and error handling utilities
 *
 * Provides detailed error classification for YouTube API operations
 * to enable appropriate user feedback and retry logic.
 */

export enum YouTubeErrorCode {
  // Video availability errors
  VIDEO_NOT_FOUND = "VIDEO_NOT_FOUND",
  VIDEO_PRIVATE = "VIDEO_PRIVATE",
  VIDEO_DELETED = "VIDEO_DELETED",
  VIDEO_UNAVAILABLE = "VIDEO_UNAVAILABLE",

  // Access restriction errors
  AGE_RESTRICTED = "AGE_RESTRICTED",
  REGION_RESTRICTED = "REGION_RESTRICTED",
  REQUIRES_PAYMENT = "REQUIRES_PAYMENT",
  REQUIRES_MEMBERSHIP = "REQUIRES_MEMBERSHIP",
  COPYRIGHT_BLOCKED = "COPYRIGHT_BLOCKED",

  // Caption-related errors
  CAPTIONS_DISABLED = "CAPTIONS_DISABLED",
  NO_CAPTIONS_AVAILABLE = "NO_CAPTIONS_AVAILABLE",
  CAPTION_FETCH_FAILED = "CAPTION_FETCH_FAILED",

  // Network/Rate errors
  RATE_LIMITED = "RATE_LIMITED",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",

  // Generic errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  PARSE_ERROR = "PARSE_ERROR",
}

export interface YouTubeErrorDetails {
  code: YouTubeErrorCode;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  httpStatus?: number;
  videoId?: string;
}

export class YouTubeError extends Error {
  public readonly code: YouTubeErrorCode;
  public readonly userMessage: string;
  public readonly isRetryable: boolean;
  public readonly httpStatus?: number;
  public readonly videoId?: string;

  constructor(details: YouTubeErrorDetails) {
    super(details.message);
    this.name = "YouTubeError";
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.isRetryable = details.isRetryable;
    this.httpStatus = details.httpStatus;
    this.videoId = details.videoId;
  }

  toJSON(): YouTubeErrorDetails {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      isRetryable: this.isRetryable,
      httpStatus: this.httpStatus,
      videoId: this.videoId,
    };
  }
}

/**
 * Error messages for user-facing display
 */
const ERROR_USER_MESSAGES: Record<YouTubeErrorCode, string> = {
  [YouTubeErrorCode.VIDEO_NOT_FOUND]:
    "This video could not be found. It may have been deleted.",
  [YouTubeErrorCode.VIDEO_PRIVATE]:
    "This video is private and cannot be accessed.",
  [YouTubeErrorCode.VIDEO_DELETED]:
    "This video has been deleted and is no longer available.",
  [YouTubeErrorCode.VIDEO_UNAVAILABLE]:
    "This video is currently unavailable. Please try again later.",
  [YouTubeErrorCode.AGE_RESTRICTED]:
    "This video is age-restricted and cannot be processed without authentication.",
  [YouTubeErrorCode.REGION_RESTRICTED]:
    "This video is not available in this region.",
  [YouTubeErrorCode.REQUIRES_PAYMENT]:
    "This video requires purchase or rental to access.",
  [YouTubeErrorCode.REQUIRES_MEMBERSHIP]:
    "This video is only available to channel members.",
  [YouTubeErrorCode.COPYRIGHT_BLOCKED]:
    "This video is blocked due to copyright restrictions.",
  [YouTubeErrorCode.CAPTIONS_DISABLED]:
    "The video owner has disabled captions for this video.",
  [YouTubeErrorCode.NO_CAPTIONS_AVAILABLE]:
    "No captions are available for this video.",
  [YouTubeErrorCode.CAPTION_FETCH_FAILED]:
    "Failed to retrieve captions. Please try again.",
  [YouTubeErrorCode.RATE_LIMITED]:
    "Too many requests. Please wait a moment and try again.",
  [YouTubeErrorCode.NETWORK_ERROR]:
    "Network error occurred. Please check your connection.",
  [YouTubeErrorCode.TIMEOUT]:
    "Request timed out. Please try again.",
  [YouTubeErrorCode.UNKNOWN_ERROR]:
    "An unexpected error occurred. Please try again.",
  [YouTubeErrorCode.PARSE_ERROR]:
    "Failed to process video data. Please try again.",
};

/**
 * Determines if an error code represents a retryable error
 */
const RETRYABLE_ERRORS: Set<YouTubeErrorCode> = new Set([
  YouTubeErrorCode.RATE_LIMITED,
  YouTubeErrorCode.NETWORK_ERROR,
  YouTubeErrorCode.TIMEOUT,
  YouTubeErrorCode.VIDEO_UNAVAILABLE,
  YouTubeErrorCode.CAPTION_FETCH_FAILED,
]);

/**
 * Create a YouTubeError from an error code
 */
export function createYouTubeError(
  code: YouTubeErrorCode,
  options: {
    message?: string;
    httpStatus?: number;
    videoId?: string;
  } = {}
): YouTubeError {
  return new YouTubeError({
    code,
    message: options.message || ERROR_USER_MESSAGES[code],
    userMessage: ERROR_USER_MESSAGES[code],
    isRetryable: RETRYABLE_ERRORS.has(code),
    httpStatus: options.httpStatus,
    videoId: options.videoId,
  });
}

/**
 * Classify an HTTP status code into a YouTubeErrorCode
 */
export function classifyHttpError(
  status: number,
  videoId?: string
): YouTubeError {
  switch (status) {
    case 400:
      return createYouTubeError(YouTubeErrorCode.UNKNOWN_ERROR, {
        message: `Bad request (${status})`,
        httpStatus: status,
        videoId,
      });
    case 401:
    case 403:
      // Could be age-restricted, region-restricted, or private
      return createYouTubeError(YouTubeErrorCode.VIDEO_UNAVAILABLE, {
        message: `Access denied (${status})`,
        httpStatus: status,
        videoId,
      });
    case 404:
      return createYouTubeError(YouTubeErrorCode.VIDEO_NOT_FOUND, {
        message: `Video not found (${status})`,
        httpStatus: status,
        videoId,
      });
    case 410:
      return createYouTubeError(YouTubeErrorCode.VIDEO_DELETED, {
        message: `Video deleted (${status})`,
        httpStatus: status,
        videoId,
      });
    case 429:
      return createYouTubeError(YouTubeErrorCode.RATE_LIMITED, {
        message: `Rate limited (${status})`,
        httpStatus: status,
        videoId,
      });
    case 500:
    case 502:
    case 503:
    case 504:
      return createYouTubeError(YouTubeErrorCode.VIDEO_UNAVAILABLE, {
        message: `Server error (${status})`,
        httpStatus: status,
        videoId,
      });
    default:
      return createYouTubeError(YouTubeErrorCode.UNKNOWN_ERROR, {
        message: `HTTP error (${status})`,
        httpStatus: status,
        videoId,
      });
  }
}

/**
 * Detect specific error types from YouTube page HTML content
 */
export function detectErrorFromHtml(
  html: string,
  videoId?: string
): YouTubeError | null {
  // Check for age restriction
  if (
    html.includes("Sign in to confirm your age") ||
    html.includes("age-restricted") ||
    html.includes('"isAgeRestricted":true') ||
    html.includes("CONTENT_CHECK_REQUIRED")
  ) {
    return createYouTubeError(YouTubeErrorCode.AGE_RESTRICTED, { videoId });
  }

  // Check for region restriction
  if (
    html.includes("not available in your country") ||
    html.includes("blocked it in your country") ||
    html.includes('"isUnplayable":true') ||
    html.includes("VIDEO_UNAVAILABLE_IN_YOUR_REGION")
  ) {
    return createYouTubeError(YouTubeErrorCode.REGION_RESTRICTED, { videoId });
  }

  // Check for private video
  if (
    html.includes("This video is private") ||
    html.includes('"isPrivate":true')
  ) {
    return createYouTubeError(YouTubeErrorCode.VIDEO_PRIVATE, { videoId });
  }

  // Check for deleted/removed video
  if (
    html.includes("This video has been removed") ||
    html.includes("Video unavailable") ||
    html.includes('"status":"ERROR"')
  ) {
    return createYouTubeError(YouTubeErrorCode.VIDEO_DELETED, { videoId });
  }

  // Check for membership requirement
  if (
    html.includes("Join this channel to get access") ||
    html.includes("members-only")
  ) {
    return createYouTubeError(YouTubeErrorCode.REQUIRES_MEMBERSHIP, { videoId });
  }

  // Check for payment requirement
  if (
    html.includes("requires payment") ||
    html.includes("purchase or rent")
  ) {
    return createYouTubeError(YouTubeErrorCode.REQUIRES_PAYMENT, { videoId });
  }

  // Check for copyright block
  if (
    html.includes("blocked on copyright grounds") ||
    html.includes("copyright claim")
  ) {
    return createYouTubeError(YouTubeErrorCode.COPYRIGHT_BLOCKED, { videoId });
  }

  // Check if captions are disabled
  if (
    html.includes('"captionsDisabled":true') ||
    html.includes("captions have been disabled")
  ) {
    return createYouTubeError(YouTubeErrorCode.CAPTIONS_DISABLED, { videoId });
  }

  return null;
}

/**
 * Wrap an unknown error into a YouTubeError
 */
export function wrapError(
  error: unknown,
  videoId?: string
): YouTubeError {
  if (error instanceof YouTubeError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error types
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return createYouTubeError(YouTubeErrorCode.TIMEOUT, {
        message: error.message,
        videoId,
      });
    }

    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.name === "TypeError"
    ) {
      return createYouTubeError(YouTubeErrorCode.NETWORK_ERROR, {
        message: error.message,
        videoId,
      });
    }

    return createYouTubeError(YouTubeErrorCode.UNKNOWN_ERROR, {
      message: error.message,
      videoId,
    });
  }

  return createYouTubeError(YouTubeErrorCode.UNKNOWN_ERROR, {
    message: String(error),
    videoId,
  });
}

/**
 * HTTP status code to API response status mapping
 */
export function getHttpStatusForError(code: YouTubeErrorCode): number {
  switch (code) {
    case YouTubeErrorCode.VIDEO_NOT_FOUND:
    case YouTubeErrorCode.VIDEO_DELETED:
      return 404;
    case YouTubeErrorCode.VIDEO_PRIVATE:
    case YouTubeErrorCode.AGE_RESTRICTED:
    case YouTubeErrorCode.REGION_RESTRICTED:
    case YouTubeErrorCode.REQUIRES_PAYMENT:
    case YouTubeErrorCode.REQUIRES_MEMBERSHIP:
    case YouTubeErrorCode.COPYRIGHT_BLOCKED:
      return 403;
    case YouTubeErrorCode.CAPTIONS_DISABLED:
    case YouTubeErrorCode.NO_CAPTIONS_AVAILABLE:
      return 422;
    case YouTubeErrorCode.RATE_LIMITED:
      return 429;
    case YouTubeErrorCode.TIMEOUT:
    case YouTubeErrorCode.VIDEO_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}
