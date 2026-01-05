import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface OPMLOutline {
  title?: string;
  text?: string;
  xmlUrl?: string;
  htmlUrl?: string;
  type?: string;
  children?: OPMLOutline[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".opml") && !file.name.endsWith(".xml")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an OPML or XML file." },
        { status: 400 }
      );
    }

    const content = await file.text();

    // Parse OPML
    const feeds = parseOPML(content);

    if (feeds.length === 0) {
      return NextResponse.json(
        { error: "No feeds found in the OPML file" },
        { status: 400 }
      );
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from("opml_imports")
      .insert({
        user_id: user.id,
        filename: file.name,
        raw_content: content,
        total_feeds: feeds.length,
        status: "processing",
      })
      .select()
      .single();

    if (importError) {
      return NextResponse.json({ error: importError.message }, { status: 500 });
    }

    // Process feeds
    const results = {
      successful: [] as string[],
      failed: [] as { title: string; error: string }[],
    };

    for (const feed of feeds) {
      try {
        // Check if source already exists
        let { data: existingSource } = await supabase
          .from("content_sources")
          .select("id")
          .eq("feed_url", feed.xmlUrl)
          .single();

        let sourceId: string;

        if (existingSource) {
          sourceId = existingSource.id;
        } else {
          // Create new source
          const { data: newSource, error: sourceError } = await supabase
            .from("content_sources")
            .insert({
              source_type: "rss",
              feed_url: feed.xmlUrl,
              website_url: feed.htmlUrl,
              title: feed.title || feed.text || "Untitled Feed",
            })
            .select()
            .single();

          if (sourceError) {
            results.failed.push({
              title: feed.title || feed.xmlUrl,
              error: sourceError.message,
            });
            continue;
          }

          sourceId = newSource.id;
        }

        // Check if subscription already exists
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("source_id", sourceId)
          .single();

        if (!existingSub) {
          // Create subscription
          const { error: subError } = await supabase
            .from("subscriptions")
            .insert({
              user_id: user.id,
              source_id: sourceId,
              folder: feed.folder,
              status: "active",
            });

          if (subError) {
            results.failed.push({
              title: feed.title || feed.xmlUrl,
              error: subError.message,
            });
            continue;
          }
        }

        results.successful.push(feed.title || feed.xmlUrl);
      } catch (error) {
        results.failed.push({
          title: feed.title || feed.xmlUrl,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update import record
    await supabase
      .from("opml_imports")
      .update({
        processed_feeds: feeds.length,
        successful_feeds: results.successful.length,
        failed_feeds: results.failed.length,
        status: "completed",
        error_details: results.failed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importRecord.id);

    return NextResponse.json({
      importId: importRecord.id,
      totalFeeds: feeds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      errors: results.failed,
    });
  } catch (error) {
    console.error("Error importing OPML:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function parseOPML(content: string): Array<{
  title: string;
  text?: string;
  xmlUrl: string;
  htmlUrl?: string;
  folder?: string;
}> {
  const feeds: Array<{
    title: string;
    text?: string;
    xmlUrl: string;
    htmlUrl?: string;
    folder?: string;
  }> = [];

  // Simple regex-based OPML parser
  const outlineRegex =
    /<outline[^>]*(?:xmlUrl|xmlurl)=["']([^"']+)["'][^>]*>/gi;
  const titleRegex = /(?:title|text)=["']([^"']+)["']/i;
  const htmlUrlRegex = /(?:htmlUrl|htmlurl)=["']([^"']+)["']/i;

  // Find folder contexts
  const folderRegex =
    /<outline[^>]*text=["']([^"']+)["'][^>]*>[\s\S]*?<\/outline>/gi;
  let currentFolder: string | undefined;

  // Process each outline element
  let match;
  while ((match = outlineRegex.exec(content)) !== null) {
    const xmlUrl = match[1];
    const outlineTag = match[0];

    const titleMatch = outlineTag.match(titleRegex);
    const htmlUrlMatch = outlineTag.match(htmlUrlRegex);

    feeds.push({
      title: titleMatch?.[1] || "Untitled Feed",
      xmlUrl,
      htmlUrl: htmlUrlMatch?.[1],
      folder: currentFolder,
    });
  }

  return feeds;
}
