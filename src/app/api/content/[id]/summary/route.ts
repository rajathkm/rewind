import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarizeContent } from "@/lib/summarization/summarizer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get existing summary
    const { data: summary, error } = await supabase
      .from("summaries")
      .select("*")
      .eq("content_id", id)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (summary) {
      return NextResponse.json({ summary });
    }

    return NextResponse.json({ summary: null });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from("summaries")
      .select("id")
      .eq("content_id", id)
      .single();

    if (existingSummary) {
      return NextResponse.json(
        { error: "Summary already exists" },
        { status: 409 }
      );
    }

    // Get content item
    const { data: content, error: contentError } = await supabase
      .from("content_items")
      .select(
        `
        id,
        title,
        content_text,
        transcript,
        content_type,
        duration_seconds,
        content_sources (
          source_type
        )
      `
      )
      .eq("id", id)
      .single();

    if (contentError) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Get content to summarize
    const textContent = content.transcript || content.content_text;
    if (!textContent) {
      return NextResponse.json(
        { error: "No content available to summarize" },
        { status: 400 }
      );
    }

    // Update processing status
    await supabase
      .from("content_items")
      .update({ processing_status: "processing" })
      .eq("id", id);

    // Get source type from the joined data
    const sourceType = (content.content_sources as any)?.source_type;

    try {
      // Generate summary
      const result = await summarizeContent(textContent, {
        title: content.title,
        contentType: sourceType === "podcast" ? "podcast" : "article",
        duration: content.duration_seconds,
      });

      // Store summary
      const { data: summary, error: insertError } = await supabase
        .from("summaries")
        .insert({
          content_id: id,
          summary_type: "detailed",
          headline: result.summary.headline,
          tldr: result.summary.tldr,
          full_summary: result.summary.fullSummary,
          key_points: result.summary.keyPoints,
          key_takeaways: result.summary.keyTakeaways,
          related_ideas: result.summary.relatedIdeas,
          allied_trivia: result.summary.alliedTrivia,
          model_used: "gpt-4o",
          tokens_used: {
            input: result.tokensUsed.input,
            output: result.tokensUsed.output,
          },
          processing_time_ms: result.processingTimeMs,
          quality_score: calculateQualityScore(result.summary),
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update content processing status
      await supabase
        .from("content_items")
        .update({ processing_status: "completed" })
        .eq("id", id);

      return NextResponse.json({
        summary,
        cost: result.cost,
        tokensUsed: result.tokensUsed,
      });
    } catch (summarizeError) {
      // Update processing status to failed
      await supabase
        .from("content_items")
        .update({ processing_status: "failed" })
        .eq("id", id);

      throw summarizeError;
    }
  } catch (error) {
    console.error("Error generating summary:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate summary",
      },
      { status: 500 }
    );
  }
}

function calculateQualityScore(summary: any): number {
  let score = 0;

  // Headline quality (max 15)
  if (summary.headline?.length >= 20 && summary.headline?.length <= 100) {
    score += 15;
  } else if (summary.headline?.length > 0) {
    score += 8;
  }

  // TLDR quality (max 15)
  if (summary.tldr?.length >= 50 && summary.tldr?.length <= 500) {
    score += 15;
  } else if (summary.tldr?.length > 0) {
    score += 8;
  }

  // Full summary quality (max 20)
  if (summary.fullSummary?.length >= 200) {
    score += 20;
  } else if (summary.fullSummary?.length >= 100) {
    score += 12;
  }

  // Key takeaways (max 30)
  const takeawayCount = summary.keyTakeaways?.length || 0;
  score += Math.min(takeawayCount * 10, 30);

  // Related ideas (max 10)
  const ideaCount = summary.relatedIdeas?.length || 0;
  score += Math.min(ideaCount * 5, 10);

  // Trivia (max 10)
  const triviaCount = summary.alliedTrivia?.length || 0;
  score += Math.min(triviaCount * 5, 10);

  return Math.min(score, 100);
}
