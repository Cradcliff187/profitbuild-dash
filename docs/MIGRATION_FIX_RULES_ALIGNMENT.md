# Rules Alignment: Migration Fix (remove_quoted_project_status)

**Context:** The migration `20260128000000_remove_quoted_project_status.sql` was failing with:
`ERROR: cannot alter type of a column used by a view or rule ... rule _RETURN on view reporting.internal_labor_hours_by_project depends on column "status"`.

The fix was to move the `DROP VIEW` statements **inside** the same `DO $$ ... END $$` block that alters the enum, so the views are dropped in the same transaction before `ALTER TABLE projects ALTER COLUMN status TYPE ...` runs.

---

## Relevant .cursorrules and Docs

### 1. Supabase migrations (when using MCP)

From **.cursorrules** and **docs/SUPABASE_MIGRATION_GUIDE.md**:

- **When you apply a migration via `mcp_supabase_apply_migration`:**  
  Query `schema_migrations` for exact `version` and `name` → create a **matching local file**  
  `supabase/migrations/{version}_{name}.sql` with content:  
  `-- Applied via Supabase dashboard since the actual SQL is already in your database.`
- **Local migration set must match DB:**  
  Local file count and filenames must match what’s in `supabase_migrations.schema_migrations` so CI/CD passes.

**How this fix fits:**  
We did **not** apply a new migration via MCP. We **edited** the body of an existing local migration file. No new file was added, no version/name changed, so the “create matching placeholder after apply” workflow does not apply. The edit does not change which migrations exist, only the content of one existing file.

---

### 2. Database best practices (.cursorrules)

- Use `mcp_supabase_apply_migration` for DDL (we didn’t apply; we edited a repo migration).
- **Test migrations on a branch first** before applying to production.
- After working in Lovable, verify migration alignment before deploying.

**How this fix fits:**  
To align fully: run this migration (or at least this file) on a branch/preview DB before merging to main and deploying. If you’re committing straight to main, the “test on a branch first” step would mean: branch → commit migration fix → run migration in branch/preview → then merge to main.

---

### 3. Git workflow (.cursorrules)

- Never force push to main/master.
- **Always pull before pushing.**
- Write descriptive commit messages.
- Reference issue numbers when applicable.

**Before recommit:**

1. **Pull** (e.g. `git pull origin main` if you’re on main).
2. **Commit** with a descriptive message, e.g.:  
   `fix( migrations ): drop reporting views inside DO block before altering project_status`  
   or:  
   `fix: remove_quoted_project_status – drop views in same block as enum change to fix view dependency error`

---

### 4. User rule (from project rules)

- **Never commit to main or push to the online repo without explicit user approval.**

So any commit/push to main should only happen after you’ve approved it.

---

### 5. REVERT_AND_MIGRATION_FIX_SUMMARY (lessons learned)

- Don’t ignore migration sync: local migration files must match what’s in the DB (file set and names).
- Don’t push to production without approval.

Our change does not add or remove migration files; it only changes SQL inside `20260128000000_remove_quoted_project_status.sql`, so it doesn’t break that sync rule.

---

## If this migration is already applied

- If `20260128000000` is **already** in `supabase_migrations.schema_migrations`, the database has already run (or attempted) this migration. Editing the file on disk does **not** re-run it.
- In that case, this edit only affects:
  - New environments (fresh installs), and  
  - Repos that run migrations from the file (e.g. CI, other clones).
- If your DB **failed** on this migration, it may not have been marked as applied. Then re-running the migration (with the fixed file) is what you want. If it **partially** applied (e.g. views dropped but enum change failed), you may need a **new** migration that:
  - Drops the views if they exist,
  - Ensures the enum no longer has `quoted`,
  - Recreates the views,
  and that new migration should be applied via MCP and given a matching local file per the rules above.

---

## Pre-recommit checklist (aligned with .cursorrules)

- [ ] **Pull** from the target branch (e.g. `git pull origin main`) before committing.
- [ ] **Decide branch strategy:**  
  - Either commit on a branch, test the migration there, then merge to main,  
  - Or commit on main only after you’re satisfied (e.g. migration already tested elsewhere).
- [ ] **Commit message:** Descriptive, and clear that it’s a migration fix (e.g. “fix: drop reporting views inside DO block in remove_quoted_project_status”).
- [ ] **No new migration files** — we only changed the content of `20260128000000_remove_quoted_project_status.sql`; no placeholder or new file needed for this change.
- [ ] **User approval** — only push to main after you’ve explicitly approved it.

---

## Summary

- The fix is **aligned** with .cursorrules: we edited an existing migration; we didn’t apply via MCP, didn’t add/remove files, and didn’t change version/name.
- Before **recommitting**, the rules require: **pull**, **descriptive commit**, and **your approval** before pushing to main. Best practice is to **test this migration on a branch** before merging to main.
