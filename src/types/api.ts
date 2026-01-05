/**
 * API request and response type definitions
 */

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  error?: never;
}

export interface ApiError {
  data?: never;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Source validation
export interface ValidateSourceRequest {
  url: string;
}

export interface ValidateSourceResponse {
  isValid: boolean;
  type: "rss" | "podcast" | "newsletter" | "unknown";
  feedUrl?: string;
  metadata?: {
    title?: string;
    description?: string;
    imageUrl?: string;
    author?: string;
    itemCount?: number;
    lastUpdated?: string;
  };
  error?: string;
}

// Source search
export interface SearchSourcesRequest {
  query: string;
  type?: "rss" | "podcast" | "newsletter";
  limit?: number;
}

export interface SearchSourceResult {
  id?: string;
  type: "rss" | "podcast" | "newsletter";
  title: string;
  description?: string;
  feedUrl: string;
  websiteUrl?: string;
  imageUrl?: string;
  author?: string;
  subscriberCount?: number;
  isAlreadySubscribed?: boolean;
}

// Subscription management
export interface CreateSubscriptionRequest {
  sourceId?: string;
  url?: string;
  folder?: string;
  tags?: string[];
  autoSummarize?: boolean;
}

export interface UpdateSubscriptionRequest {
  customName?: string;
  folder?: string;
  tags?: string[];
  autoSummarize?: boolean;
  status?: "active" | "paused";
}

export interface BulkSubscriptionRequest {
  action: "markRead" | "move" | "delete" | "pause" | "resume";
  subscriptionIds: string[];
  data?: {
    folder?: string;
    tags?: string[];
  };
}

// Content management
export interface ContentFeedRequest extends PaginationParams {
  type?: "article" | "newsletter" | "podcast" | "all";
  sourceId?: string;
  folder?: string;
  unreadOnly?: boolean;
  savedOnly?: boolean;
  hasUnreadSummary?: boolean;
}

export interface UpdateContentStateRequest {
  isRead?: boolean;
  isSaved?: boolean;
  isArchived?: boolean;
  readProgress?: number;
}

// Summary generation
export interface GenerateSummaryRequest {
  contentId: string;
  type?: "brief" | "detailed" | "bullet_points";
  force?: boolean; // Regenerate even if exists
}

export interface SummaryGenerationStatus {
  contentId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  estimatedTimeSeconds?: number;
  error?: string;
}

// OPML import
export interface OPMLImportRequest {
  file: File;
  defaultFolder?: string;
  autoSummarize?: boolean;
}

export interface OPMLImportStatus {
  importId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalFeeds: number;
  processedFeeds: number;
  successfulFeeds: number;
  failedFeeds: number;
  errors?: Array<{
    feedUrl: string;
    error: string;
  }>;
}

// Search
export interface SearchContentRequest {
  query: string;
  type?: "article" | "newsletter" | "podcast" | "all";
  dateRange?: {
    from?: string;
    to?: string;
  };
  sourceIds?: string[];
  limit?: number;
}

export interface SearchContentResult {
  id: string;
  title: string;
  excerpt?: string;
  sourceTitle: string;
  sourceType: "article" | "newsletter" | "podcast";
  publishedAt?: string;
  relevanceScore: number;
  highlights?: {
    title?: string;
    content?: string;
  };
}

// Health check
export interface HealthCheckResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  services: {
    database: "ok" | "error";
    ai: "ok" | "error" | "rate_limited";
    storage: "ok" | "error";
  };
}
