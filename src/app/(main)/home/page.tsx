import { Suspense } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArticleCard } from "@/components/content/article-card";
import { PodcastCard } from "@/components/content/podcast-card";
import { YouTubeCard } from "@/components/content/youtube-card";
import { YouTubeSubmitSection } from "./youtube-submit-section";

// Demo user ID for development without auth
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export const metadata = {
  title: "Home",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          Good {getTimeOfDay()}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what you missed while you were away.
        </p>
      </section>

      {/* Quick Actions with real stats */}
      <Suspense fallback={<QuickActionsSkeleton />}>
        <QuickActionsWithData />
      </Suspense>

      {/* YouTube Submit Section */}
      <YouTubeSubmitSection />

      {/* Recent Content */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Summaries</h2>
          <Link
            href="/content"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <Suspense fallback={<ContentGridSkeleton count={6} />}>
          <RecentContentSection />
        </Suspense>
      </section>

      {/* Continue Listening */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Continue Listening</h2>
        </div>
        <Suspense fallback={<ContentGridSkeleton count={3} />}>
          <ContinueListeningSection />
        </Suspense>
      </section>
    </div>
  );
}

async function QuickActionsWithData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Use admin client for dev mode
  const db = user ? supabase : createAdminClient();
  const userId = user?.id || DEMO_USER_ID;

  let unreadCount = 0;
  let savedCount = 0;

  // Get total content count as "unread" (simplified for now)
  const { count } = await db
    .from("content_items")
    .select("*", { count: "exact", head: true });
  unreadCount = count || 0;

  // Get saved count
  const { count: saved } = await db
    .from("user_content_state")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_saved", true);
  savedCount = saved || 0;

  return (
    <section className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
      <QuickActionCard
        title="Add Source"
        description="Subscribe to a new feed"
        href="/subscriptions?add=true"
        icon="+"
      />
      <QuickActionCard
        title="Unread"
        description={`${unreadCount} new items`}
        href="/?filter=unread"
        icon="📬"
      />
      <QuickActionCard
        title="Saved"
        description={`${savedCount} saved items`}
        href="/?filter=saved"
        icon="🔖"
      />
    </section>
  );
}

async function RecentContentSection() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Use admin client for dev mode
  const db = user ? supabase : createAdminClient();

  // Get recent content items with summaries
  const { data: contentItems } = await db
    .from("content_items")
    .select(`
      *,
      source:content_sources(id, title, source_type, image_url),
      summary:summaries(id, headline, tldr, key_points, quality_score)
    `)
    .order("published_at", { ascending: false })
    .limit(6);

  if (!contentItems || contentItems.length === 0) {
    return (
      <EmptyState
        title="No content yet"
        description="Add your first newsletter, RSS feed, or podcast to get started."
        actionLabel="Add Source"
        actionHref="/subscriptions?add=true"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contentItems.map((item) => {
        const source = Array.isArray(item.source) ? item.source[0] : item.source;
        const summary = Array.isArray(item.summary) ? item.summary[0] : item.summary;

        if (item.content_type === "youtube_video") {
          return (
            <ContentLink key={item.id} href={`/content/${item.id}`}>
              <YouTubeCard
                id={item.id}
                title={item.title}
                channelName={item.youtube_channel_name || source?.title || "Unknown"}
                thumbnailUrl={item.youtube_thumbnail_url || item.image_url}
                durationSeconds={item.duration_seconds}
                publishedAt={item.published_at}
                videoId={item.youtube_video_id}
                hasSummary={!!summary}
                processingStatus={item.processing_status}
              />
            </ContentLink>
          );
        }

        if (item.content_type === "podcast_episode" || item.content_type === "episode") {
          return (
            <ContentLink key={item.id} href={`/content/${item.id}`}>
              <PodcastCard
                id={item.id}
                title={item.title}
                sourceTitle={source?.title || "Unknown"}
                sourceImageUrl={source?.image_url}
                imageUrl={item.image_url}
                durationSeconds={item.audio_duration_seconds || item.duration_seconds}
                publishedAt={item.published_at}
                hasSummary={!!summary}
                description={summary?.tldr}
              />
            </ContentLink>
          );
        }

        return (
          <ContentLink key={item.id} href={`/content/${item.id}`}>
            <ArticleCard
              id={item.id}
              title={item.title}
              sourceTitle={source?.title || "Unknown"}
              sourceImageUrl={source?.image_url}
              imageUrl={item.image_url}
              publishedAt={item.published_at}
              hasSummary={!!summary}
              excerpt={summary?.tldr || item.excerpt}
            />
          </ContentLink>
        );
      })}
    </div>
  );
}

async function ContinueListeningSection() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Use admin client for dev mode
  const db = user ? supabase : createAdminClient();
  const userId = user?.id || DEMO_USER_ID;

  // Get podcasts with progress
  const { data: inProgress } = await db
    .from("user_content_state")
    .select(`
      *,
      content:content_items!inner(
        id, title, image_url, audio_url, audio_duration_seconds,
        source:content_sources(title, image_url)
      )
    `)
    .eq("user_id", userId)
    .gt("playback_position", 0)
    .eq("content.content_type", "podcast_episode")
    .eq("is_read", false)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (!inProgress || inProgress.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No podcasts in progress. Start listening to see your podcasts here.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {inProgress.map((state) => {
        const content = state.content as {
          id: string;
          title: string;
          image_url: string | null;
          audio_url: string | null;
          audio_duration_seconds: number | null;
          source: { title: string; image_url: string | null } | null;
        };

        const progress = content.audio_duration_seconds
          ? Math.round((state.playback_position / content.audio_duration_seconds) * 100)
          : 0;

        return (
          <ContentLink key={content.id} href={`/content/${content.id}`}>
            <PodcastCard
              id={content.id}
              title={content.title}
              sourceTitle={content.source?.title || "Unknown"}
              sourceImageUrl={content.source?.image_url || undefined}
              imageUrl={content.image_url || undefined}
              durationSeconds={content.audio_duration_seconds || undefined}
              playbackProgress={progress}
              mediaUrl={content.audio_url || undefined}
            />
          </ContentLink>
        );
      })}
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex-shrink-0 flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-colors min-w-[200px]"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function QuickActionsSkeleton() {
  return (
    <section className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 flex items-center gap-3 p-4 rounded-xl border bg-card min-w-[200px]"
        >
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </section>
  );
}

function ContentGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <Skeleton className="aspect-[2/1]" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <span className="text-2xl">📭</span>
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description}
      </p>
      <Link
        href={actionHref}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function ContentLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="block">
      {children}
    </Link>
  );
}
