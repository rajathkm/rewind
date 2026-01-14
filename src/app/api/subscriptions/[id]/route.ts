import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// Demo user ID for development without auth
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

const updateSubscriptionSchema = z.object({
  customName: z.string().optional().nullable(),
  folder: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  autoSummarize: z.boolean().optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client and demo user for development
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    const { data: subscription, error } = await db
      .from("subscriptions")
      .select(`
        *,
        content_sources (
          id,
          source_type,
          title,
          description,
          image_url,
          feed_url,
          last_fetched_at,
          last_successful_fetch_at,
          fetch_error_count
        )
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Error fetching subscription:", error);
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

    // Use admin client and demo user for development
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    const body = await request.json();
    const validatedData = updateSubscriptionSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (validatedData.customName !== undefined)
      updateData.custom_name = validatedData.customName;
    if (validatedData.folder !== undefined)
      updateData.folder = validatedData.folder;
    if (validatedData.tags) updateData.tags = validatedData.tags;
    if (validatedData.autoSummarize !== undefined)
      updateData.auto_summarize = validatedData.autoSummarize;
    if (validatedData.status) updateData.status = validatedData.status;

    const { data: subscription, error } = await db
      .from("subscriptions")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select(`
        *,
        content_sources (
          id,
          source_type,
          title,
          description,
          image_url
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client and demo user for development
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    // Get source_id before deleting
    const { data: subscription } = await db
      .from("subscriptions")
      .select("source_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!subscription?.source_id) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const sourceId = subscription.source_id;

    // Delete the subscription first
    const { error } = await db
      .from("subscriptions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if any other subscriptions exist for this source
    const { count: remainingSubscriptions } = await db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("source_id", sourceId);

    // If no other subscriptions, delete the source (cascades to content_items and summaries)
    if (remainingSubscriptions === 0) {
      const { error: sourceDeleteError } = await db
        .from("content_sources")
        .delete()
        .eq("id", sourceId);

      if (sourceDeleteError) {
        console.error("Error deleting source:", sourceDeleteError);
        // Don't fail the request - subscription was already deleted
      }
    } else {
      // Just decrement subscriber count if other subscriptions exist
      await db.rpc("decrement_subscriber_count", {
        source_id: sourceId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
