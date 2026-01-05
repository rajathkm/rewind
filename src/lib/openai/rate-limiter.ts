interface RateLimitState {
  requests: number[];
  tokens: number[];
}

interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
}

const DEFAULT_LIMITS: RateLimitConfig = {
  requestsPerMinute: 500, // GPT-4o Tier 1
  tokensPerMinute: 30000, // GPT-4o Tier 1
};

class RateLimiter {
  private state: RateLimitState = {
    requests: [],
    tokens: [],
  };
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_LIMITS, ...config };
  }

  private cleanOldEntries(entries: number[]): number[] {
    const oneMinuteAgo = Date.now() - 60000;
    return entries.filter((timestamp) => timestamp > oneMinuteAgo);
  }

  private getRequestCount(): number {
    this.state.requests = this.cleanOldEntries(this.state.requests);
    return this.state.requests.length;
  }

  private getTokenCount(): number {
    this.state.tokens = this.cleanOldEntries(this.state.tokens);
    return this.state.tokens.reduce((sum, count) => sum + count, 0);
  }

  canMakeRequest(estimatedTokens: number): boolean {
    const currentRequests = this.getRequestCount();
    const currentTokens = this.getTokenCount();

    return (
      currentRequests < this.config.requestsPerMinute &&
      currentTokens + estimatedTokens <= this.config.tokensPerMinute
    );
  }

  async waitForCapacity(estimatedTokens: number): Promise<void> {
    while (!this.canMakeRequest(estimatedTokens)) {
      // Calculate wait time based on oldest entry
      const oldestRequest = Math.min(
        ...this.state.requests,
        ...this.state.tokens.map(() => Date.now())
      );
      const waitTime = Math.max(1000, oldestRequest + 60000 - Date.now() + 100);
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 5000)));
    }
  }

  recordRequest(tokensUsed: number): void {
    const now = Date.now();
    this.state.requests.push(now);
    this.state.tokens.push(tokensUsed);
  }

  getRemainingCapacity(): { requests: number; tokens: number } {
    return {
      requests: this.config.requestsPerMinute - this.getRequestCount(),
      tokens: this.config.tokensPerMinute - this.getTokenCount(),
    };
  }

  getUsageStats(): {
    requestsUsed: number;
    tokensUsed: number;
    requestsLimit: number;
    tokensLimit: number;
  } {
    return {
      requestsUsed: this.getRequestCount(),
      tokensUsed: this.getTokenCount(),
      requestsLimit: this.config.requestsPerMinute,
      tokensLimit: this.config.tokensPerMinute,
    };
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

export function getRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter(config);
  }
  return rateLimiter;
}

export function resetRateLimiter(): void {
  rateLimiter = null;
}

export type { RateLimitConfig, RateLimiter };
