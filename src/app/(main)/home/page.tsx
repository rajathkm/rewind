import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Home",
};

export default function HomePage() {
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

      {/* Quick Actions */}
      <section className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <QuickActionCard
          title="Add Source"
          description="Subscribe to a new feed"
          href="/subscriptions?add=true"
          icon="+"
        />
        <QuickActionCard
          title="Unread"
          description="12 new items"
          href="/?filter=unread"
          icon="📬"
        />
        <QuickActionCard
          title="Saved"
          description="5 saved items"
          href="/?filter=saved"
          icon="🔖"
        />
      </section>

      {/* Recent Summaries */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Summaries</h2>
          <a
            href="/content"
            className="text-sm text-primary hover:underline"
          >
            View all
          </a>
        </div>
        <Suspense fallback={<ContentGridSkeleton count={6} />}>
          <EmptyState
            title="No content yet"
            description="Add your first newsletter, RSS feed, or podcast to get started."
            actionLabel="Add Source"
            actionHref="/subscriptions?add=true"
          />
        </Suspense>
      </section>

      {/* Continue Listening */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Continue Listening</h2>
        </div>
        <Suspense fallback={<ContentGridSkeleton count={3} />}>
          <p className="text-sm text-muted-foreground">
            No podcasts in progress. Start listening to see your podcasts here.
          </p>
        </Suspense>
      </section>
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
    <a
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
    </a>
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
      <a
        href={actionHref}
        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {actionLabel}
      </a>
    </div>
  );
}
