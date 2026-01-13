import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Demo user ID for development without auth
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client for development mode
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    const { data: content, error } = await db
      .from("content_items")
      .select(
        `
        *,
        content_sources (
          id,
          source_type,
          title,
          description,
          image_url,
          author
        ),
        summaries (
          id,
          summary_type,
          headline,
          tldr,
          full_summary,
          key_points,
          key_takeaways,
          related_ideas,
          allied_trivia,
          model_used,
          quality_score,
          created_at
        ),
        user_content_state (
          is_read,
          is_saved,
          is_archived,
          read_progress,
          read_at,
          saved_at
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Get user-specific state (filter by userId since we might be using admin client)
    const userState = content.user_content_state?.find(
      (state: { user_id: string }) => state.user_id === userId
    );

    // Transform source to camelCase
    const sourceData = content.content_sources;
    const source = sourceData ? {
      id: sourceData.id,
      sourceType: sourceData.source_type,
      title: sourceData.title,
      description: sourceData.description,
      imageUrl: sourceData.image_url,
      author: sourceData.author,
    } : null;

    // Transform summary to camelCase if exists
    const summaryData = content.summaries?.[0];
    const summary = summaryData ? {
      id: summaryData.id,
      summaryType: summaryData.summary_type,
      headline: summaryData.headline,
      tldr: summaryData.tldr,
      fullSummary: summaryData.full_summary,
      keyPoints: summaryData.key_points || [],
      keyTakeaways: summaryData.key_takeaways || [],
      relatedIdeas: summaryData.related_ideas || [],
      alliedTrivia: summaryData.allied_trivia || [],
      speakers: summaryData.speakers || [],
      modelUsed: summaryData.model_used,
      qualityScore: summaryData.quality_score,
      createdAt: summaryData.created_at,
    } : null;

    const response = {
      id: content.id,
      contentType: content.content_type,
      title: content.title,
      url: content.url,
      author: content.author,
      contentHtml: content.content_html,
      contentText: content.content_text,
      excerpt: content.excerpt,
      imageUrl: content.image_url,
      mediaUrl: content.media_url,
      mediaType: content.media_type,
      durationSeconds: content.duration_seconds,
      transcript: content.transcript,
      publishedAt: content.published_at,
      wordCount: content.word_count,
      readingTimeMinutes: content.reading_time_minutes,
      categories: content.categories,
      processingStatus: content.processing_status,
      retryCount: content.retry_count,
      contentSource: content.content_source,
      isSummarizable: content.is_summarizable,
      // YouTube-specific fields
      youtubeVideoId: content.youtube_video_id,
      youtubeChannelName: content.youtube_channel_name,
      youtubeChannelId: content.youtube_channel_id,
      youtubeThumbnailUrl: content.youtube_thumbnail_url,
      transcriptSource: content.transcript_source,
      source,
      summary,
      isRead: userState?.is_read || false,
      isSaved: userState?.is_saved || false,
      isArchived: userState?.is_archived || false,
      readProgress: userState?.read_progress || 0,
    };

    return NextResponse.json({ content: response });
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client for development mode
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    const body = await request.json();
    const { isRead, isSaved, isArchived, readProgress } = body;

    // Upsert user content state
    const updateData: Record<string, unknown> = {
      user_id: userId,
      content_id: id,
    };

    if (isRead !== undefined) {
      updateData.is_read = isRead;
      if (isRead) updateData.read_at = new Date().toISOString();
    }
    if (isSaved !== undefined) {
      updateData.is_saved = isSaved;
      if (isSaved) updateData.saved_at = new Date().toISOString();
    }
    if (isArchived !== undefined) {
      updateData.is_archived = isArchived;
    }
    if (readProgress !== undefined) {
      updateData.read_progress = readProgress;
    }

    const { data: state, error } = await db
      .from("user_content_state")
      .upsert(updateData, {
        onConflict: "user_id,content_id",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ state });
  } catch (error) {
    console.error("Error updating content state:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
