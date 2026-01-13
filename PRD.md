# Rewind - Product Requirements Document (PRD)

## Executive Summary

**Rewind** is a personal content aggregation and AI-powered summarization platform designed to help users stay informed efficiently. It consolidates content from newsletters, RSS feeds, and podcasts, generates intelligent summaries using AI, and provides an intuitive interface for reading and listening to content.

### Vision Statement
*"Never miss an insight again. Rewind intelligently aggregates, summarizes, and surfaces the content that matters most to you."*

### Problem Statement
- **Information overload**: Users subscribe to dozens of newsletters, RSS feeds, and podcasts
- **Time constraints**: Consuming all subscribed content is impractical
- **Content discovery**: Finding key insights in long articles or podcast episodes is difficult
- **Fragmentation**: Managing subscriptions across different platforms creates friction

### Solution
A unified platform that:
1. Aggregates content from multiple sources (RSS, podcasts, newsletters)
2. Generates AI-powered summaries with key takeaways
3. Provides a clean, distraction-free reading/listening experience
4. Works offline via PWA capabilities

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| UI Components | Radix UI, Lucide Icons |
| State Management | Zustand (with persistence) |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| AI/LLM | OpenAI API (GPT-4O) |
| Content Parsing | rss-parser |
| PWA | Serwist (service worker) |
| Offline Storage | IndexedDB (via idb) |
| Validation | Zod |

---

## Core Features

### 1. Content Aggregation

#### 1.1 Source Types
| Type | Status | Notes |
|------|--------|-------|
| RSS Feeds | **Implemented** | Auto-detection, parsing, sync |
| Podcasts | **Implemented** | Audio extraction, duration parsing |
| Newsletters | **Partial** | Schema exists, no email ingestion |

#### 1.2 Source Management
| Feature | Status | Notes |
|---------|--------|-------|
| Add source via URL | **Implemented** | Auto-detects feed type |
| OPML import | **Implemented** | Bulk import with folder preservation |
| Source validation | **Implemented** | Validates URL, extracts metadata |
| Pause/resume sources | **Implemented** | Per-subscription control |
| Delete subscription | **Implemented** | With confirmation |
| Custom source names | **Implemented** | User can rename |
| Folder organization | **Partial** | DB field exists, UI incomplete |
| Tags | **Partial** | DB field exists, UI incomplete |

#### 1.3 Content Sync
| Feature | Status | Notes |
|---------|--------|-------|
| Manual sync (all sources) | **Implemented** | Via UI button |
| Manual sync (single source) | **Implemented** | Per-source refresh |
| Scheduled sync (cron) | **Implemented** | API endpoint ready, needs cron setup |
| Error handling & retry | **Implemented** | Auto-deactivates after 5 failures |
| Content deduplication | **Implemented** | Via external_id + content_hash |
| Incremental sync | **Implemented** | Only adds new/changed items |

### 2. AI Summarization

#### 2.1 Summary Generation
| Feature | Status | Notes |
|---------|--------|-------|
| On-demand summary | **Implemented** | User-triggered |
| Auto-summarization | **Implemented** | Batch processing endpoint |
| Short content handling | **Implemented** | Single-pass summarization |
| Long content handling | **Implemented** | Chunked summarization with combination |
| Podcast summaries | **Implemented** | Specialized prompts (needs transcripts) |

#### 2.2 Summary Structure
| Component | Status | Notes |
|-----------|--------|-------|
| Headline | **Implemented** | One-line summary |
| TL;DR | **Implemented** | 2-3 sentence summary |
| Full summary | **Implemented** | Detailed summary |
| Key points | **Implemented** | Bullet list of main points |
| Key takeaways | **Implemented** | Actionable insights |
| Related ideas | **Implemented** | Connected concepts |
| Allied trivia | **Implemented** | Interesting related facts |
| Podcast speakers | **Partial** | Schema exists, extraction incomplete |

#### 2.3 Cost & Rate Management
| Feature | Status | Notes |
|---------|--------|-------|
| Token counting | **Implemented** | Pre-request estimation |
| Rate limiting | **Implemented** | RPM/TPM controls |
| Cost tracking | **Implemented** | Per-operation tracking |
| Budget limits | **Implemented** | Daily/monthly caps |

### 3. User Interface

#### 3.1 Pages
| Page | Status | Notes |
|------|--------|-------|
| Home (/) | **Implemented** | Dashboard with recent summaries, continue listening |
| Subscriptions | **Implemented** | Source management, add/edit/delete |
| Search | **Implemented** | Full-text with filters |
| Content Detail | **Implemented** | Article view, summary display, podcast player |
| Offline | **Implemented** | Offline fallback page |

#### 3.2 Components
| Component | Status | Notes |
|-----------|--------|-------|
| ArticleCard | **Implemented** | Multiple variants (default, compact, featured) |
| PodcastCard | **Implemented** | With progress, duration |
| SummaryDisplay | **Implemented** | Tabbed view for summary sections |
| MiniPlayer | **Implemented** | Floating audio controls |
| Sidebar | **Implemented** | Navigation, filters |
| Header | **Implemented** | Search, user menu |
| Bottom Nav | **Implemented** | Mobile navigation |
| Responsive Shell | **Implemented** | Adaptive layout |

#### 3.3 Audio Features
| Feature | Status | Notes |
|---------|--------|-------|
| Play/pause | **Implemented** | Via global audio store |
| Progress tracking | **Implemented** | Persisted per episode |
| Playback speed | **Partial** | Store supports it, UI incomplete |
| Sleep timer | **Partial** | Store supports it, UI incomplete |
| Queue management | **Partial** | Store supports it, UI incomplete |
| Continue listening | **Implemented** | Resumes from last position |
| Mini player | **Implemented** | Floating controls |

### 4. User State & Personalization

#### 4.1 Content State
| Feature | Status | Notes |
|---------|--------|-------|
| Mark as read | **Implemented** | Auto-marked when viewing |
| Save/bookmark | **Implemented** | Toggle in detail view |
| Archive | **Partial** | DB field exists, UI incomplete |
| Read progress | **Partial** | DB field exists, not fully used |
| Playback position | **Implemented** | For podcasts |

#### 4.2 User Preferences
| Feature | Status | Notes |
|---------|--------|-------|
| Theme (light/dark/system) | **Partial** | Store exists, implementation incomplete |
| Font size | **Partial** | Store exists, not applied |
| Summary length preference | **Partial** | DB field exists, not used |
| Digest frequency | **Not Implemented** | DB field exists |
| Digest time | **Not Implemented** | DB field exists |

### 5. Authentication & Authorization

| Feature | Status | Notes |
|---------|--------|-------|
| Email/password auth | **Partial** | Supabase configured, UI incomplete |
| OAuth providers | **Not Implemented** | Supabase supports it |
| Demo mode | **Implemented** | Development without auth |
| Row-level security | **Implemented** | Full RLS policies |
| Protected routes | **Partial** | Cron routes protected |

### 6. Search & Discovery

| Feature | Status | Notes |
|---------|--------|-------|
| Full-text search | **Implemented** | Title, excerpt, content |
| Filter by type | **Implemented** | Article/podcast |
| Filter by source | **Not Implemented** | Field exists in API |
| Filter by date | **Not Implemented** | API supports it |
| Pagination | **Implemented** | Load more |
| Fuzzy matching | **Implemented** | pg_trgm extension |

### 7. Offline Support

| Feature | Status | Notes |
|---------|--------|-------|
| Service worker | **Implemented** | Via Serwist |
| API response caching | **Partial** | Service worker configured |
| IndexedDB storage | **Implemented** | Audio cache store |
| Offline indicator | **Implemented** | Component exists |
| Offline content access | **Partial** | Infrastructure ready, sync incomplete |

---

## What's Missing for Production

### Critical (P0) - Must Have

#### 1. Authentication System
- [ ] Login/signup pages with proper UI
- [ ] Password reset flow
- [ ] Session management
- [ ] Protected route middleware
- [ ] User onboarding flow

#### 2. Newsletter Email Ingestion
- [ ] Email forwarding setup (Postmark, SendGrid, or custom)
- [ ] Email parsing to extract content
- [ ] Unique email addresses per user for forwarding
- [ ] Email verification for newsletter subscriptions

#### 3. Error Handling & Resilience
- [ ] Global error boundary
- [ ] API error standardization
- [ ] User-friendly error messages
- [ ] Retry UI for failed operations
- [ ] Graceful degradation

#### 4. Production Deployment
- [ ] Environment variable documentation
- [ ] Production database setup
- [ ] Vercel cron job configuration
- [ ] Domain and SSL setup
- [ ] Rate limiting for public APIs

### High Priority (P1) - Should Have

#### 5. Testing
- [ ] Unit tests for utilities
- [ ] API route tests
- [ ] Component tests
- [ ] E2E tests for critical flows
- [ ] CI/CD pipeline

#### 6. Monitoring & Observability
- [ ] Error tracking (Sentry)
- [ ] Analytics (Plausible/Posthog)
- [ ] Performance monitoring
- [ ] API metrics
- [ ] Cost monitoring dashboard

#### 7. User Experience Enhancements
- [ ] Loading states (skeleton screens done, but need polish)
- [ ] Toast notifications for actions
- [ ] Confirmation dialogs
- [ ] Keyboard shortcuts
- [ ] Mobile gestures (swipe to save, etc.)

#### 8. Theme System
- [ ] Complete dark mode implementation
- [ ] Theme toggle in UI
- [ ] System preference detection
- [ ] Persist theme choice

### Medium Priority (P2) - Nice to Have

#### 9. Advanced Features
- [ ] Daily/weekly digest emails
- [ ] Reading time estimates based on user speed
- [ ] Content recommendations
- [ ] Share to social
- [ ] Export summaries

#### 10. Folder & Organization
- [ ] Folder CRUD UI
- [ ] Drag-drop organization
- [ ] Smart folders (auto-filter rules)
- [ ] Tag management UI

#### 11. Audio Enhancements
- [ ] Playback speed UI controls
- [ ] Sleep timer UI
- [ ] Episode queue UI
- [ ] Download for offline
- [ ] Transcript generation (Whisper API)

#### 12. Search Improvements
- [ ] Source filter UI
- [ ] Date range picker
- [ ] Advanced search syntax
- [ ] Search history
- [ ] Saved searches

### Low Priority (P3) - Future Enhancements

#### 13. Social Features
- [ ] Share summaries publicly
- [ ] Collections/lists
- [ ] Export to Notion/Obsidian

#### 14. Integrations
- [ ] Pocket/Instapaper import
- [ ] Readwise integration
- [ ] Calendar integration for podcasts
- [ ] Zapier/Make webhooks

#### 15. Admin Features
- [ ] Usage dashboard
- [ ] User management
- [ ] Content moderation
- [ ] System health monitoring

---

## Database Schema Summary

```
Tables:
├── profiles           - User accounts (extends Supabase Auth)
├── content_sources    - RSS feeds, podcasts, newsletters
├── subscriptions      - User <-> Source relationships
├── content_items      - Articles, episodes, newsletter issues
├── user_content_state - Per-user read/save state
├── summaries          - AI-generated summaries
├── processing_jobs    - Background job queue
└── opml_imports       - Bulk import tracking

Key Relationships:
- profiles (1) --> (N) subscriptions
- content_sources (1) --> (N) subscriptions
- content_sources (1) --> (N) content_items
- content_items (1) --> (N) user_content_state
- content_items (1) --> (N) summaries
```

---

## API Endpoints Summary

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/content` | GET | Fetch user's content feed |
| `/api/content/[id]` | GET, PATCH | Get/update single content |
| `/api/content/[id]/summary` | POST | Generate AI summary |
| `/api/sources` | GET, POST | List/create sources |
| `/api/sources/[id]` | GET, PATCH, DELETE | Manage single source |
| `/api/sources/validate` | POST | Validate URL |
| `/api/subscriptions` | GET, POST | List/create subscriptions |
| `/api/subscriptions/[id]` | PATCH, DELETE | Update/delete subscription |
| `/api/search` | GET | Full-text search |
| `/api/sync` | GET, POST | Trigger content sync (cron) |
| `/api/sync/[sourceId]` | POST | Sync single source |
| `/api/summarize` | GET, POST | Trigger auto-summarization |
| `/api/import/opml` | POST | Import OPML file |
| `/api/health` | GET | Health check |

---

## Environment Variables

### Required
```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

### Optional
```env
# OpenAI Configuration
OPENAI_MODEL=gpt-4o
OPENAI_DAILY_BUDGET=10
OPENAI_MONTHLY_BUDGET=100
OPENAI_RATE_LIMIT_RPM=60
OPENAI_RATE_LIMIT_TPM=90000

# Client-side
NEXT_PUBLIC_CRON_SECRET=
```

---

## Implementation Roadmap

### Phase 1: Production Foundation (2-3 weeks)
- [ ] Complete authentication UI (login, signup, password reset)
- [ ] Add error boundaries and proper error handling
- [ ] Set up production environment
- [ ] Configure Vercel cron jobs for sync
- [ ] Add basic monitoring (Sentry)
- [ ] Write critical tests

### Phase 2: Core Polish (2 weeks)
- [ ] Complete theme system
- [ ] Add toast notifications
- [ ] Polish loading states
- [ ] Mobile UX improvements
- [ ] Performance optimization

### Phase 3: Newsletter Support (2 weeks)
- [ ] Email ingestion infrastructure
- [ ] Newsletter parsing
- [ ] User email addresses
- [ ] Forwarding instructions UI

### Phase 4: Advanced Features (3 weeks)
- [ ] Digest emails
- [ ] Transcript generation
- [ ] Folder organization UI
- [ ] Advanced search filters
- [ ] Audio playback enhancements

### Phase 5: Scale & Polish (Ongoing)
- [ ] Analytics and insights
- [ ] Social sharing
- [ ] Integrations
- [ ] Performance tuning
- [ ] User feedback iteration

---

## Metrics & Success Criteria

### Key Metrics
- Daily Active Users (DAU)
- Summaries generated per user
- Content items synced per day
- Average session duration
- Podcast listening completion rate

### Production Readiness Checklist
- [ ] All P0 items completed
- [ ] 80%+ test coverage on critical paths
- [ ] <3s page load time
- [ ] <500ms API response time
- [ ] 99.9% uptime target
- [ ] Error rate <1%
- [ ] WCAG 2.1 AA accessibility

---

## Appendix

### Current File Structure
```
src/
├── app/
│   ├── (main)/           # Main app routes
│   │   ├── home/
│   │   ├── search/
│   │   ├── subscriptions/
│   │   └── content/[id]/
│   ├── api/              # API routes
│   └── offline/          # Offline fallback
├── components/
│   ├── audio/            # Mini player
│   ├── content/          # Article, podcast cards, summary
│   ├── layout/           # Shell, sidebar, header, nav
│   ├── offline/          # Offline indicator
│   └── ui/               # Base UI components
├── lib/
│   ├── content/          # Chunker, extractor
│   ├── openai/           # Client, rate limiter, cost tracker
│   ├── summarization/    # Prompts, schema, summarizer
│   ├── supabase/         # DB clients
│   └── sync/             # Content sync, auto-summarize
├── stores/               # Zustand stores
├── hooks/                # Custom React hooks
└── types/                # TypeScript types
```

### Tech Debt & Known Issues
1. Demo user mode should be removed for production
2. Some Supabase queries use admin client unnecessarily
3. Content extraction could be improved for complex HTML
4. No retry logic for failed summary generation in UI
5. Podcast transcript field unused (no transcript source)
6. Some API routes return inconsistent response formats

---

*Document Version: 1.0*
*Last Updated: January 2025*
*Author: Generated from codebase analysis*
