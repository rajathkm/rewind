/**
 * Structured Sync Logger
 * Provides consistent logging format for sync operations
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
}

interface SyncLogContext {
  sourceId?: string;
  sourceName?: string;
  itemId?: string;
  itemTitle?: string;
  operation?: string;
}

class SyncLogger {
  private context: string;
  private logContext: SyncLogContext;

  constructor(context: string, logContext: SyncLogContext = {}) {
    this.context = context;
    this.logContext = logContext;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data: {
        ...this.logContext,
        ...data,
      },
    };
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry = this.formatMessage(level, message, data);
    const prefix = `[${this.context}]`;
    const contextStr = this.logContext.sourceName
      ? ` [${this.logContext.sourceName}]`
      : "";

    const logFn =
      level === "error"
        ? console.error
        : level === "warn"
        ? console.warn
        : level === "debug"
        ? console.debug
        : console.log;

    if (data && Object.keys(data).length > 0) {
      logFn(`${prefix}${contextStr} ${message}`, data);
    } else {
      logFn(`${prefix}${contextStr} ${message}`);
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: SyncLogContext): SyncLogger {
    return new SyncLogger(this.context, {
      ...this.logContext,
      ...additionalContext,
    });
  }

  /**
   * Log the start of a sync operation
   */
  syncStart(sourceCount: number): void {
    this.info(`Starting sync for ${sourceCount} source(s)`);
  }

  /**
   * Log the completion of a sync operation
   */
  syncComplete(summary: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    totalItemsAdded: number;
    totalItemsUpdated: number;
    duration: number;
  }): void {
    this.info(`Sync completed in ${summary.duration}ms`, {
      sources: {
        total: summary.totalSources,
        successful: summary.successfulSources,
        failed: summary.failedSources,
      },
      items: {
        added: summary.totalItemsAdded,
        updated: summary.totalItemsUpdated,
      },
    });
  }

  /**
   * Log source sync start
   */
  sourceStart(): void {
    this.info("Starting source sync");
  }

  /**
   * Log source sync success
   */
  sourceSuccess(result: {
    itemsFound: number;
    itemsAdded: number;
    itemsUpdated: number;
    itemsSkipped: number;
  }): void {
    this.info("Source sync completed", {
      items: {
        found: result.itemsFound,
        added: result.itemsAdded,
        updated: result.itemsUpdated,
        skipped: result.itemsSkipped,
      },
    });
  }

  /**
   * Log source sync failure
   */
  sourceError(error: string): void {
    this.error("Source sync failed", { error });
  }

  /**
   * Log item processing
   */
  itemProcessed(result: {
    title: string;
    isNew: boolean;
    isUpdated: boolean;
    isSkipped: boolean;
    wordCount: number;
    contentSource: string;
  }): void {
    const action = result.isNew
      ? "added"
      : result.isUpdated
      ? "updated"
      : "skipped";
    this.debug(`Item ${action}: ${result.title}`, {
      wordCount: result.wordCount,
      contentSource: result.contentSource,
    });
  }

  /**
   * Log summarization result
   */
  summarizationResult(result: {
    title: string;
    success: boolean;
    isRetry: boolean;
    retryCount?: number;
    error?: string;
    tokensUsed?: number;
    processingTimeMs?: number;
  }): void {
    if (result.success) {
      this.info(
        `Successfully summarized${result.isRetry ? " (retry)" : ""}: ${result.title}`,
        {
          tokensUsed: result.tokensUsed,
          processingTimeMs: result.processingTimeMs,
        }
      );
    } else {
      this.error(
        `Failed to summarize ${result.title} (attempt ${result.retryCount || 1})`,
        { error: result.error }
      );
    }
  }
}

/**
 * Create a new sync logger
 */
export function createSyncLogger(
  context: string,
  logContext?: SyncLogContext
): SyncLogger {
  return new SyncLogger(context, logContext);
}

// Pre-configured loggers for common contexts
export const syncLogger = createSyncLogger("Sync");
export const contentSyncLogger = createSyncLogger("ContentSync");
export const autoSummarizeLogger = createSyncLogger("AutoSummarize");
export const fetcherLogger = createSyncLogger("Fetcher");
