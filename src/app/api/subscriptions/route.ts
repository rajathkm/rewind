import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const folder = searchParams.get("folder");

    let query = supabase
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
          last_fetched_at
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (folder) {
      query = query.eq("folder", folder);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subscriptions: data });
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSubscriptionSchema.parse(body);

    // Check if already subscribed
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_id", validatedData.sourceId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Already subscribed to this source" },
        { status: 409 }
      );
    }

    // Create subscription
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        source_id: validatedData.sourceId,
        custom_name: validatedData.customName,
        folder: validatedData.folder,
        tags: validatedData.tags,
        auto_summarize: validatedData.autoSummarize,
        status: "active",
      })
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

    // Update subscriber count
    await supabase.rpc("increment_subscriber_count", {
      source_id: validatedData.sourceId,
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
