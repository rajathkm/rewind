interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  publishedAt?: Date;
  imageUrl?: string;
  wordCount: number;
  readingTimeMinutes: number;
}

// Common noise patterns to remove
const NOISE_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
  /<!--[\s\S]*?-->/g,
  /<nav\b[^>]*>[\s\S]*?<\/nav>/gi,
  /<header\b[^>]*>[\s\S]*?<\/header>/gi,
  /<footer\b[^>]*>[\s\S]*?<\/footer>/gi,
  /<aside\b[^>]*>[\s\S]*?<\/aside>/gi,
];

// Patterns to identify main content
const CONTENT_SELECTORS = [
  "article",
  '[role="main"]',
  ".post-content",
  ".article-content",
  ".entry-content",
  ".content-body",
  "#content",
  "main",
];

export function extractFromHtml(html: string): ExtractedContent {
  let cleanHtml = html;

  // Remove noise
  for (const pattern of NOISE_PATTERNS) {
    cleanHtml = cleanHtml.replace(pattern, "");
  }

  // Extract title
  const titleMatch = cleanHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
  const h1Match = cleanHtml.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  const title = h1Match?.[1]?.trim() || titleMatch?.[1]?.trim() || "Untitled";

  // Extract meta description for excerpt
  const metaDescMatch = cleanHtml.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
  );

  // Extract author
  const authorMatch =
    cleanHtml.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']*)["']/i) ||
    cleanHtml.match(/by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);

  // Extract published date
  const dateMatch =
    cleanHtml.match(/<time[^>]*datetime=["']([^"']*)["']/i) ||
    cleanHtml.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']*)["']/i);

  // Extract image
  const ogImageMatch = cleanHtml.match(
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i
  );

  // Convert HTML to plain text
  const plainText = htmlToText(cleanHtml);

  // Calculate metrics
  const wordCount = countWords(plainText);
  const readingTimeMinutes = Math.ceil(wordCount / 200); // 200 WPM average

  // Generate excerpt
  const excerpt =
    metaDescMatch?.[1]?.trim() ||
    plainText.slice(0, 300).trim() + (plainText.length > 300 ? "..." : "");

  return {
    title,
    content: plainText,
    excerpt,
    author: authorMatch?.[1]?.trim(),
    publishedAt: dateMatch?.[1] ? new Date(dateMatch[1]) : undefined,
    imageUrl: ogImageMatch?.[1],
    wordCount,
    readingTimeMinutes,
  };
}

export function extractFromText(text: string): ExtractedContent {
  const lines = text.split("\n").filter((l) => l.trim());
  const title = lines[0]?.slice(0, 100) || "Untitled";
  const content = text.trim();
  const wordCount = countWords(content);

  return {
    title,
    content,
    excerpt: content.slice(0, 300) + (content.length > 300 ? "..." : ""),
    wordCount,
    readingTimeMinutes: Math.ceil(wordCount / 200),
  };
}

function htmlToText(html: string): string {
  return html
    // Replace block elements with newlines
    .replace(/<\/?(p|div|br|h[1-6]|li|blockquote)[^>]*>/gi, "\n")
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, "")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function cleanText(text: string): string {
  return text
    // Normalize Unicode
    .normalize("NFKC")
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Normalize dashes
    .replace(/[—–]/g, "-")
    // Remove excessive punctuation
    .replace(/([!?.])\1+/g, "$1")
    // Clean whitespace
    .replace(/\s+/g, " ")
    .trim();
}

export type { ExtractedContent };
