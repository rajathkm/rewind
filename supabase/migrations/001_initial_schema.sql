-- ============================================
-- REWIND DATABASE SCHEMA
-- Initial migration for content aggregation platform
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================
create type subscription_type as enum ('newsletter', 'rss', 'podcast');
create type subscription_status as enum ('active', 'paused', 'error', 'pending_verification');
create type content_type as enum ('article', 'episode', 'newsletter_issue');
create type processing_status as enum ('pending', 'processing', 'completed', 'failed', 'retrying');

-- ============================================
-- PROFILES (extends Supabase Auth)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  preferences jsonb default '{
    "summary_length": "medium",
    "auto_summarize": true,
    "digest_frequency": "daily",
    "digest_time": "08:00",
    "theme": "system",
    "font_size": "base"
  }'::jsonb,
  timezone text default 'UTC',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger for new user profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- CONTENT SOURCES
-- ============================================
create table public.content_sources (
  id uuid primary key default uuid_generate_v4(),
  source_type subscription_type not null,

  -- Identifiers
  feed_url text unique,
  newsletter_email text unique,
  website_url text,

  -- Metadata
  title text not null,
  description text,
  author text,
  image_url text,
  language text default 'en',
  categories text[] default '{}',

  -- Podcast-specific
  podcast_metadata jsonb default '{}'::jsonb,

  -- Feed health
  last_fetched_at timestamptz,
  last_successful_fetch_at timestamptz,
  fetch_error_count int default 0,
  last_error_message text,

  -- Discovery metadata
  is_verified boolean default false,
  subscriber_count int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_content_sources_type on public.content_sources(source_type);
create index idx_content_sources_feed_url on public.content_sources(feed_url);
create index idx_content_sources_title_search on public.content_sources using gin(to_tsvector('english', title));

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_id uuid not null references public.content_sources(id) on delete cascade,

  status subscription_status default 'active',

  -- User preferences for this subscription
  custom_name text,
  folder text,
  tags text[] default '{}',
  auto_summarize boolean default true,

  -- Tracking
  last_read_at timestamptz,
  unread_count int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, source_id)
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can create own subscriptions"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
  on public.subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
  on public.subscriptions for delete
  using (auth.uid() = user_id);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_source_id on public.subscriptions(source_id);
create index idx_subscriptions_status on public.subscriptions(status);

-- ============================================
-- CONTENT ITEMS
-- ============================================
create table public.content_items (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references public.content_sources(id) on delete cascade,

  content_type content_type not null,

  -- Core content
  guid text,
  title text not null,
  url text,
  author text,
  content_html text,
  content_text text,
  excerpt text,

  -- Media (for podcasts)
  media_url text,
  media_type text,
  duration_seconds int,
  transcript text,

  -- Metadata
  image_url text,
  published_at timestamptz,
  categories text[] default '{}',

  -- Processing
  processing_status processing_status default 'pending',
  word_count int,
  reading_time_minutes int,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(source_id, guid)
);

create index idx_content_items_source_id on public.content_items(source_id);
create index idx_content_items_published_at on public.content_items(published_at desc);
create index idx_content_items_type on public.content_items(content_type);
create index idx_content_items_processing_status on public.content_items(processing_status);
create index idx_content_items_title_search on public.content_items using gin(to_tsvector('english', title));

-- ============================================
-- USER CONTENT STATE
-- ============================================
create table public.user_content_state (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,

  is_read boolean default false,
  is_saved boolean default false,
  is_archived boolean default false,
  read_progress float default 0,

  read_at timestamptz,
  saved_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, content_id)
);

alter table public.user_content_state enable row level security;

create policy "Users can view own content state"
  on public.user_content_state for select
  using (auth.uid() = user_id);

create policy "Users can manage own content state"
  on public.user_content_state for all
  using (auth.uid() = user_id);

create index idx_user_content_state_user_id on public.user_content_state(user_id);
create index idx_user_content_state_content_id on public.user_content_state(content_id);

-- ============================================
-- SUMMARIES
-- ============================================
create table public.summaries (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid not null references public.content_items(id) on delete cascade,

  summary_type text not null default 'detailed',

  -- Summary content
  headline text,
  tldr text,
  full_summary text,
  key_points jsonb default '[]'::jsonb,

  -- Structured takeaways
  key_takeaways jsonb default '[]'::jsonb,
  related_ideas jsonb default '[]'::jsonb,
  allied_trivia jsonb default '[]'::jsonb,

  -- AI metadata
  model_used text,
  tokens_used jsonb,
  processing_time_ms int,
  quality_score float,

  created_at timestamptz default now(),

  unique(content_id, summary_type)
);

create index idx_summaries_content_id on public.summaries(content_id);

-- ============================================
-- PROCESSING JOBS
-- ============================================
create table public.processing_jobs (
  id uuid primary key default uuid_generate_v4(),

  job_type text not null,

  -- References
  source_id uuid references public.content_sources(id) on delete cascade,
  content_id uuid references public.content_items(id) on delete cascade,

  -- Job data
  payload jsonb default '{}'::jsonb,

  -- Status tracking
  status processing_status default 'pending',
  priority int default 0,

  -- Retry logic
  attempts int default 0,
  max_attempts int default 3,
  last_error text,

  -- Scheduling
  scheduled_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_processing_jobs_status on public.processing_jobs(status);
create index idx_processing_jobs_type on public.processing_jobs(job_type);
create index idx_processing_jobs_scheduled on public.processing_jobs(scheduled_at) where status = 'pending';

-- ============================================
-- OPML IMPORTS
-- ============================================
create table public.opml_imports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  filename text,
  raw_content text,

  -- Progress tracking
  total_feeds int default 0,
  processed_feeds int default 0,
  successful_feeds int default 0,
  failed_feeds int default 0,

  status processing_status default 'pending',
  error_details jsonb default '[]'::jsonb,

  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.opml_imports enable row level security;

create policy "Users can view own imports"
  on public.opml_imports for select
  using (auth.uid() = user_id);

create policy "Users can create own imports"
  on public.opml_imports for insert
  with check (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user's feed with content
create or replace function get_user_feed(
  p_user_id uuid,
  p_limit int default 50,
  p_offset int default 0,
  p_source_type subscription_type default null,
  p_unread_only boolean default false
)
returns table (
  content_id uuid,
  source_id uuid,
  source_title text,
  source_type subscription_type,
  source_image_url text,
  title text,
  excerpt text,
  image_url text,
  published_at timestamptz,
  duration_seconds int,
  reading_time_minutes int,
  is_read boolean,
  is_saved boolean,
  has_summary boolean
)
language plpgsql
security definer
as $$
begin
  return query
  select
    ci.id as content_id,
    cs.id as source_id,
    cs.title as source_title,
    cs.source_type,
    cs.image_url as source_image_url,
    ci.title,
    ci.excerpt,
    ci.image_url,
    ci.published_at,
    ci.duration_seconds,
    ci.reading_time_minutes,
    coalesce(ucs.is_read, false) as is_read,
    coalesce(ucs.is_saved, false) as is_saved,
    exists(select 1 from public.summaries s where s.content_id = ci.id) as has_summary
  from public.subscriptions sub
  join public.content_sources cs on cs.id = sub.source_id
  join public.content_items ci on ci.source_id = cs.id
  left join public.user_content_state ucs on ucs.content_id = ci.id and ucs.user_id = p_user_id
  where sub.user_id = p_user_id
    and sub.status = 'active'
    and (p_source_type is null or cs.source_type = p_source_type)
    and (not p_unread_only or coalesce(ucs.is_read, false) = false)
  order by ci.published_at desc
  limit p_limit
  offset p_offset;
end;
$$;

-- Function to update timestamps automatically
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add update triggers
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

create trigger update_content_sources_updated_at
  before update on public.content_sources
  for each row execute function update_updated_at();

create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function update_updated_at();

create trigger update_content_items_updated_at
  before update on public.content_items
  for each row execute function update_updated_at();

create trigger update_user_content_state_updated_at
  before update on public.user_content_state
  for each row execute function update_updated_at();

create trigger update_processing_jobs_updated_at
  before update on public.processing_jobs
  for each row execute function update_updated_at();
