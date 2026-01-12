# Supabase Migration Guide

## Critical: Maintaining Migration Sync

This project uses **Supabase MCP in Cursor** to apply database migrations. To prevent CI/CD failures, you **MUST** follow this workflow.

## The Problem

When migrations are applied via Supabase MCP/Dashboard:
- Database records them with **UTC timestamps** and specific names
- Local files may not exist or have different timestamps/UUIDs
- CI/CD validation requires **exact filename matches**

**Example mismatch:**
- Database: `20260108191339_add_last_active_at_to_profiles.sql`
- Local (wrong): `20250108_add_last_active_at_to_profiles.sql` ❌
- Local (UUID, wrong): `20260108191339_a1b2c3d4-...-.sql` ❌

## The Solution: Always Create Matching Local Files

### Step-by-Step Workflow

When applying a migration via Supabase MCP in Cursor:

#### 1. Apply the Migration

```typescript
// Use mcp_supabase_apply_migration
await mcp_supabase_apply_migration({
  project_id: "clsjdxwbsjbhjibvlqbz",
  name: "add_new_feature",  // Descriptive name
  query: `
    ALTER TABLE public.profiles 
    ADD COLUMN new_field TEXT;
  `
});
```

#### 2. Query for the Exact Migration Name

```typescript
// IMMEDIATELY after applying, query the database
const result = await mcp_supabase_execute_sql({
  project_id: "clsjdxwbsjbhjibvlqbz",
  query: `
    SELECT version, name 
    FROM supabase_migrations.schema_migrations 
    ORDER BY version DESC 
    LIMIT 1;
  `
});

// Result will be like:
// { version: "20260108191339", name: "add_new_feature" }
```

#### 3. Create the Local Placeholder File

```typescript
// Build the filename
const version = result[0].version;
const name = result[0].name || 'migration';
const filename = `${version}_${name}.sql`;

// Create the file
await write({
  file_path: `supabase/migrations/${filename}`,
  contents: "-- Applied via Supabase dashboard since the actual SQL is already in your database.\n"
});

// Result: supabase/migrations/20260108191339_add_new_feature.sql
```

#### 4. Verify Synchronization

```bash
# Count local files
ls supabase/migrations/*.sql | wc -l

# Compare with database (should match exactly)
```

## Automated Prevention

### Cursor Rules

The `.cursorrules` file now contains rules that remind AI assistants to:
1. Always create matching local files after applying migrations
2. Query the database for exact migration names
3. Verify synchronization before committing

### GitHub Actions

The `.github/workflows/validate-migrations.yml` workflow:
- ✅ Checks for UUID-based filenames (invalid)
- ✅ Validates migration file patterns
- ✅ Runs on PRs and pushes to main

## If Sync Gets Broken

If you discover a mismatch between local files and database:

### Option 1: Manual Fix (Small Number)

```bash
# Create missing placeholder files
echo "-- Applied via Supabase dashboard since the actual SQL is already in your database." > supabase/migrations/20260108191339_migration.sql
```

### Option 2: Complete Resync (Many Missing)

Use the sync script we created:

```powershell
# PowerShell (Windows)
.\scripts\fix-migration-sync-complete.ps1
.\scripts\fix-migration-sync-part2.ps1
.\scripts\cleanup-old-uuid-migrations.ps1
.\scripts\cleanup-duplicate-migrations.ps1
```

```bash
# Or manually query all migrations and create files
# See scripts for examples
```

## Best Practices

### DO ✅

- Use `mcp_supabase_apply_migration` for DDL (CREATE, ALTER, DROP)
- Create local placeholder files immediately after applying
- Use descriptive migration names
- Commit migrations separately from code changes
- Test on branches before merging to main

### DON'T ❌

- Don't apply migrations without creating local files
- Don't manually create migrations with wrong timestamps
- Don't use UUID suffixes in filenames
- Don't delete migration files without deleting from database
- Don't hardcode IDs/UUIDs in migrations (won't match across environments)

## Migration Naming Convention

### Good Names
- `add_user_preferences_table`
- `update_profiles_add_phone`
- `fix_revenue_calculation`
- `create_reports_view`

### Bad Names
- `migration` (too generic)
- `update` (not descriptive)
- `fix_bug` (not specific)
- `temp_changes` (never "temp" in production)

## Troubleshooting

### CI/CD Fails: "Remote migration versions not found"

**Cause:** Local files don't match database

**Fix:**
1. Query database for all migrations
2. Compare with local `supabase/migrations/` directory
3. Create missing placeholder files
4. Delete extra/invalid files
5. Commit and push

### Files Have UUID Suffixes

**Cause:** Files were auto-generated incorrectly

**Fix:**
1. Find the correct name in database
2. Rename files to match database exactly
3. Remove UUID portion

### Count Mismatch (Local ≠ Database)

**Cause:** Migrations applied without creating local files, or extra files exist

**Fix:**
1. Run the complete resync scripts
2. Verify counts match
3. Commit changes

## References

- [Supabase Migrations Documentation](https://supabase.com/docs/guides/cli/managing-migrations)
- [Supabase MCP in Cursor](https://github.com/supabase/mcp-server-supabase)
- Project-specific: See `.cursorrules` for automated reminders
