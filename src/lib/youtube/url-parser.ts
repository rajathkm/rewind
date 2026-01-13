/**
 * YouTube URL parsing and validation utilities
 */

// Supported YouTube URL patterns
const YOUTUBE_URL_PATTERNS = [
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
  // Short URL: youtu.be/VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  // Embed URL: youtube.com/embed/VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  // Shorts URL: youtube.com/shorts/VIDEO_ID
  /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  // Mobile URL: m.youtube.com/watch?v=VIDEO_ID
  /^(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
  // YouTube Music: music.youtube.com/watch?v=VIDEO_ID
  /^(?:https?:\/\/)?music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
];

export interface YouTubeVideoInfo {
  videoId: string;
  url: string;
  isValid: true;
}

export interface YouTubeValidationError {
  isValid: false;
  error: string;
}

export type YouTubeValidationResult = YouTubeVideoInfo | YouTubeValidationError;

/**
 * Check if a URL is a valid YouTube video URL
 */
export function isYouTubeUrl(url: string): boolean {
  const normalizedUrl = url.trim();
  return YOUTUBE_URL_PATTERNS.some((pattern) => pattern.test(normalizedUrl));
}

/**
 * Extract video ID from a YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const normalizedUrl = url.trim();

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = normalizedUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Also try to extract from URL parameters for edge cases
  try {
    const urlObj = new URL(
      normalizedUrl.startsWith("http") ? normalizedUrl : `https://${normalizedUrl}`
    );
    const videoId = urlObj.searchParams.get("v");
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return videoId;
    }
  } catch {
    // Invalid URL
  }

  return null;
}

/**
 * Validate a YouTube URL and return video information
 */
export function validateYouTubeUrl(url: string): YouTubeValidationResult {
  if (!url || typeof url !== "string") {
    return {
      isValid: false,
      error: "URL is required",
    };
  }

  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    return {
      isValid: false,
      error: "URL is required",
    };
  }

  const videoId = extractVideoId(normalizedUrl);

  if (!videoId) {
    return {
      isValid: false,
      error:
        "Invalid YouTube URL. Please use a valid youtube.com/watch or youtu.be URL.",
    };
  }

  // Construct a normalized URL
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    videoId,
    url: canonicalUrl,
    isValid: true,
  };
}

/**
 * Get the thumbnail URL for a YouTube video
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: "default" | "medium" | "high" | "standard" | "maxres" = "high"
): string {
  const qualityMap = {
    default: "default",
    medium: "mqdefault",
    high: "hqdefault",
    standard: "sddefault",
    maxres: "maxresdefault",
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Get the embed URL for a YouTube video
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
