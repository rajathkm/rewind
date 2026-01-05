import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: content, error } = await supabase
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

    // Get user-specific state
    const userState = content.user_content_state?.find(
      (state: any) => true // Already filtered by user through RLS
    );

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
      source: content.content_sources,
      summary: content.summaries?.[0] || null,
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { isRead, isSaved, isArchived, readProgress } = body;

    // Upsert user content state
    const updateData: Record<string, unknown> = {
      user_id: user.id,
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

    const { data: state, error } = await supabase
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
