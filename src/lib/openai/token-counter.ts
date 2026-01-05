// Model token limits
export const MODEL_LIMITS = {
  "gpt-4o": {
    contextWindow: 128000,
    outputLimit: 16384,
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
  },
  "gpt-4o-mini": {
    contextWindow: 128000,
    outputLimit: 16384,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
  },
  "gpt-4-turbo": {
    contextWindow: 128000,
    outputLimit: 4096,
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
  },
} as const;

export type SupportedModel = keyof typeof MODEL_LIMITS;

// Use estimation-based token counting to avoid tiktoken bundling issues
// This is accurate enough for cost tracking and context management
export function countTokens(text: string): number {
  if (!text) return 0;
  // GPT-4 tokenization averages ~4 characters per token for English text
  // Words average ~1.3 tokens each
  const words = text.split(/\s+/).filter(w => w.length > 0);
  return Math.ceil(words.length * 1.3);
}

export function estimateTokens(text: string): number {
  // Fast estimation: ~4 characters per token on average
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function truncateToTokenLimit(
  text: string,
  maxTokens: number
): { text: string; truncated: boolean } {
  const currentTokens = countTokens(text);

  if (currentTokens <= maxTokens) {
    return { text, truncated: false };
  }

  // Estimate characters needed (roughly 4 chars per token)
  const targetChars = Math.floor(maxTokens * 4);
  // Find a good break point (end of sentence or word)
  let truncatedText = text.slice(0, targetChars);

  // Try to break at sentence end
  const lastSentence = truncatedText.lastIndexOf('. ');
  if (lastSentence > targetChars * 0.8) {
    truncatedText = truncatedText.slice(0, lastSentence + 1);
  } else {
    // Break at word boundary
    const lastSpace = truncatedText.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncatedText = truncatedText.slice(0, lastSpace);
    }
  }

  return { text: truncatedText, truncated: true };
}

export function calculateCost(
  model: SupportedModel,
  inputTokens: number,
  outputTokens: number
): number {
  const limits = MODEL_LIMITS[model];
  const inputCost = (inputTokens / 1000) * limits.inputCostPer1k;
  const outputCost = (outputTokens / 1000) * limits.outputCostPer1k;
  return inputCost + outputCost;
}

export function getModelLimits(model: SupportedModel) {
  return MODEL_LIMITS[model];
}

export function fitsInContext(
  text: string,
  model: SupportedModel,
  reserveForOutput: number = 4096
): boolean {
  const limits = MODEL_LIMITS[model];
  const tokens = countTokens(text);
  return tokens + reserveForOutput <= limits.contextWindow;
}
