# Expanded Deletion Candidates — Conservative Proposal

This is an expanded (still conservative) list of files and groups I recommend reviewing for consolidation, archiving, or deletion. None of these will be removed automatically; I present them here to make it easy to approve batches.

Summary of approach
-------------------
- I included files that are clearly backups / deprecated or strongly overlap with canonical docs (same subject, different phrasing). For everything else I recommend archiving to `docs/archive/` rather than immediate deletion.

High-confidence deletion candidates (safe to delete or archive)
------------------------------------------------------------
1. `app/dashboard/learn/page-old-backup.tsx` — already removed per your approval (backup copy of live page)
2. `scripts/01-schema-setup.DEPRECATED.sql` — already removed (deprecated schema creating `students` table)

Groups recommended for consolidation (review before deletion)
-----------------------------------------------------------
I recommend picking the canonical file from each group, merging unique content, then archiving the rest.

- Setup & Quick start docs
  - Keep: `QUICK_IMPLEMENTATION_GUIDE.md` and/or `COMPLETE_SETUP_GUIDE.md`
  - Candidates to archive: `COMPLETE_SETUP_INSTRUCTIONS.md`, `COMPLETE_PRODUCTION_SETUP.sql` variants that duplicate content, `QUICK_START.md`, `QUICK_START_DATABASE.md`.

- Implementation & Status docs
  - Keep: `IMPLEMENTATION_COMPLETE.md` or `IMPLEMENTATION_SUMMARY.md` (pick one canonical)
  - Candidates to archive: `IMPLEMENTATION_CHECKLIST.md`, `IMPLEMENTATION_SUMMARY.md` (if redundant), `COMPLETE_TASKS.md`.

- Database docs & reports
  - Keep: `DATABASE_COMPLETE_SUMMARY.md` or `COMPLETE_PRODUCTION_SETUP.sql` as canonical schema
  - Candidates to archive: `DATABASE_SETUP_SUMMARY.md`, `DATABASE_QUICK_START.md`, `DATABASE_VISUAL_GUIDE.md`, `DATABASE_VISUAL_MAP.md` (merge unique diagrams into canonical doc)

- Auth & Security docs
  - Keep: `AUTH_SYSTEM_COMPLETE.md` or `AUTHENTICATION_GUIDE.md` (pick canonical)
  - Candidates: `AUTHENTICATION.md`, `SIGNIN_SETUP.md`, `FIX_400_ERROR.md` (archive or merge troubleshooting)

- Misc / Fix logs / Patch notes
  - Candidates to archive: `FIXES_APPLIED.md`, `FIX_400_ERROR.md`, `CRITICAL_FIXES_APPLIED.md`, `IDEMPOTENT_FIX_APPLIED.md`, `BUG_FIXES.md` — these are useful as changelog but belong in `docs/archive/` or in a single `CHANGELOG.md`.

Other low-risk candidates (manual review recommended)
------------------------------------------------
- Duplicate or highly similar UI docs: `COMPLETE_UI_REDESIGN.md`, `UI_MODERNIZATION_PLAN.md`, `UI_MODERNIZATION_PHASE1_COMPLETE.md`, `MODERN_UI_COMPLETE.md` — merge into one `UI_REDESIGN.md` and archive the rest.
- Curriculum & teacher docs: many `CURRICULUM_*` files that may be consolidated into a single curriculum guide.

Proposed workflow (suggested)
-----------------------------
1. Archive-first: move candidate files to `docs/archive/` (non-destructive) in a single commit. This keeps history while decluttering the top-level.
2. Merge: take unique sections from archived files and merge into the canonical docs (`README_ASSIGNMENT_AGENT.md`, `ASSIGNMENT_AGENT_DOCUMENTATION.md`, `QUICK_IMPLEMENTATION_GUIDE.md`, `SYSTEM_ARCHITECTURE.md`).
3. After 30 days of testing and confirmation, delete archived files permanently (or keep them if you prefer historical trace).

Action options for you
---------------------
1. Ask me to move the expanded list to `docs/archive/` (I will apply patches that move files and update `PROPOSED_DELETIONS.md`).
2. Ask me to automatically delete any subset you choose now.
3. Ask me to produce a detailed merge plan for a specific group (for example, consolidate all `DATABASE_*` docs into `DATABASE_COMPLETE_SUMMARY.md`), then I will generate diffs that merge unique contents.

If you approve an option (1/2/3), tell me which and I'll apply the changes in the next step.
