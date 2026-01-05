import { countTokens, estimateTokens } from "../openai/token-counter";

interface ContentChunk {
  content: string;
  index: number;
  tokenCount: number;
  isFirst: boolean;
  isLast: boolean;
}

interface ChunkingOptions {
  maxTokensPerChunk: number;
  overlapTokens: number;
  preserveParagraphs: boolean;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxTokensPerChunk: 6000,
  overlapTokens: 200,
  preserveParagraphs: true,
};

export function chunkContent(
  content: string,
  options: Partial<ChunkingOptions> = {}
): ContentChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const totalTokens = countTokens(content);

  // If content fits in one chunk, return as-is
  if (totalTokens <= opts.maxTokensPerChunk) {
    return [
      {
        content,
        index: 0,
        tokenCount: totalTokens,
        isFirst: true,
        isLast: true,
      },
    ];
  }

  const chunks: ContentChunk[] = [];

  if (opts.preserveParagraphs) {
    // Split by paragraphs first
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = "";
    let currentTokens = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphTokens = estimateTokens(paragraph);

      // If single paragraph is too large, split it by sentences
      if (paragraphTokens > opts.maxTokensPerChunk) {
        if (currentChunk) {
          chunks.push(createChunk(currentChunk, chunks.length, currentTokens));
          currentChunk = "";
          currentTokens = 0;
        }

        const sentenceChunks = chunkBySentences(paragraph, opts.maxTokensPerChunk);
        for (const sentenceChunk of sentenceChunks) {
          chunks.push(createChunk(sentenceChunk, chunks.length, estimateTokens(sentenceChunk)));
        }
        continue;
      }

      // Check if adding this paragraph exceeds limit
      if (currentTokens + paragraphTokens > opts.maxTokensPerChunk) {
        chunks.push(createChunk(currentChunk, chunks.length, currentTokens));

        // Start new chunk with overlap from previous
        const overlap = getOverlapText(currentChunk, opts.overlapTokens);
        currentChunk = overlap + paragraph;
        currentTokens = estimateTokens(currentChunk);
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        currentTokens += paragraphTokens;
      }
    }

    // Add remaining content
    if (currentChunk) {
      chunks.push(createChunk(currentChunk, chunks.length, currentTokens));
    }
  } else {
    // Simple character-based chunking
    const charsPerChunk = Math.floor(opts.maxTokensPerChunk * 4); // ~4 chars per token
    const overlapChars = opts.overlapTokens * 4;

    let position = 0;
    while (position < content.length) {
      const end = Math.min(position + charsPerChunk, content.length);
      const chunk = content.slice(position, end);
      chunks.push(createChunk(chunk, chunks.length, estimateTokens(chunk)));
      position = end - overlapChars;
    }
  }

  // Update first/last flags
  if (chunks.length > 0) {
    chunks[0].isFirst = true;
    chunks[chunks.length - 1].isLast = true;
  }

  return chunks;
}

function chunkBySentences(text: string, maxTokens: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = sentence;
      currentTokens = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(/\s+/);
  const estimatedWordsForOverlap = Math.ceil(overlapTokens * 0.75); // ~0.75 words per token
  const overlapWords = words.slice(-estimatedWordsForOverlap);
  return overlapWords.join(" ") + "\n\n";
}

function createChunk(
  content: string,
  index: number,
  tokenCount: number
): ContentChunk {
  return {
    content: content.trim(),
    index,
    tokenCount,
    isFirst: false,
    isLast: false,
  };
}

export function getChunkingStrategy(
  tokenCount: number
): "short" | "medium" | "long" {
  if (tokenCount <= 4000) return "short";
  if (tokenCount <= 16000) return "medium";
  return "long";
}

export type { ContentChunk, ChunkingOptions };
