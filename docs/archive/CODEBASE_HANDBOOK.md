# CODEBASE HANDBOOK

A practical, end-to-end guide to understand, run, and extend this project. It covers the tech stack, architecture, core modules, API routes, database, environment variables, and common workflows.

## Overview

- Framework: Next.js 16 (App Router) with React 19 and TypeScript 5
- Styling/UI: Tailwind CSS 4, Radix UI primitives, Lucide icons, custom UI components in `components/ui`
- Backend runtime: Next.js API routes (edge/server), Supabase (Auth, Postgres, Realtime, RLS)
- AI: Vercel AI SDK (`ai`) + OpenAI (via model `openai/gpt-4o-mini`) and Google Gemini (`gemini-2.5-flash` in realtime)
- Realtime & Orchestration: Supabase Realtime channels + Upstash Redis as state machine store
- Data model: `auth.users` + `student_profiles` are the identity root; learning artifacts (sessions, progress, assessment, feedback) relate to the user id

## Tech stack (versions)

- next: 16.0.0
- react: 19.2.0, react-dom: 19.2.0
- typescript: ^5
- tailwindcss: ^4.1.9 (+ @tailwindcss/postcss)
- @supabase/supabase-js, @supabase/ssr: latest
- ai: latest, @ai-sdk/google: latest
- @upstash/redis: ^1.35.6
- zod: 3.25.76
- recharts, date-fns, sonner, Radix UI packages, lucide-react

See `package.json` for the full list and scripts.

## Project structure

Top-level files to know:
- `next.config.mjs` – Next.js config (build types ignored, unoptimized images)
- `tsconfig.json` – strict TS, path alias `@/*` to project root
- `middleware.ts` – Supabase auth session propagation (via `lib/supabase/middleware`)
- `styles/globals.css` and `app/globals.css` – global styles
- `scripts/` – SQL schema, seeds, verification, and consolidated setup scripts

Folders:
- `app/` – Next.js App Router pages and API routes
  - `(auth)/login/` – login UI route
  - `dashboard/` – student/teacher dashboards and pages
  - `api/` – all server endpoints (see “API routes” below)
  - `setup/` – product setup flow UI
- `lib/` – backend/infra code (Supabase, Redis, AI, orchestration, utilities)
- `components/` – UI components (assessment, tutor, analytics, realtime, etc.)
- `hooks/` – custom React hooks for realtime, system integration, toasts, mobile
- `types/` – shared TypeScript types

## Database

- Provider: Supabase (Postgres + RLS)
- Identity: `auth.users` (managed by Supabase); `student_profiles` is a 1:1 profile table keyed by the `auth.users.id` UUID.
- RLS: Enabled on sensitive tables with policies granting row access to the owning user; service role key is used on server API routes when privileged access is required.
- Triggers: Standard `updated_at` triggers defined in scripts to keep audit timestamps current.
- Canonical setup: `scripts/COMPLETE_PRODUCTION_SETUP.sql` is a single idempotent script that creates the entire schema, indexes, RLS policies, and helper triggers. Use it for fresh environments and CI.

Other helpful scripts:
- `02-seed-test-account.sql` – seed developer/test account
- `11-verify-installation.sql` – sanity checks after setup
- `06-lesson-progress-tracking.sql`, `06-curriculum-analytics-*.sql` – domain tables with RLS/policies
- `09-optimized-user-centric-schema.sql` – monolithic reference schema (basis for the consolidated setup)

Note: The codebase assumes the user’s UUID is the primary foreign key in all user-scoped tables (e.g., `learning_sessions`, `lesson_progress`, etc.). For an exhaustive list of tables and policies, refer to the SQL scripts, especially `COMPLETE_PRODUCTION_SETUP.sql`.

## Environment variables

Place these in a `.env.local` (development) or your deployment environment. See `.env.example` for placeholders.

Required core:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)
- NEXT_PUBLIC_APP_URL (e.g., http://localhost:3000)

AI and integrations (enable by feature):
- OPENAI_API_KEY
- GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_AI_KEY or GEMINI_API_KEY
- TAVILY_API_KEY
- GOOGLE_CUSTOM_SEARCH_API_KEY, GOOGLE_CUSTOM_SEARCH_ENGINE_ID (image search)
- UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

## API routes

Under `app/api/` (file-based routes). Key groups and purpose:

- agents/
  - `generate-curriculum` – builds a curriculum for a student/topic (invoked by the orchestrator)
  - `parse-syllabus` – syllabus->structure parsing (helper agent)
  - `curriculum-editor` – edits/updates curriculum artifacts
  - `orchestrate` – state machine to move between teaching, assessment, and feedback phases (uses Upstash Redis)
- assessment/
  - `generate`, `generate-quiz` – produce assessment items/quiz for the current concept
  - `validate`, `evaluate` – validate/evaluate student responses
  - `submit-results` – persists results, may trigger downstream feedback
- assignment/
  - `generate`, `generate-adaptive`, `evaluate`, `list` – assignment flows and adaptive generation
- feedback/
  - `analyze` – targeted feedback
  - `comprehensive` – full feedback aggregation for a session
- session/
  - `initialize` – creates a row in `learning_sessions` and returns a session id
  - `end` – wraps up a session
  - `summary` – returns computed summary for a given session
- tutor/
  - `chat`, `chat-enhanced` – tutor chat endpoints (enhanced uses images/search and richer context)
  - `fetch-images`, `generate-visual-teaching` – image and visual content helpers
  - `session/` – (nested tutor session helpers)
  - `submit-rating` – student rating of tutor
- auth/
  - `callback`, `setup`, `setup-test-account` – auth helpers and test bootstrap
- images/
  - `search` – Google Custom Search image results
- setup/
  - `route.ts` – integrated setup endpoint guarded for dev usage

Example contract: `POST /api/session/initialize`
- Input: `{ studentId: string, topic: string, gradeLevel?: string|number, learningStyle?: string }`
- Output: `{ sessionId: string, message: string } | { error: string }`

## Core libraries (`lib/`)

- Supabase
  - `supabase-client.ts` – client for browser and server; uses anon or service role key
  - `supabase-server.ts` – server-side client with cookie integration
  - `supabase/middleware.ts` – `updateSession` for auth propagation in `middleware.ts`
- AI & Agents
  - `ai-sdk-client.ts` – tutorResponse (OpenAI gpt-4o-mini) and feedbackAgent (returns structured JSON)
  - `agents/*` – domain-specific agents: assessment, assignment, curriculum, feedback, memory, resource, tutor
  - `real-time-session-manager.ts` – Supabase realtime channel management, instant feedback via Gemini + zod
  - `tavily-client.ts`, `google-image-search.ts`, `rag-engine.ts` – retrieval/search helpers
- Orchestration & State
  - `redis-client.ts` – Upstash Redis client and helpers
  - `system-integration.ts` – processes assessment/game completions, recommendations, session updates, event logs
  - `session-persistence.ts` – convenience persister for session data
- Utilities & Types
  - `types.ts`, `types/` – shared types (StudentProfile, LearningSession, etc.)
  - `utils.ts`, `streaming-utils.ts`, `realtime-hooks.ts` – misc helpers

## UI components (`components/`)

Highlights:
- Assessment: `assessment-question.tsx`, `assessment-modal.tsx`, `assessment-popup.tsx`, `quiz-game.tsx`
- Tutor & Realtime: `tutor-interface.tsx`, `tutor-conversation.tsx`, `realtime-session-monitor.tsx`, `streaming-tutor-message.tsx`
- Analytics & Feedback: `progress-chart.tsx`, `feedback-view.tsx`, `integrated-feedback-view.tsx`, `live-dashboard-stats.tsx`, `live-notifications.tsx`
- Dashboard & Shell: `dashboard-overview.tsx`, `sidebar.tsx`, `theme-provider.tsx`, `resource-card.tsx`, `feature-card.tsx`, `stats-card.tsx`
- UI primitives under `components/ui/` built on Radix & Tailwind

## Dashboards & pages (`app/dashboard/`)

- `overview/` – at-a-glance metrics
- `learn/`, `learn-clean/`, `learn-v2/` – learning surfaces
- `assessments/`, `assignments/` – task-specific areas
- `profile/`, `teacher/`, `curriculum-builder/`, `study-plan/`, `new-session/` – role and flow-specific pages
- `modern/`, `page.tsx`, `layout.tsx` – core shell, modern layout and landing

## Realtime flow

- Realtime session channel: `learning_session:{sessionId}` via Supabase Realtime (broadcast events: `message`, `feedback`)
- `RealTimeSessionManager` handles:
  - initialize(): subscribes to channel and sets active state
  - addMessage(): pushes tutor/student messages and triggers instant feedback generation
  - broadcastFeedback(): pushes realtime feedback events
  - getSessionSummary()/end(): metrics & cleanup
- Instant feedback uses Gemini via `@ai-sdk/google` and validates structure with `zod`.

## Orchestrator (state machine)

- Stored in Upstash Redis as `orchestrator:{sessionId}` with TTL (24h)
- States: `initializing → curriculum_generation → teaching_explain → teaching_example → teaching_practice → assessment → feedback_analysis → progression_check → session_complete`
- Transitions depend on concept progress, assessment scores, and feedback readiness
- Actions call internal APIs (e.g., `generate-curriculum`, `assessment/generate-quiz`, `feedback/comprehensive`)

## Security & data access

- Supabase Row-Level Security (RLS) is enforced on student data tables
- Server routes use `SUPABASE_SERVICE_ROLE_KEY` where elevated writes are needed; otherwise anon key
- Middleware maintains session identity for SSR/edge contexts
- Never expose service role key to the browser

## Setup & local development

- Install dependencies and run the dev server using your preferred Node package manager (pnpm/npm/yarn)
- Provision database with `scripts/COMPLETE_PRODUCTION_SETUP.sql`
- Create a test account using the provided seed scripts if needed (`02-seed-test-account.sql`)
- Configure environment variables as per `.env.example`

## Troubleshooting tips

- If you see Postgres errors like “already exists” on re-running SQL, re-run the idempotent consolidated script (`COMPLETE_PRODUCTION_SETUP.sql`) or ensure the migration includes `DROP ... IF EXISTS` for triggers/policies
- Verify RLS by trying to read a row you don’t own—should be denied unless using service role
- If realtime events aren’t received, confirm the channel name and that you’re broadcasting to `learning_session:{sessionId}`
- For 401/403 errors from APIs, check that middleware is running and cookies are present; confirm correct Supabase keys in environment

## Extending the system

- New API route: create a folder under `app/api/{your-route}/route.ts`; export proper HTTP verb handlers
- New agent: add to `lib/agents/` and wire into orchestrator or endpoint as needed
- New DB table: add to the consolidated SQL script with RLS policies and updated_at trigger; prefer idempotent DDL
- New UI: place components under `components/` and reuse primitives from `components/ui/`

## References

- Full schema and policies: `scripts/COMPLETE_PRODUCTION_SETUP.sql`
- Setup guides: `COMPLETE_SETUP_GUIDE.md`, `DATABASE_QUICK_START.md`, `DATABASE_VISUAL_MAP.md`
- Auth & middleware: `middleware.ts`, `lib/supabase/middleware.ts`

---

If you need deeper dives on any module, open the referenced file and follow the call graph—functions and routes are named to reflect their roles and the folders map directly to product flows.