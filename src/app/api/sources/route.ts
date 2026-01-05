import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const createSourceSchema = z.object({
  sourceType: z.enum(["newsletter", "rss", "podcast"]),
  feedUrl: z.string().url().optional().or(z.literal("")),
  newsletterEmail: z.string().email().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  author: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  categories: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client if no user (development mode)
    const db = user ? supabase : createAdminClient();

    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get("type");
    const search = searchParams.get("search");

    let query = db
      .from("content_sources")
      .select("*")
      .order("title", { ascending: true });

    if (sourceType) {
      query = query.eq("source_type", sourceType);
    }

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sources: data });
  } catch (error) {
    console.error("Error fetching sources:", error);
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

    // Use admin client if no user (development mode)
    const db = user ? supabase : createAdminClient();

    const body = await request.json();
    const validatedData = createSourceSchema.parse(body);

    // Check if source already exists
    let existingSource = null;
    if (validatedData.feedUrl) {
      const { data } = await db
        .from("content_sources")
        .select("id")
        .eq("feed_url", validatedData.feedUrl)
        .single();
      existingSource = data;
    } else if (validatedData.newsletterEmail) {
      const { data } = await db
        .from("content_sources")
        .select("id")
        .eq("newsletter_email", validatedData.newsletterEmail)
        .single();
      existingSource = data;
    }

    if (existingSource) {
      return NextResponse.json({
        source: existingSource,
        message: "Source already exists",
      });
    }

    // Create new source (convert empty strings to null)
    const { data: newSource, error } = await db
      .from("content_sources")
      .insert({
        source_type: validatedData.sourceType,
        feed_url: validatedData.feedUrl || null,
        newsletter_email: validatedData.newsletterEmail || null,
        website_url: validatedData.websiteUrl || null,
        title: validatedData.title,
        description: validatedData.description || null,
        author: validatedData.author || null,
        image_url: validatedData.imageUrl || null,
        categories: validatedData.categories,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ source: newSource }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
