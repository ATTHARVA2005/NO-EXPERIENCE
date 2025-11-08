# Proposed deletions and consolidation plan

This is a conservative, review-first proposal for removing or consolidating files that appear to be backdated, duplicated, or clearly obsolete. I will NOT delete anything until you explicitly approve the list below.

---

## Deletion candidates (suggested)

1) app/dashboard/learn/page-old-backup.tsx

- Path: `app/dashboard/learn/page-old-backup.tsx`
- Why: This is a literal "old backup" of a page. Backup files can safely be removed or moved to an `archive/` folder. The file contains references to the old `students` table (e.g. `supabase.from("students")`), which the current schema no longer uses.
- Excerpt:

  ```ts
  const { data: profile } = await supabase.from("students").select("*").eq("id", user.id).single<any>()
  ```

2) scripts/01-schema-setup.DEPRECATED.sql

- Path: `scripts/01-schema-setup.DEPRECATED.sql`
- Why: This file was already renamed to `.DEPRECATED.sql` and contains an old schema that creates a `students` table and many `REFERENCES students(id)` foreign keys. Running it would conflict with the current `student_profiles` schema. It's safe to remove from active repository history; keep a copy externally if desired.
- Excerpt:

  ```sql
  -- Create students table
  CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    ...
  )
  ```

---

## Consolidation candidates (recommend merge, not delete yet)

There are many MD files with overlapping purpose and similar names (e.g., `COMPLETE_SETUP_GUIDE.md`, `COMPLETE_SETUP_INSTRUCTIONS.md`, `QUICK_START.md`, `QUICK_START_DATABASE.md`, `QUICK_IMPLEMENTATION_GUIDE.md`, `IMPLEMENTATION_COMPLETE.md`, `IMPLEMENTATION_SUMMARY.md`). Removing these without manual consolidation risks losing small, useful details.

Recommendation:

- Keep one canonical set for docs:
  - `INDEX.md` (navigation)
  - `README_ASSIGNMENT_AGENT.md` (project README)
  - `ASSIGNMENT_AGENT_DOCUMENTATION.md` (technical reference)
  - `QUICK_IMPLEMENTATION_GUIDE.md` (fast setup)
  - `COMPLETE_SETUP_GUIDE.md` (full setup + deployment)

- For other similarly-named docs, I propose to either:
  - Merge important content into the chosen canonical files and then archive/delete the redundant ones, or
  - Move them into `docs/archive/` (non-destructive) if you prefer to keep them for history.

I can produce a merged single-file doc (I already created `MASTER_DOC.md`) and then consolidate others behind an `archive/` folder before deleting.

---

## Files flagged for review (do not delete automatically)

- Any file that still references `students` in code or SQL (there are several docs and scripts that mention 'students' for historical reasons). These should be either:
  - Updated to `student_profiles` where they are active code files, or
  - Kept as historical docs but moved to `docs/archive/` if they are only documentation.

I'll produce a short patch (or move) for each item you approve. For safety, I recommend archiving instead of immediate deletion for at least 30 days.

---

## Next actions (pick one):

1. Approve the conservative deletion list above (I will delete the two files listed and record the change). I will then run quick checks (grep for references to the deleted paths and a TypeScript build if applicable).
2. Approve moving the deletion candidates to `docs/archive/` instead of deleting. I will move them there and leave the repo functional.
3. Ask me to expand the deletion list — I will scan for more clear backups/DEPRECATED files and present a longer proposal.
4. Ask me to instead produce a full merge of all MD files into `MASTER_DOC.md` (already created) and then mark duplicates for deletion — I can then present the final deletion list.

Please reply with the option number you prefer (and any additional files to include/exclude). After your confirmation I will apply the changes.
