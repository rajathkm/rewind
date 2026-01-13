import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateYouTubeUrl,
  fetchYouTubeVideoData,
  YouTubeError,
  YouTubeErrorCode,
  getHttpStatusForError,
} from "@/lib/youtube";

// Demo user ID for development without auth
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

// Demo source ID for YouTube videos (created without a subscription)
const YOUTUBE_SOURCE_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Helper to create error response with consistent format
 */
function createErrorResponse(
  error: YouTubeError,
  additionalData?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: error.userMessage,
      errorCode: error.code,
      isRetryable: error.isRetryable,
      ...additionalData,
    },
    { status: getHttpStatusForError(error.code) }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Use admin client and demo user for development
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "YouTube URL is required",
          errorCode: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    // Validate the YouTube URL
    const validation = validateYouTubeUrl(url);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          errorCode: "INVALID_URL",
        },
        { status: 400 }
      );
    }

    const { videoId } = validation;

    // Check if this video already exists for this user
    const { data: existingContent } = await db
      .from("content_items")
      .select("id, processing_status, title")
      .eq("youtube_video_id", videoId)
      .single();

    if (existingContent) {
      return NextResponse.json({
        success: true,
        contentId: existingContent.id,
        status: existingContent.processing_status,
        message: "Video already submitted",
        isExisting: true,
      });
    }

    // Ensure we have a YouTube source for standalone videos
    const sourceId = YOUTUBE_SOURCE_ID;
    const { data: existingSource } = await db
      .from("content_sources")
      .select("id")
      .eq("id", YOUTUBE_SOURCE_ID)
      .single();

    if (!existingSource) {
      // Create the YouTube source
      const { error: sourceError } = await db
        .from("content_sources")
        .insert({
          id: YOUTUBE_SOURCE_ID,
          source_type: "rss", // Using rss as base type since youtube isn't in enum yet
          title: "YouTube Videos",
          description: "Manually submitted YouTube videos",
          feed_url: "https://www.youtube.com",
          website_url: "https://www.youtube.com",
          is_verified: true,
        })
        .select()
        .single();

      if (sourceError && !sourceError.message.includes("duplicate")) {
        console.error("[YouTube API] Error creating source:", sourceError);
        // Continue anyway - the source might exist but RLS prevents us from seeing it
      }
    }

    // Fetch video data (metadata + transcript)
    console.log(`[YouTube API] Fetching data for video: ${videoId}`);
    const videoData = await fetchYouTubeVideoData(videoId);

    // Check for critical errors (video not found, private, etc.)
    if (videoData.error && !videoData.transcript) {
      const error = videoData.error;

      // For certain errors, we don't want to save the content at all
      const nonSaveableErrors = [
        YouTubeErrorCode.VIDEO_NOT_FOUND,
        YouTubeErrorCode.VIDEO_DELETED,
        YouTubeErrorCode.VIDEO_PRIVATE,
        YouTubeErrorCode.AGE_RESTRICTED,
        YouTubeErrorCode.REGION_RESTRICTED,
        YouTubeErrorCode.REQUIRES_PAYMENT,
        YouTubeErrorCode.REQUIRES_MEMBERSHIP,
        YouTubeErrorCode.COPYRIGHT_BLOCKED,
      ];

      if (nonSaveableErrors.includes(error.code)) {
        return createErrorResponse(error, {
          video: {
            id: videoId,
            title: videoData.metadata.title,
            channelName: videoData.metadata.channelName,
            thumbnailUrl: videoData.metadata.thumbnailUrl,
          },
        });
      }

      // For caption-related errors, return with video metadata
      if (
        error.code === YouTubeErrorCode.CAPTIONS_DISABLED ||
        error.code === YouTubeErrorCode.NO_CAPTIONS_AVAILABLE
      ) {
        return NextResponse.json(
          {
            success: false,
            error: error.userMessage,
            errorCode: error.code,
            noCaptions: true,
            video: {
              id: videoId,
              title: videoData.metadata.title,
              channelName: videoData.metadata.channelName,
              thumbnailUrl: videoData.metadata.thumbnailUrl,
              durationSeconds: videoData.metadata.durationSeconds,
            },
          },
          { status: 422 }
        );
      }
    }

    // If we got here without a transcript, it's an error
    if (!videoData.transcript) {
      console.log(`[YouTube API] No captions available for video: ${videoId}`);
      return NextResponse.json(
        {
          success: false,
          error: videoData.errorMessage || "This video doesn't have captions available",
          errorCode: videoData.error?.code || YouTubeErrorCode.NO_CAPTIONS_AVAILABLE,
          noCaptions: true,
          video: {
            id: videoId,
            title: videoData.metadata.title,
            channelName: videoData.metadata.channelName,
            thumbnailUrl: videoData.metadata.thumbnailUrl,
            durationSeconds: videoData.metadata.durationSeconds,
          },
        },
        { status: 422 }
      );
    }

    // Create the content item (transcript is guaranteed to exist at this point)
    const contentItem = {
      source_id: sourceId,
      content_type: "youtube_video",
      guid: `youtube:${videoId}`,
      title: videoData.metadata.title,
      url: validation.url,
      author: videoData.metadata.channelName,
      content_text: videoData.transcript.text,
      excerpt: videoData.metadata.description?.slice(0, 300) || "",
      duration_seconds: videoData.metadata.durationSeconds,
      transcript: videoData.transcript.text,
      image_url: videoData.metadata.thumbnailUrl,
      published_at: videoData.metadata.publishedAt || new Date().toISOString(),
      processing_status: "pending",
      youtube_video_id: videoId,
      youtube_channel_name: videoData.metadata.channelName,
      youtube_channel_id: videoData.metadata.channelId,
      youtube_thumbnail_url: videoData.metadata.thumbnailUrl,
      transcript_source: videoData.transcript.isAutoGenerated ? "auto" : "manual",
    };

    const { data: newContent, error: contentError } = await db
      .from("content_items")
      .insert(contentItem)
      .select()
      .single();

    if (contentError) {
      console.error("[YouTube API] Error creating content:", contentError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create content item",
          errorCode: "DATABASE_ERROR",
        },
        { status: 500 }
      );
    }

    // Create user content state for tracking
    await db.from("user_content_state").insert({
      user_id: userId,
      content_id: newContent.id,
      is_read: false,
      is_saved: false,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      contentId: newContent.id,
      status: newContent.processing_status,
      hasTranscript: !!videoData.transcript,
      transcriptSource: videoData.transcript?.isAutoGenerated ? "auto" : "manual",
      message: "Video submitted for summarization",
      video: {
        id: videoId,
        title: videoData.metadata.title,
        channelName: videoData.metadata.channelName,
        thumbnailUrl: videoData.metadata.thumbnailUrl,
        durationSeconds: videoData.metadata.durationSeconds,
      },
    });
  } catch (error) {
    console.error("[YouTube API] Error:", error);

    // Handle YouTubeError specifically
    if (error instanceof YouTubeError) {
      return createErrorResponse(error);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        errorCode: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check processing status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const db = user ? supabase : createAdminClient();

    const searchParams = request.nextUrl.searchParams;
    const contentId = searchParams.get("contentId");
    const videoId = searchParams.get("videoId");

    if (!contentId && !videoId) {
      return NextResponse.json(
        {
          success: false,
          error: "contentId or videoId is required",
          errorCode: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    let query = db
      .from("content_items")
      .select(
        `
        id,
        title,
        processing_status,
        youtube_video_id,
        youtube_channel_name,
        youtube_thumbnail_url,
        duration_seconds,
        transcript,
        summaries (
          id,
          headline,
          tldr
        )
      `
      );

    if (contentId) {
      query = query.eq("id", contentId);
    } else if (videoId) {
      query = query.eq("youtube_video_id", videoId);
    }

    const { data, error } = await query.single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Content not found",
          errorCode: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contentId: data.id,
      videoId: data.youtube_video_id,
      title: data.title,
      channelName: data.youtube_channel_name,
      thumbnailUrl: data.youtube_thumbnail_url,
      durationSeconds: data.duration_seconds,
      status: data.processing_status,
      hasTranscript: !!data.transcript,
      hasSummary: data.summaries && data.summaries.length > 0,
      summary: data.summaries?.[0] || null,
    });
  } catch (error) {
    console.error("[YouTube API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        errorCode: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
