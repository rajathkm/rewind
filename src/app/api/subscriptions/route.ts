import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSourceById } from "@/lib/sync/content-sync";
import { z } from "zod";

// Demo user ID for development without auth
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

const createSubscriptionSchema = z.object({
  sourceId: z.string().uuid(),
  customName: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).default([]),
  autoSummarize: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client and demo user for development
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const folder = searchParams.get("folder");

    let query = db
      .from("subscriptions")
      .select(`
        *,
        source:content_sources (
          id,
          source_type,
          title,
          description,
          image_url,
          feed_url,
          last_fetched_at,
          fetch_error_count
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (folder) {
      query = query.eq("folder", folder);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Subscriptions query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subscriptions: data || [] });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client and demo user for development
    const db = user ? supabase : createAdminClient();
    const userId = user?.id || DEMO_USER_ID;

    const body = await request.json();
    const validatedData = createSubscriptionSchema.parse(body);

    // Check if already subscribed
    const { data: existing } = await db
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("source_id", validatedData.sourceId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Already subscribed to this source" },
        { status: 409 }
      );
    }

    // Create subscription
    const { data: subscription, error } = await db
      .from("subscriptions")
      .insert({
        user_id: userId,
        source_id: validatedData.sourceId,
        custom_name: validatedData.customName,
        folder: validatedData.folder,
        tags: validatedData.tags,
        auto_summarize: validatedData.autoSummarize,
        status: "active",
      })
      .select(`
        *,
        source:content_sources (
          id,
          source_type,
          title,
          description,
          image_url
        )
      `)
      .single();

    if (error) {
      console.error("Subscription insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update subscriber count
    await db.rpc("increment_subscriber_count", {
      source_id: validatedData.sourceId,
    });

    // Trigger immediate sync for the newly subscribed source (non-blocking)
    // This fetches content in the background so the user sees it quickly
    syncSourceById(validatedData.sourceId)
      .then((result) => {
        console.log(`[Subscription] Synced source ${validatedData.sourceId}: ${result.itemsAdded} items added`);
      })
      .catch((error) => {
        console.error(`[Subscription] Failed to sync source ${validatedData.sourceId}:`, error);
      });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
