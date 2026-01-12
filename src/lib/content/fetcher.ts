import { FETCH_TIMEOUT_MS, MAX_REDIRECTS, USER_AGENT } from './config';

export interface FetchResult {
  html: string;
  finalUrl: string;
}

/**
 * Fetch full article HTML from a URL
 * Handles redirects, timeouts, and common errors gracefully
 */
export async function fetchFullArticle(url: string): Promise<FetchResult | null> {
  let currentUrl = url;
  let redirectCount = 0;

  try {
    while (redirectCount < MAX_REDIRECTS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          },
          signal: controller.signal,
          redirect: 'manual', // Handle redirects manually to track final URL
        });

        clearTimeout(timeoutId);

        // Handle redirects
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            // Handle relative URLs
            currentUrl = new URL(location, currentUrl).toString();
            redirectCount++;
            continue;
          }
          console.error(`[Fetcher] Redirect without location header: ${currentUrl}`);
          return null;
        }

        // Check for successful response
        if (!response.ok) {
          console.error(`[Fetcher] HTTP ${response.status} for ${currentUrl}`);
          return null;
        }

        // Check content type
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
          console.error(`[Fetcher] Non-HTML content type: ${contentType} for ${currentUrl}`);
          return null;
        }

        // Read response body
        const html = await response.text();

        // Basic validation
        if (!html || html.length < 100) {
          console.error(`[Fetcher] Empty or very short response for ${currentUrl}`);
          return null;
        }

        return {
          html,
          finalUrl: currentUrl,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            console.error(`[Fetcher] Timeout after ${FETCH_TIMEOUT_MS}ms for ${currentUrl}`);
          } else {
            console.error(`[Fetcher] Fetch error for ${currentUrl}: ${fetchError.message}`);
          }
        }
        return null;
      }
    }

    // Too many redirects
    console.error(`[Fetcher] Too many redirects (${MAX_REDIRECTS}) for ${url}`);
    return null;
  } catch (error) {
    console.error(
      `[Fetcher] Unexpected error for ${url}:`,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}

/**
 * Check if a URL is likely to be fetchable
 * Excludes social media, video sites, and other non-article URLs
 */
export function isFetchableUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Skip known non-article sites
    const skipDomains = [
      'youtube.com',
      'youtu.be',
      'twitter.com',
      'x.com',
      'facebook.com',
      'instagram.com',
      'tiktok.com',
      'linkedin.com',
      'reddit.com',
      'vimeo.com',
      'spotify.com',
      'apple.com/podcasts',
      'soundcloud.com',
    ];

    for (const domain of skipDomains) {
      if (hostname.includes(domain)) {
        return false;
      }
    }

    // Skip non-http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL for rate limiting
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}
