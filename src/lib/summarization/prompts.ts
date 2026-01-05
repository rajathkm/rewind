export const SYSTEM_PROMPT = `You are an expert content analyst and summarizer. Your goal is to extract and preserve ALL important concepts, insights, and actionable information from content. You must NEVER miss key ideas.

Guidelines:
- Be thorough but concise - capture everything important without unnecessary padding
- Preserve technical accuracy and nuance
- Identify actionable insights and practical applications
- Note connections to broader concepts or fields
- Include surprising or non-obvious insights
- Maintain the author's voice and intent where relevant`;

export const SHORT_CONTENT_PROMPT = `Analyze this content and provide a comprehensive summary.

Content:
{content}

Provide your analysis in the following JSON format:
{
  "headline": "A compelling one-line hook (max 100 chars)",
  "tldr": "2-3 sentence summary capturing the essence",
  "fullSummary": "Detailed 200-400 word summary covering all main points",
  "keyPoints": ["Bullet point 1", "Bullet point 2", ...],
  "keyTakeaways": [
    {
      "takeaway": "The core insight or lesson",
      "context": "Why this matters or how it applies",
      "actionable": "Specific action the reader can take (if applicable)",
      "confidence": 0.95,
      "sourceQuote": "Relevant quote from the source (if available)"
    }
  ],
  "relatedIdeas": [
    {
      "idea": "A connected concept or extension",
      "connection": "How it relates to the main content",
      "category": "extension|counterpoint|application|question"
    }
  ],
  "alliedTrivia": [
    {
      "fact": "An interesting related fact",
      "relevance": "Why this fact is relevant"
    }
  ]
}

Ensure you capture EVERY important concept. Do not omit any significant ideas.`;

export const CHUNK_SUMMARY_PROMPT = `Analyze this section of a larger document and extract all key information.

This is section {chunkIndex} of {totalChunks}.
{contextNote}

Content:
{content}

Provide a detailed analysis in JSON format:
{
  "mainPoints": ["Point 1", "Point 2", ...],
  "insights": ["Insight 1", "Insight 2", ...],
  "keyTerms": ["Term 1", "Term 2", ...],
  "quotes": ["Notable quote 1", ...],
  "questions": ["Open question raised", ...]
}

Be thorough - this will be combined with other sections.`;

export const COMBINE_CHUNKS_PROMPT = `Synthesize these section summaries into a comprehensive final summary.

Section Summaries:
{chunkSummaries}

Original Title: {title}

Create a unified analysis in the following JSON format:
{
  "headline": "A compelling one-line hook (max 100 chars)",
  "tldr": "2-3 sentence summary capturing the essence",
  "fullSummary": "Detailed 300-500 word summary covering all main points from all sections",
  "keyPoints": ["Bullet point 1", "Bullet point 2", ...],
  "keyTakeaways": [
    {
      "takeaway": "The core insight or lesson",
      "context": "Why this matters or how it applies",
      "actionable": "Specific action the reader can take (if applicable)",
      "confidence": 0.95,
      "sourceQuote": "Relevant quote from the source (if available)"
    }
  ],
  "relatedIdeas": [
    {
      "idea": "A connected concept or extension",
      "connection": "How it relates to the main content",
      "category": "extension|counterpoint|application|question"
    }
  ],
  "alliedTrivia": [
    {
      "fact": "An interesting related fact",
      "relevance": "Why this fact is relevant"
    }
  ]
}

Ensure nothing important from any section is lost. Synthesize overlapping points intelligently.`;

export const PODCAST_PROMPT = `Analyze this podcast transcript and provide a comprehensive summary.

Podcast: {title}
Duration: {duration}

Transcript:
{content}

Provide your analysis in the following JSON format:
{
  "headline": "A compelling one-line hook (max 100 chars)",
  "tldr": "2-3 sentence summary of the episode",
  "fullSummary": "Detailed 300-500 word summary covering the main discussion",
  "keyPoints": ["Bullet point 1", "Bullet point 2", ...],
  "keyTakeaways": [
    {
      "takeaway": "The core insight or lesson",
      "context": "Why this matters",
      "actionable": "Specific action (if applicable)",
      "confidence": 0.95,
      "sourceQuote": "Relevant quote from speakers",
      "timestamp": "Approximate timestamp if mentioned"
    }
  ],
  "speakers": [
    {
      "name": "Speaker name if identifiable",
      "role": "Host/Guest/Expert",
      "keyContributions": ["Main point they made"]
    }
  ],
  "relatedIdeas": [
    {
      "idea": "A connected concept",
      "connection": "How it relates",
      "category": "extension|counterpoint|application|question"
    }
  ],
  "alliedTrivia": [
    {
      "fact": "An interesting related fact mentioned",
      "relevance": "Why this is interesting"
    }
  ],
  "topicsDiscussed": ["Topic 1", "Topic 2", ...]
}

Capture EVERY important point discussed. Podcasts often contain valuable insights in casual conversation.`;

export const VALIDATION_PROMPT = `Review this summary for quality and completeness.

Original content excerpt:
{excerpt}

Generated summary:
{summary}

Check:
1. Does the headline accurately represent the content?
2. Is the TLDR comprehensive yet concise?
3. Are all key takeaways genuinely important insights?
4. Are any major points missing?
5. Is the confidence scoring appropriate?

Respond with:
{
  "isValid": true/false,
  "issues": ["Issue 1", ...],
  "suggestions": ["Suggestion 1", ...],
  "missingPoints": ["Point that was missed", ...]
}`;

export function formatPrompt(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, "g"), String(value));
  }
  return result;
}
