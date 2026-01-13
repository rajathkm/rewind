/**
 * YouTube API rate limiter
 *
 * Implements rate limiting for YouTube API calls to prevent being blocked.
 * Uses a token bucket algorithm with per-minute limits.
 */

interface RateLimitState {
  requests: number[];
}

interface RateLimitConfig {
  requestsPerMinute: number;
  minDelayMs: number;
}

// Conservative limits for YouTube web scraping
// YouTube doesn't have official public rate limits, but we use conservative values
const DEFAULT_LIMITS: RateLimitConfig = {
  requestsPerMinute: 30, // Conservative: ~0.5 requests/second
  minDelayMs: 1000, // Minimum 1 second between requests
};

class YouTubeRateLimiter {
  private state: RateLimitState = {
    requests: [],
  };
  private config: RateLimitConfig;
  private lastRequestTime: number = 0;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_LIMITS, ...config };
  }

  private cleanOldEntries(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.state.requests = this.state.requests.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );
  }

  private getRequestCount(): number {
    this.cleanOldEntries();
    return this.state.requests.length;
  }

  canMakeRequest(): boolean {
    const currentRequests = this.getRequestCount();
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;

    return (
      currentRequests < this.config.requestsPerMinute &&
      timeSinceLastRequest >= this.config.minDelayMs
    );
  }

  async waitForCapacity(): Promise<void> {
    // First, ensure minimum delay between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.config.minDelayMs) {
      const delayNeeded = this.config.minDelayMs - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delayNeeded));
    }

    // Then check rate limit
    while (!this.canMakeRequest()) {
      const oldestRequest = Math.min(...this.state.requests);
      const waitTime = Math.max(
        100,
        oldestRequest + 60000 - Date.now() + 100
      );
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(waitTime, 5000))
      );
      this.cleanOldEntries();
    }
  }

  recordRequest(): void {
    const now = Date.now();
    this.state.requests.push(now);
    this.lastRequestTime = now;
  }

  getRemainingCapacity(): number {
    return this.config.requestsPerMinute - this.getRequestCount();
  }

  getUsageStats(): {
    requestsUsed: number;
    requestsLimit: number;
    remainingCapacity: number;
  } {
    return {
      requestsUsed: this.getRequestCount(),
      requestsLimit: this.config.requestsPerMinute,
      remainingCapacity: this.getRemainingCapacity(),
    };
  }

  reset(): void {
    this.state.requests = [];
    this.lastRequestTime = 0;
  }
}

// Singleton instance
let rateLimiter: YouTubeRateLimiter | null = null;

export function getYouTubeRateLimiter(
  config?: Partial<RateLimitConfig>
): YouTubeRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new YouTubeRateLimiter(config);
  }
  return rateLimiter;
}

export function resetYouTubeRateLimiter(): void {
  rateLimiter = null;
}

export type { RateLimitConfig, YouTubeRateLimiter };
