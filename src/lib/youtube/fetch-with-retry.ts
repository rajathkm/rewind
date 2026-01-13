/**
 * YouTube fetch utility with retry logic and exponential backoff
 *
 * Provides robust fetching for YouTube API calls with:
 * - Rate limiting integration
 * - Automatic retries with exponential backoff
 * - Timeout handling
 * - Error classification
 */

import { getYouTubeRateLimiter } from "./rate-limiter";
import {
  YouTubeError,
  YouTubeErrorCode,
  classifyHttpError,
  detectErrorFromHtml,
  createYouTubeError,
  wrapError,
} from "./errors";

export interface FetchWithRetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  videoId?: string;
  checkHtmlForErrors?: boolean;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);

  // Add jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);

  // Clamp to max delay
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Perform a fetch request with rate limiting, retries, and error handling
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  fetchOptions: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    videoId,
    checkHtmlForErrors = false,
  } = fetchOptions;

  const rateLimiter = getYouTubeRateLimiter();
  let lastError: YouTubeError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait for rate limit capacity
      await rateLimiter.waitForCapacity();

      // Record the request before making it
      rateLimiter.recordRequest();

      // Make the request with timeout
      const response = await fetchWithTimeout(url, options, timeoutMs);

      // Check for HTTP errors
      if (!response.ok) {
        const error = classifyHttpError(response.status, videoId);

        // If not retryable, throw immediately
        if (!error.isRetryable) {
          throw error;
        }

        // If rate limited, use longer delay
        if (error.code === YouTubeErrorCode.RATE_LIMITED) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter
            ? parseInt(retryAfter) * 1000
            : calculateBackoffDelay(attempt + 2); // Longer delay for rate limits
          console.log(
            `[YouTube] Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          lastError = error;
          continue;
        }

        lastError = error;

        // For other retryable errors, use standard backoff
        if (attempt < maxRetries) {
          const delay = calculateBackoffDelay(attempt);
          console.log(
            `[YouTube] HTTP ${response.status}, retrying in ${delay}ms (${attempt + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }

      // Optionally check HTML content for error indicators
      if (checkHtmlForErrors && response.headers.get("content-type")?.includes("text/html")) {
        // Clone response so we can read body multiple times
        const clonedResponse = response.clone();
        const html = await clonedResponse.text();
        const htmlError = detectErrorFromHtml(html, videoId);

        if (htmlError) {
          // If the error is retryable and we have attempts left
          if (htmlError.isRetryable && attempt < maxRetries) {
            const delay = calculateBackoffDelay(attempt);
            console.log(
              `[YouTube] Detected ${htmlError.code} in HTML, retrying in ${delay}ms (${attempt + 1}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            lastError = htmlError;
            continue;
          }

          throw htmlError;
        }
      }

      // Success - return the response
      return response;
    } catch (error) {
      // Handle abort/timeout
      if (error instanceof Error && error.name === "AbortError") {
        lastError = createYouTubeError(YouTubeErrorCode.TIMEOUT, {
          message: `Request timed out after ${timeoutMs}ms`,
          videoId,
        });

        if (attempt < maxRetries) {
          const delay = calculateBackoffDelay(attempt);
          console.log(
            `[YouTube] Timeout, retrying in ${delay}ms (${attempt + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Wrap non-YouTube errors
      if (!(error instanceof YouTubeError)) {
        lastError = wrapError(error, videoId);

        // Retry network errors
        if (
          lastError.isRetryable &&
          attempt < maxRetries
        ) {
          const delay = calculateBackoffDelay(attempt);
          console.log(
            `[YouTube] ${lastError.code}, retrying in ${delay}ms (${attempt + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // Re-throw YouTube errors or wrapped errors
      throw lastError || error;
    }
  }

  // Should never reach here, but just in case
  throw lastError || createYouTubeError(YouTubeErrorCode.UNKNOWN_ERROR, { videoId });
}

/**
 * Fetch JSON data with retry logic
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options: RequestInit = {},
  fetchOptions: FetchWithRetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options, fetchOptions);

  try {
    return await response.json();
  } catch {
    throw createYouTubeError(YouTubeErrorCode.PARSE_ERROR, {
      message: "Failed to parse JSON response",
      videoId: fetchOptions.videoId,
    });
  }
}

/**
 * Fetch text content with retry logic
 */
export async function fetchTextWithRetry(
  url: string,
  options: RequestInit = {},
  fetchOptions: FetchWithRetryOptions = {}
): Promise<string> {
  const response = await fetchWithRetry(url, options, fetchOptions);

  try {
    return await response.text();
  } catch {
    throw createYouTubeError(YouTubeErrorCode.PARSE_ERROR, {
      message: "Failed to read response text",
      videoId: fetchOptions.videoId,
    });
  }
}

/**
 * Fetch HTML and check for errors, with retry logic
 */
export async function fetchHtmlWithRetry(
  url: string,
  options: RequestInit = {},
  fetchOptions: FetchWithRetryOptions = {}
): Promise<{ html: string; response: Response }> {
  const response = await fetchWithRetry(url, options, {
    ...fetchOptions,
    checkHtmlForErrors: true,
  });

  // Clone response since we might have already read it for error checking
  const html = await response.clone().text();

  // Double-check for errors in the HTML content
  const htmlError = detectErrorFromHtml(html, fetchOptions.videoId);
  if (htmlError && !htmlError.isRetryable) {
    throw htmlError;
  }

  return { html, response };
}
