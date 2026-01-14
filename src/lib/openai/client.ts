import OpenAI from "openai";
import { getRateLimiter } from "./rate-limiter";
import { getCostTracker } from "./cost-tracker";
import {
  countTokens,
  estimateTokens,
  getModelLimits,
  type SupportedModel,
} from "./token-counter";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: SupportedModel;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  operation?: string;
}

export interface CompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  model: SupportedModel;
  finishReason: string | null;
}

class OpenAIClient {
  private client: OpenAI;
  private defaultModel: SupportedModel;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`[OpenAI Client] Initializing - API key is ${apiKey ? 'SET' : 'NOT SET'}`);

    if (!apiKey) {
      console.error("[OpenAI Client] OPENAI_API_KEY environment variable is required");
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.client = new OpenAI({ apiKey });
    this.defaultModel = (process.env.OPENAI_MODEL as SupportedModel) || "gpt-4o";
    console.log(`[OpenAI Client] Initialized with model: ${this.defaultModel}`);
  }

  async createCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<CompletionResult> {
    const model = options.model || this.defaultModel;
    const rateLimiter = getRateLimiter();
    const costTracker = getCostTracker();

    // Estimate tokens for rate limiting
    const inputText = messages.map((m) => m.content).join(" ");
    const estimatedInputTokens = estimateTokens(inputText);
    const estimatedOutputTokens = options.maxTokens || 2000;
    const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;

    // Check budget
    const estimatedCost = costTracker.estimateCost(
      model,
      estimatedInputTokens,
      estimatedOutputTokens
    );

    if (!costTracker.canAfford(estimatedCost)) {
      const stats = costTracker.getUsageStats();
      throw new BudgetExceededError(
        `Budget exceeded. Daily: $${stats.dailyUsage.toFixed(2)}/$${stats.dailyLimit}, Monthly: $${stats.monthlyUsage.toFixed(2)}/$${stats.monthlyLimit}`,
        stats
      );
    }

    // Wait for rate limit capacity
    await rateLimiter.waitForCapacity(estimatedTotalTokens);

    console.log(`[OpenAI Client] Sending request:`, {
      model,
      operation: options.operation,
      estimatedInputTokens,
      maxTokens: options.maxTokens,
      jsonMode: options.jsonMode,
    });

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        response_format: options.jsonMode ? { type: "json_object" } : undefined,
      });

      const choice = response.choices[0];
      const content = choice?.message?.content || "";
      const inputTokens = response.usage?.prompt_tokens || countTokens(inputText);
      const outputTokens = response.usage?.completion_tokens || countTokens(content);

      console.log(`[OpenAI Client] Response received:`, {
        model,
        inputTokens,
        outputTokens,
        finishReason: choice?.finish_reason,
        contentLength: content.length,
      });

      // Record usage
      rateLimiter.recordRequest(inputTokens + outputTokens);
      const usageRecord = costTracker.recordUsage(
        model,
        inputTokens,
        outputTokens,
        options.operation || "completion"
      );

      return {
        content,
        inputTokens,
        outputTokens,
        cost: usageRecord.cost,
        model,
        finishReason: choice?.finish_reason || null,
      };
    } catch (error) {
      console.error(`[OpenAI Client] API error:`, error);
      if (error instanceof OpenAI.RateLimitError) {
        console.log(`[OpenAI Client] Rate limited, waiting 60s before retry`);
        // Wait and retry on rate limit
        await new Promise((resolve) => setTimeout(resolve, 60000));
        return this.createCompletion(messages, options);
      }
      throw error;
    }
  }

  async createCompletionWithRetry(
    messages: ChatMessage[],
    options: CompletionOptions = {},
    maxRetries: number = 3
  ): Promise<CompletionResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.createCompletion(messages, options);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof BudgetExceededError) {
          throw error; // Don't retry on budget errors
        }

        if (error instanceof OpenAI.APIError) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  async createStreamingCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
    onChunk: (chunk: string) => void
  ): Promise<CompletionResult> {
    const model = options.model || this.defaultModel;
    const rateLimiter = getRateLimiter();
    const costTracker = getCostTracker();

    const inputText = messages.map((m) => m.content).join(" ");
    const estimatedInputTokens = estimateTokens(inputText);
    const estimatedOutputTokens = options.maxTokens || 2000;

    await rateLimiter.waitForCapacity(estimatedInputTokens + estimatedOutputTokens);

    const stream = await this.client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: true,
    });

    let content = "";
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      content += delta;
      onChunk(delta);
      finishReason = chunk.choices[0]?.finish_reason || finishReason;
    }

    const inputTokens = countTokens(inputText);
    const outputTokens = countTokens(content);

    rateLimiter.recordRequest(inputTokens + outputTokens);
    const usageRecord = costTracker.recordUsage(
      model,
      inputTokens,
      outputTokens,
      options.operation || "streaming-completion"
    );

    return {
      content,
      inputTokens,
      outputTokens,
      cost: usageRecord.cost,
      model,
      finishReason,
    };
  }

  getModelLimits(model?: SupportedModel) {
    return getModelLimits(model || this.defaultModel);
  }

  getUsageStats() {
    return getCostTracker().getUsageStats();
  }

  getRateLimitStats() {
    return getRateLimiter().getUsageStats();
  }
}

export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public stats: ReturnType<typeof getCostTracker.prototype.getUsageStats>
  ) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

// Singleton instance
let openaiClient: OpenAIClient | null = null;

export function getOpenAIClient(): OpenAIClient {
  if (!openaiClient) {
    openaiClient = new OpenAIClient();
  }
  return openaiClient;
}

export function resetOpenAIClient(): void {
  openaiClient = null;
}

export { OpenAIClient };
