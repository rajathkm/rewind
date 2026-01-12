import * as cheerio from 'cheerio';
import {
  CONTENT_SELECTORS,
  NOISE_SELECTORS,
  MIN_CONTENT_LENGTH,
  READING_SPEED_WPM,
} from './config';

export interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  publishedAt?: Date;
  imageUrl?: string;
  wordCount: number;
  readingTimeMinutes: number;
}

/**
 * Extract content from HTML using proper DOM parsing with cheerio
 * Tries content selectors in priority order and removes noise elements
 */
export function extractFromHtml(html: string): ExtractedContent {
  const $ = cheerio.load(html);

  // Remove all noise elements first
  for (const selector of NOISE_SELECTORS) {
    $(selector).remove();
  }

  // Extract metadata before modifying DOM further
  const title = extractTitle($);
  const author = extractAuthor($);
  const publishedAt = extractPublishedDate($);
  const imageUrl = extractImage($);
  const metaDescription = $('meta[name="description"]').attr('content')?.trim();

  // Try each content selector in priority order
  let contentText = '';

  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = extractTextFromElement($, element);
      if (text.length >= MIN_CONTENT_LENGTH) {
        contentText = text;
        break;
      }
    }
  }

  // Fallback to body if no selector matched
  if (!contentText) {
    contentText = extractTextFromElement($, $('body'));
  }

  // Clean the extracted text
  contentText = cleanText(contentText);

  // Calculate metrics
  const wordCount = countWords(contentText);
  const readingTimeMinutes = Math.ceil(wordCount / READING_SPEED_WPM);

  // Generate excerpt
  const excerpt = metaDescription || generateExcerpt(contentText);

  return {
    title,
    content: contentText,
    excerpt,
    author,
    publishedAt,
    imageUrl,
    wordCount,
    readingTimeMinutes,
  };
}

/**
 * Extract content from plain text
 */
export function extractFromText(text: string): ExtractedContent {
  const lines = text.split('\n').filter((l) => l.trim());
  const title = lines[0]?.slice(0, 100) || 'Untitled';
  const content = cleanText(text);
  const wordCount = countWords(content);

  return {
    title,
    content,
    excerpt: generateExcerpt(content),
    wordCount,
    readingTimeMinutes: Math.ceil(wordCount / READING_SPEED_WPM),
  };
}

/**
 * Extract text from a cheerio element, preserving paragraph structure
 */
function extractTextFromElement(
  $: cheerio.CheerioAPI,
  element: ReturnType<cheerio.CheerioAPI>
): string {
  // Clone to avoid modifying original
  const clone = element.clone();

  // Replace block elements with newlines for paragraph structure
  clone.find('p, div, br, h1, h2, h3, h4, h5, h6, li, blockquote').each((_, el) => {
    const $el = $(el);
    $el.before('\n\n');
    $el.after('\n\n');
  });

  // Get text content
  let text = clone.text();

  // Clean up whitespace while preserving paragraph breaks
  text = text
    .replace(/[ \t]+/g, ' ')           // Multiple spaces to single
    .replace(/\n[ \t]+/g, '\n')        // Trim line starts
    .replace(/[ \t]+\n/g, '\n')        // Trim line ends
    .replace(/\n{3,}/g, '\n\n')        // Max 2 newlines
    .trim();

  return text;
}

/**
 * Extract title from various sources
 */
function extractTitle($: cheerio.CheerioAPI): string {
  // Try h1 first (most likely the article title)
  const h1 = $('h1').first().text().trim();
  if (h1) return h1;

  // Try og:title
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  if (ogTitle) return ogTitle;

  // Try title tag
  const titleTag = $('title').first().text().trim();
  if (titleTag) {
    // Often contains site name, try to extract just the article title
    const parts = titleTag.split(/[|\-–—]/);
    if (parts.length > 1) {
      return parts[0].trim();
    }
    return titleTag;
  }

  return 'Untitled';
}

/**
 * Extract author from meta tags or byline
 */
function extractAuthor($: cheerio.CheerioAPI): string | undefined {
  // Try meta author
  const metaAuthor = $('meta[name="author"]').attr('content')?.trim();
  if (metaAuthor) return metaAuthor;

  // Try article:author
  const articleAuthor = $('meta[property="article:author"]').attr('content')?.trim();
  if (articleAuthor) return articleAuthor;

  // Try common byline classes
  const bylineSelectors = ['.byline', '.author', '.post-author', '[rel="author"]'];
  for (const selector of bylineSelectors) {
    const byline = $(selector).first().text().trim();
    if (byline) {
      // Clean up common patterns
      return byline.replace(/^by\s+/i, '').trim();
    }
  }

  return undefined;
}

/**
 * Extract published date from meta tags or time elements
 */
function extractPublishedDate($: cheerio.CheerioAPI): Date | undefined {
  // Try article:published_time
  const publishedTime = $('meta[property="article:published_time"]').attr('content');
  if (publishedTime) {
    const date = new Date(publishedTime);
    if (!isNaN(date.getTime())) return date;
  }

  // Try time element with datetime
  const timeEl = $('time[datetime]').first().attr('datetime');
  if (timeEl) {
    const date = new Date(timeEl);
    if (!isNaN(date.getTime())) return date;
  }

  // Try datePublished schema
  const datePublished = $('meta[itemprop="datePublished"]').attr('content');
  if (datePublished) {
    const date = new Date(datePublished);
    if (!isNaN(date.getTime())) return date;
  }

  return undefined;
}

/**
 * Extract main image from og:image or first content image
 */
function extractImage($: cheerio.CheerioAPI): string | undefined {
  // Try og:image first (usually the best quality)
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) return ogImage;

  // Try twitter:image
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage) return twitterImage;

  // Try first image in article
  const firstImg = $('article img, main img, .content img').first().attr('src');
  if (firstImg) return firstImg;

  return undefined;
}

/**
 * Generate excerpt from content
 */
function generateExcerpt(content: string, maxLength = 300): string {
  if (content.length <= maxLength) return content;

  // Try to break at sentence boundary
  const truncated = content.slice(0, maxLength);
  const lastSentence = truncated.lastIndexOf('. ');
  if (lastSentence > maxLength * 0.5) {
    return truncated.slice(0, lastSentence + 1);
  }

  // Break at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    // Normalize Unicode
    .normalize('NFKC')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Normalize dashes
    .replace(/[—–]/g, '-')
    // Remove excessive punctuation
    .replace(/([!?.])\1+/g, '$1')
    // Clean whitespace (preserve paragraph breaks)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
