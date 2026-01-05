/**
 * Content type definitions for Rewind
 */

// Source types
export type ContentType = "article" | "newsletter" | "rss_post" | "podcast";
export type ContentFormat = "html" | "markdown" | "plaintext" | "audio";
export type SourceType = "rss" | "email" | "api" | "manual";

// Subscription status
export type SubscriptionStatus = "active" | "paused" | "error" | "pending_verification";

// Processing status
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed" | "retrying";

// Content source (feed, podcast, newsletter)
export interface ContentSource {
  id: string;
  sourceType: SourceType;
  contentType: ContentType;
  feedUrl?: string;
  newsletterEmail?: string;
  websiteUrl?: string;
  title: string;
  description?: string;
  author?: string;
  imageUrl?: string;
  language?: string;
  categories?: string[];
  podcastMetadata?: PodcastMetadata;
  lastFetchedAt?: Date;
  lastSuccessfulFetchAt?: Date;
  fetchErrorCount?: number;
  lastErrorMessage?: string;
  isVerified?: boolean;
  subscriberCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Podcast-specific metadata
export interface PodcastMetadata {
  itunesId?: string;
  spotifyId?: string;
  explicit?: boolean;
  episodeCount?: number;
  latestEpisodeDate?: Date;
}

// User subscription to a source
export interface Subscription {
  id: string;
  userId: string;
  sourceId: string;
  source?: ContentSource;
  status: SubscriptionStatus;
  customName?: string;
  folder?: string;
  tags?: string[];
  autoSummarize?: boolean;
  lastReadAt?: Date;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Individual content item (article, episode, etc.)
export interface ContentItem {
  id: string;
  sourceId: string;
  source?: ContentSource;
  contentType: ContentType;
  guid?: string;
  title: string;
  url?: string;
  author?: string;
  contentHtml?: string;
  contentText?: string;
  excerpt?: string;
  mediaUrl?: string;
  mediaType?: string;
  durationSeconds?: number;
  transcript?: string;
  imageUrl?: string;
  publishedAt?: Date;
  categories?: string[];
  processingStatus: ProcessingStatus;
  wordCount?: number;
  readingTimeMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

// User's state for a content item (read, saved, etc.)
export interface UserContentState {
  id: string;
  userId: string;
  contentId: string;
  isRead: boolean;
  isSaved: boolean;
  isArchived: boolean;
  readProgress?: number; // 0-1
  readAt?: Date;
  savedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Content with user state combined
export interface ContentWithState extends ContentItem {
  userState?: UserContentState;
  summary?: Summary;
}

// Feed item for display
export interface FeedItem {
  contentId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: ContentType;
  sourceImageUrl?: string;
  title: string;
  excerpt?: string;
  imageUrl?: string;
  publishedAt?: Date;
  durationSeconds?: number;
  readingTimeMinutes?: number;
  isRead: boolean;
  isSaved: boolean;
  hasSummary: boolean;
}

// Summary output from AI processing
export interface Summary {
  id: string;
  contentId: string;
  summaryType: "brief" | "detailed" | "bullet_points";
  headline: string;
  tldr: string;
  fullSummary: string;
  keyPoints: string[];
  keyTakeaways: KeyTakeaway[];
  relatedIdeas: RelatedIdea[];
  alliedTrivia: TriviaItem[];
  modelUsed?: string;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  processingTimeMs?: number;
  qualityScore?: number;
  createdAt: Date;
}

// Key takeaway from content
export interface KeyTakeaway {
  id: string;
  takeaway: string;
  context: string;
  actionable?: string;
  confidence: number;
  sourceQuote?: string;
}

// Related idea generated from content
export interface RelatedIdea {
  id: string;
  idea: string;
  connection: string;
  category: "extension" | "counterpoint" | "application" | "question";
}

// Trivia item related to content
export interface TriviaItem {
  id: string;
  fact: string;
  relevance: string;
  source?: string;
}

// OPML import result
export interface OPMLImportResult {
  id: string;
  userId: string;
  filename?: string;
  totalFeeds: number;
  processedFeeds: number;
  successfulFeeds: number;
  failedFeeds: number;
  status: ProcessingStatus;
  errorDetails?: Array<{
    feedUrl: string;
    error: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
}
