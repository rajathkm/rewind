import { Suspense } from "react";
import Link from "next/link";
import { Plus, BookOpen, Bookmark, ArrowRight, Sparkles, Play, Headphones } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-10 pb-8">
      {/* Hero Welcome Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] p-8 lg:p-10">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[hsl(var(--accent))]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <Badge variant="glass" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Insights
          </Badge>
          <h1 className="heading-display text-3xl lg:text-4xl text-white mb-3">
            Good {getTimeOfDay()}.
          </h1>
          <p className="text-white/70 text-lg max-w-xl">
            Your knowledge awaits. Here&apos;s what you missed while you were away.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button asChild variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Link href="/subscriptions?add=true">
                <Plus className="w-4 h-4" />
                Add Source
              </Link>
            </Button>
            <Button asChild variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="/content">
                Browse Library
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Actions with real stats */}
      <Suspense fallback={<QuickActionsSkeleton />}>
        <QuickActionsWithData />
      </Suspense>

      {/* YouTube Submit Section */}
      <YouTubeSubmitSection />

      {/* Recent Content */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Recent Summaries</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Your latest distilled knowledge</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/content">
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <Suspense fallback={<ContentGridSkeleton count={6} />}>
          <RecentContentSection />
        </Suspense>
      </section>

      {/* Continue Listening */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Headphones className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Continue Listening</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Pick up where you left off</p>
            </div>
          </div>
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
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <QuickActionCard
        title="Add Source"
        description="Subscribe to newsletters, podcasts & more"
        href="/subscriptions?add=true"
        icon={<Plus className="w-5 h-5" />}
        variant="primary"
      />
      <QuickActionCard
        title="Unread"
        description={`${unreadCount} items waiting for you`}
        href="/content?filter=unread"
        icon={<BookOpen className="w-5 h-5" />}
        count={unreadCount}
      />
      <QuickActionCard
        title="Saved"
        description={`${savedCount} bookmarked items`}
        href="/content?filter=saved"
        icon={<Bookmark className="w-5 h-5" />}
        count={savedCount}
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
        description="Add your first newsletter, RSS feed, or podcast to get started with AI-powered summaries."
        actionLabel="Add Source"
        actionHref="/subscriptions?add=true"
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {contentItems.map((item, index) => {
        const source = Array.isArray(item.source) ? item.source[0] : item.source;
        const summary = Array.isArray(item.summary) ? item.summary[0] : item.summary;

        if (item.content_type === "youtube_video") {
          return (
            <ContentLink key={item.id} href={`/content/${item.id}`} index={index}>
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
            <ContentLink key={item.id} href={`/content/${item.id}`} index={index}>
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
                mediaUrl={item.audio_url}
              />
            </ContentLink>
          );
        }

        return (
          <ContentLink key={item.id} href={`/content/${item.id}`} index={index}>
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
      <Card variant="outline" className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Play className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">
          No podcasts in progress. Start listening to see your podcasts here.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {inProgress.map((state, index) => {
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
          <ContentLink key={content.id} href={`/content/${content.id}`} index={index}>
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
  count,
  variant = "default",
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  count?: number;
  variant?: "default" | "primary";
}) {
  return (
    <Link href={href} className="block group">
      <Card
        variant="interactive"
        className={`p-5 h-full ${
          variant === "primary"
            ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40"
            : ""
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${
            variant === "primary"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          } transition-colors`}>
            {icon}
          </div>
          {count !== undefined && count > 0 && (
            <Badge variant={variant === "primary" ? "default" : "secondary"} size="sm">
              {count}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-base mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </Card>
    </Link>
  );
}

function QuickActionsSkeleton() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <Skeleton className="w-8 h-5 rounded-full" />
          </div>
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-4 w-full" />
        </Card>
      ))}
    </section>
  );
}

function ContentGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-[16/9]" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </Card>
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
    <Card variant="outline" className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
        {description}
      </p>
      <Button asChild variant="gradient">
        <Link href={actionHref}>
          <Plus className="w-4 h-4" />
          {actionLabel}
        </Link>
      </Button>
    </Card>
  );
}

function ContentLink({
  href,
  children,
  index = 0,
}: {
  href: string;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <Link
      href={href}
      className={`block animate-in stagger-${Math.min(index + 1, 6)}`}
      style={{ animationFillMode: 'both' }}
    >
      {children}
    </Link>
  );
}
