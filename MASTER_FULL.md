# MASTER_FULL — Complete Repository Reference

Purpose
-------
This document is a single-file, comprehensive reference for the entire codebase intended to be given to a simple or "dumb" AI or to any human who needs a complete snapshot. It intentionally avoids embedding any secret credentials or private keys. Instead it lists required environment variables and placeholders. Treat this file as a mechanical spec: languages, folders, APIs, database layout, scripts, important code entry points, and run instructions.

WARNING: This file deliberately does NOT contain real secrets. Never paste real API keys or service-role tokens into this file.

Overview
--------
- Project: Agentic AI Tutor / Assignment System
- Primary languages: TypeScript (Next.js 14, App Router), SQL (Supabase/Postgres), PowerShell helper scripts
- Frameworks & libraries: Next.js 14, Vercel AI SDK (Gemini), Supabase (Postgres + Auth), Tailwind CSS, shadcn/ui, pnpm
- Runtime: Node.js 18+

Repository layout (top-level)
-----------------------------
- `app/` — Next.js App Router pages and API routes
  - Key subfolders: `(auth)`, `api/`, `dashboard/`, `setup/`
- `components/` — React components (UI, games, tutor chat)
- `lib/` — Server and agent logic (agents, types, supabase client wrappers)
- `scripts/` — SQL migration and helper SQL scripts
- `public/` — Static assets (placeholders, logos)
- `styles/`, `hooks/`, `types/` — supporting frontend types and styles
- `MASTER_FULL.md` — (this file)
- `MASTER_DOC.md` — abridged compiled doc
- `PROPOSED_DELETIONS.md` / `PROPOSED_DELETIONS_EXPANDED.md` — deletion proposals

Code & Agent map (high level)
------------------------------
- lib/agents/
  - `assignment-agent-enhanced.ts` — generates assignments & mini-games, evaluation
  - `feedback-agent.ts` — analyzes performance and suggests tutor actions
  - `tutor-agent.ts` — assistant/neural tutor logic
  - `memory-agent.ts` — student profile/session persistence layer
  - `agent-orchestrator.ts` — session orchestration and state machine

- lib/types/
  - `assignment.ts` — TypeScript types for assignments, mini-games, scoring

- lib/supabase/
  - `client.ts` & `server.ts` — Supabase client wrappers for browser/server

- app/api/* (server routes) — API endpoints, examples:
  - `app/api/assignment/generate/route.ts` — POST generate assignments
  - `app/api/assignment/evaluate/route.ts` — POST evaluate assignments
  - `app/api/assignment/list/route.ts` — GET list assignments
  - `app/api/assessment/*` — generate/validate/submit/evaluate assessment endpoints
  - `app/api/tutor/*` — tutor chat and session APIs
  - `app/api/auth/*` — auth setup and callbacks
  - `app/api/agents/*` — curriculum generation and orchestration
  - `app/api/feedback/*` — feedback analysis endpoints

API endpoint summary (path -> purpose)
-----------------------------------
(This is derived from repository routes; methods are typically POST unless explicitly a listing endpoint.)
- POST /api/assignment/generate — generate a new adaptive assignment
- POST /api/assignment/generate-adaptive — generate assignment with analysis context
- POST /api/assignment/evaluate — evaluate a completed assignment
- GET /api/assignment/list — list assignments
- POST /api/assessment/generate — create assessment items
- POST /api/assessment/generate-quiz — quiz generation
- POST /api/assessment/validate — validate assessment items
- POST /api/assessment/submit-results — submit assessment results
- POST /api/tutor/chat — tutor chat endpoint
- POST /api/tutor/chat-enhanced — enhanced chat with context
- POST /api/game-session — record / complete a game session
- POST /api/feedback/analyze — analyze assignment results (feedback agent)
- POST /api/recommendations — personalized resource recommendations
- POST /api/upload/pdf — upload PDFs (assignment content)
- POST /api/auth/setup — initialize auth-related test data

Database overview (high level)
------------------------------
Primary conceptual tables (as implemented by `scripts/COMPLETE_PRODUCTION_SETUP.sql` and other migration scripts):

- `auth.users` — Supabase built-in authentication table (primary identity source)
- `student_profiles` — extended profile per user (1:1 with auth.users)
  - common fields: id (UUID), name, grade_level, learning_style, average_score, created_at, updated_at
- `learning_sessions` — tutor and learning sessions for a student (1:N)
- `lesson_progress`, `subtopic_progress`, `lesson_context` — progress tracking
- `assessments` — quizzes and evaluation items
- `assignments` — generated assignments and game payloads
- `feedback_history` — results & feedback snapshots
- `tutor_sessions` — conversation history with tutor agent
- `concept_mastery` — per-concept mastery tracking
- `performance_analytics` & `curriculum_analytics` — aggregated analytics for teacher dashboards

Important SQL scripts (found in `scripts/`)
----------------------------------------
(List of detected SQL scripts in the repo)

-- Migration & schema scripts
The repository contains the following SQL scripts (deduplicated listing):

- `scripts/COMPLETE_PRODUCTION_SETUP.sql` — single-file complete production schema (idempotent, creates all tables, policies, triggers)
- `scripts/COMPLETE-FRESH-SETUP.sql` — variant for fresh installs
- `scripts/02-seed-test-account.sql` — seeds a test student account
- `scripts/03-assignment-system-migration.sql` — assignment-related tables, RLS policies, indexes
- `scripts/04-agent-system-schema.sql` — core agent system tables (sessions, agents, workflows)
- `scripts/05-agent-system-inserts.sql` — seed data / inserts for agent system
- `scripts/06-curriculum-analytics-schema.sql` — curriculum analytics schema (review FK references)
- `scripts/06-curriculum-analytics-table.sql` — complementary table definitions/views for curriculum analytics
- `scripts/06-lesson-progress-tracking.sql` — lesson/subtopic progress, idempotent trigger fixes
- `scripts/07-fix-learning-sessions.sql` — fixes and policy updates for learning sessions
- `scripts/08-add-delete-policy.sql` — add/delete policy updates for many tables
- `scripts/09-optimized-user-centric-schema.sql` — optimized schema variant focusing on auth.users -> student_profiles patterns
- `scripts/10-quick-reference-queries.sql` — developer quick queries for verification
- `scripts/11-verify-installation.sql` — verification checks for installed schema
- `scripts/12-cleanup-and-retry.sql` — cleanup helpers
- `scripts/test-auth-setup.sql` — test auth-related SQL checks

Note: `scripts/01-schema-setup.DEPRECATED.sql` was previously present but has been removed as a deprecated/unsafe schema that referenced an old `students` table. If you need an archived history of it we can move old files to `docs/archive/` before permanent deletion.

How the DB is intended to be used
--------------------------------
- Everything should trace back to `auth.users(id)` for ownership checks.
- `student_profiles` is the canonical profile table used by the runtime code. Some older, deprecated scripts historically referenced a `students` table; these should be ignored or migrated.
- Row Level Security policies are used per-table to ensure students can only access their own data.

Environment variables (placeholders — DO NOT PUT REAL KEYS HERE)
-------------------------------------------------------------
Create a file `.env.local` with the following variables (example placeholders):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=pk.eyJ...REPLACE_WITH_YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_SERVICE_ROLE_KEY  # keep secret

GOOGLE_GENERATIVE_AI_API_KEY=REPLACE_WITH_GEMINI_API_KEY
NEXT_PUBLIC_HUME_API_KEY=REPLACE_WITH_HUME_API_KEY
NEXT_PUBLIC_HUME_SECRET_KEY=REPLACE_WITH_HUME_SECRET_KEY

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Notes about secrets and security
-------------------------------
- Never commit `.env.local` to version control.
- `SUPABASE_SERVICE_ROLE_KEY` is highly sensitive — keep it only in secure runtime environment (Vercel secrets, etc.).
- If an AI or automation asks for keys, refuse — provide placeholders only.

How to run locally
-------------------
1. Install dependencies:

```powershell
pnpm install
```

2. Add `.env.local` (placeholders above)

3. Provision the database (run SQL scripts in order):

 - Prefer: `scripts/COMPLETE_PRODUCTION_SETUP.sql` for a fresh install
 - Or run incremental scripts in numerical order: `01`, `02`, `03`, etc. (verify idempotency)

4. Run dev server:

```powershell
pnpm dev
```

Quick checks performed during audit
----------------------------------
- Scanned repository for MD files and backups (approx. 140 MD files found). A `MASTER_DOC.md` was created with an abridged compilation.
- Resolved evidence of deprecated `students` table references in docs and some older scripts. Runtime code appears to use `student_profiles`.
- Removed two approved files as requested: `app/dashboard/learn/page-old-backup.tsx` and `scripts/01-schema-setup.DEPRECATED.sql`.

Developer checklist (for maintainers)
------------------------------------
1. Search for `from("students")` or `REFERENCES students` to find remaining deprecated references and fix to `student_profiles` or `auth.users(id)`.
2. Consolidate docs: keep canonical set: `INDEX.md`, `README_ASSIGNMENT_AGENT.md`, `ASSIGNMENT_AGENT_DOCUMENTATION.md`, `QUICK_IMPLEMENTATION_GUIDE.md`, `COMPLETE_SETUP_GUIDE.md`. Merge unique content into those.
3. Archive older/deprecated docs to `docs/archive/` instead of immediate deletion for at least 30 days.

How to give this to a simple/dumb AI
------------------------------------
- This file aims to be self-contained: it lists languages, folders, APIs, DB tables, and run instructions. If you hand this file to an automated agent, it should be able to map code files to the high-level functionality.
- If you want the dumb AI to run or modify the project, also provide the `.env.local` with secured keys (never via this file). Use a secure secret store and restrict access.

Appendix: important files and entry points
----------------------------------------
- `app/page.tsx` — public landing page
- `app/dashboard/*` — UI for students/teachers
- `lib/agents/*` — core AI agent implementations
- `lib/supabase/*` — DB client wrappers
- `scripts/*` — migration SQL

Contact & next steps
--------------------
- If you want me to expand this file with more low-level details (full SQL DDL extraction, full list of TypeScript types and inline function references), tell me and I will extract those programmatically and insert them.

---

_Generated programmatically on Nov 7, 2025_
