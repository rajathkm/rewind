import { getOpenAIClient, type CompletionResult } from "../openai/client";
import { countTokens } from "../openai/token-counter";
import { chunkContent, getChunkingStrategy } from "../content/chunker";
import {
  SYSTEM_PROMPT,
  SHORT_CONTENT_PROMPT,
  CHUNK_SUMMARY_PROMPT,
  COMBINE_CHUNKS_PROMPT,
  PODCAST_PROMPT,
  formatPrompt,
} from "./prompts";
import { summarySchema, type SummaryOutput } from "./schema";

interface SummarizationResult {
  summary: SummaryOutput;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  processingTimeMs: number;
  strategy: "short" | "medium" | "long" | "podcast";
}

interface SummarizationOptions {
  title?: string;
  contentType?: "article" | "podcast" | "newsletter";
  duration?: number; // For podcasts, in seconds
}

export async function summarizeContent(
  content: string,
  options: SummarizationOptions = {}
): Promise<SummarizationResult> {
  const startTime = Date.now();
  const tokenCount = countTokens(content);
  const client = getOpenAIClient();

  let result: CompletionResult;
  let strategy: SummarizationResult["strategy"];

  if (options.contentType === "podcast") {
    strategy = "podcast";
    result = await summarizePodcast(content, options);
  } else {
    const chunkStrategy = getChunkingStrategy(tokenCount);
    strategy = chunkStrategy;

    switch (chunkStrategy) {
      case "short":
        result = await summarizeShort(content);
        break;
      case "medium":
      case "long":
        result = await summarizeLong(content, options.title || "Untitled");
        break;
    }
  }

  const summary = parseSummaryResponse(result.content);
  const processingTimeMs = Date.now() - startTime;

  return {
    summary,
    tokensUsed: {
      input: result.inputTokens,
      output: result.outputTokens,
      total: result.inputTokens + result.outputTokens,
    },
    cost: result.cost,
    processingTimeMs,
    strategy,
  };
}

async function summarizeShort(content: string): Promise<CompletionResult> {
  const client = getOpenAIClient();
  const prompt = formatPrompt(SHORT_CONTENT_PROMPT, { content });

  return client.createCompletionWithRetry(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    {
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 4000,
      operation: "summarize-short",
    }
  );
}

async function summarizeLong(
  content: string,
  title: string
): Promise<CompletionResult> {
  const client = getOpenAIClient();
  const chunks = chunkContent(content, {
    maxTokensPerChunk: 6000,
    overlapTokens: 200,
  });

  // Process chunks in parallel (with concurrency limit)
  const chunkSummaries: string[] = [];
  const batchSize = 3;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((chunk) => {
        const contextNote = chunk.isFirst
          ? "This is the beginning of the document."
          : chunk.isLast
            ? "This is the end of the document."
            : "";

        const prompt = formatPrompt(CHUNK_SUMMARY_PROMPT, {
          chunkIndex: chunk.index + 1,
          totalChunks: chunks.length,
          contextNote,
          content: chunk.content,
        });

        return client.createCompletionWithRetry(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          {
            jsonMode: true,
            temperature: 0.3,
            maxTokens: 2000,
            operation: "summarize-chunk",
          }
        );
      })
    );

    chunkSummaries.push(...batchResults.map((r) => r.content));
  }

  // Combine chunk summaries
  const combinePrompt = formatPrompt(COMBINE_CHUNKS_PROMPT, {
    chunkSummaries: chunkSummaries
      .map((s, i) => `Section ${i + 1}:\n${s}`)
      .join("\n\n---\n\n"),
    title,
  });

  return client.createCompletionWithRetry(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: combinePrompt },
    ],
    {
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 4000,
      operation: "summarize-combine",
    }
  );
}

async function summarizePodcast(
  transcript: string,
  options: SummarizationOptions
): Promise<CompletionResult> {
  const client = getOpenAIClient();
  const tokenCount = countTokens(transcript);

  // Format duration
  const durationStr = options.duration
    ? `${Math.floor(options.duration / 60)} minutes`
    : "Unknown";

  // If transcript is very long, chunk it first
  if (tokenCount > 12000) {
    return summarizeLong(transcript, options.title || "Podcast Episode");
  }

  const prompt = formatPrompt(PODCAST_PROMPT, {
    title: options.title || "Podcast Episode",
    duration: durationStr,
    content: transcript,
  });

  return client.createCompletionWithRetry(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    {
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 4000,
      operation: "summarize-podcast",
    }
  );
}

function parseSummaryResponse(response: string): SummaryOutput {
  try {
    const parsed = JSON.parse(response);
    const validated = summarySchema.parse(parsed);
    return validated;
  } catch (error) {
    // Return a minimal valid summary on parse error
    console.error("Failed to parse summary response:", error);
    return {
      headline: "Summary generation encountered an issue",
      tldr: response.slice(0, 500),
      fullSummary: response,
      keyPoints: [],
      keyTakeaways: [],
      relatedIdeas: [],
      alliedTrivia: [],
    };
  }
}

export type { SummarizationResult, SummarizationOptions };
