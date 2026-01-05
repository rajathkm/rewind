import { z } from "zod";

export const keyTakeawaySchema = z.object({
  takeaway: z.string().min(1),
  context: z.string().min(1),
  actionable: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.8),
  sourceQuote: z.string().optional(),
  timestamp: z.string().optional(),
});

export const relatedIdeaSchema = z.object({
  idea: z.string().min(1),
  connection: z.string().min(1),
  category: z.enum(["extension", "counterpoint", "application", "question"]),
});

export const triviaItemSchema = z.object({
  fact: z.string().min(1),
  relevance: z.string().min(1),
});

export const speakerSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  keyContributions: z.array(z.string()).default([]),
});

export const summarySchema = z.object({
  headline: z.string().max(100),
  tldr: z.string().min(10),
  fullSummary: z.string().min(50),
  keyPoints: z.array(z.string()).default([]),
  keyTakeaways: z.array(keyTakeawaySchema).default([]),
  relatedIdeas: z.array(relatedIdeaSchema).default([]),
  alliedTrivia: z.array(triviaItemSchema).default([]),
  speakers: z.array(speakerSchema).optional(),
  topicsDiscussed: z.array(z.string()).optional(),
});

export type KeyTakeaway = z.infer<typeof keyTakeawaySchema>;
export type RelatedIdea = z.infer<typeof relatedIdeaSchema>;
export type TriviaItem = z.infer<typeof triviaItemSchema>;
export type Speaker = z.infer<typeof speakerSchema>;
export type SummaryOutput = z.infer<typeof summarySchema>;

// Validation helpers
export function validateSummary(data: unknown): {
  valid: boolean;
  errors: string[];
  data?: SummaryOutput;
} {
  const result = summarySchema.safeParse(data);

  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );

  return { valid: false, errors };
}

export function ensureMinimumTakeaways(
  summary: SummaryOutput,
  minCount: number = 3
): SummaryOutput {
  if (summary.keyTakeaways.length >= minCount) {
    return summary;
  }

  // Generate takeaways from key points if needed
  const additionalTakeaways = summary.keyPoints
    .slice(0, minCount - summary.keyTakeaways.length)
    .map((point) => ({
      takeaway: point,
      context: "Derived from key points",
      confidence: 0.7,
    }));

  return {
    ...summary,
    keyTakeaways: [...summary.keyTakeaways, ...additionalTakeaways],
  };
}

export function calculateQualityScore(summary: SummaryOutput): number {
  let score = 0;
  const weights = {
    headline: 10,
    tldr: 15,
    fullSummary: 20,
    keyPoints: 15,
    keyTakeaways: 25,
    relatedIdeas: 10,
    alliedTrivia: 5,
  };

  // Headline quality
  if (summary.headline.length >= 20 && summary.headline.length <= 100) {
    score += weights.headline;
  } else if (summary.headline.length > 0) {
    score += weights.headline * 0.5;
  }

  // TLDR quality
  if (summary.tldr.length >= 50 && summary.tldr.length <= 500) {
    score += weights.tldr;
  } else if (summary.tldr.length > 0) {
    score += weights.tldr * 0.5;
  }

  // Full summary quality
  if (summary.fullSummary.length >= 200) {
    score += weights.fullSummary;
  } else if (summary.fullSummary.length >= 100) {
    score += weights.fullSummary * 0.7;
  }

  // Key points
  const keyPointsScore = Math.min(summary.keyPoints.length / 5, 1);
  score += weights.keyPoints * keyPointsScore;

  // Key takeaways (most important)
  const takeawaysScore = Math.min(summary.keyTakeaways.length / 3, 1);
  const avgConfidence =
    summary.keyTakeaways.length > 0
      ? summary.keyTakeaways.reduce((sum, t) => sum + t.confidence, 0) /
        summary.keyTakeaways.length
      : 0;
  score += weights.keyTakeaways * takeawaysScore * (0.5 + avgConfidence * 0.5);

  // Related ideas
  const ideasScore = Math.min(summary.relatedIdeas.length / 2, 1);
  score += weights.relatedIdeas * ideasScore;

  // Trivia
  const triviaScore = Math.min(summary.alliedTrivia.length / 2, 1);
  score += weights.alliedTrivia * triviaScore;

  return Math.round(score);
}
