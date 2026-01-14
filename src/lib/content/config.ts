/**
 * Content Processing Configuration
 * Constants for content extraction and summarization thresholds
 */

// Minimum word count thresholds for summarization
// Lowered to allow more content to be summarized (RSS often has truncated content)
export const MIN_WORDS_FOR_SUMMARY = 100;
export const MIN_WORDS_FOR_PODCAST_SUMMARY = 200;

// Reading speed for time estimation (words per minute)
export const READING_SPEED_WPM = 200;

// Content selectors in priority order - first match with >100 chars is used
export const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content-body',
  '.post-body',
  '.story-body',
  '#content',
  'main',
] as const;

// Elements to remove before content extraction (noise/boilerplate)
export const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'header',
  'footer',
  'aside',
  '.nav',
  '.navigation',
  '.menu',
  '.sidebar',
  '.ads',
  '.ad',
  '.advertisement',
  '.comments',
  '.comment-section',
  '.social-share',
  '.social-sharing',
  '.share-buttons',
  '.related-posts',
  '.related-articles',
  '.newsletter-signup',
  '.subscription-form',
  '.cookie-banner',
  '.popup',
  '.modal',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
] as const;

// Minimum content length (characters) to consider a selector match valid
export const MIN_CONTENT_LENGTH = 100;

// Article fetching configuration
export const FETCH_TIMEOUT_MS = 10000;
export const MAX_REDIRECTS = 3;
export const USER_AGENT = 'Rewind/1.0 (+https://rewind.app)';

// Rate limiting for article fetching
export const RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests per domain
