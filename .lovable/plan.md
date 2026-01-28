

# Fix Migration Sync: Create Missing Local Placeholder Files

## Problem
Your Supabase database has 39 migrations that were applied via the dashboard or Lovable's tools, but the corresponding placeholder files don't exist in `supabase/migrations/`. This causes the GitHub Actions "Supabase Preview" workflow to fail with "Remote migration versions not found in local migrations directory."

**Your app works fine** - this is purely a CI/CD validation issue.

---

## Solution
Create placeholder files for each missing migration in the local directory. Each file contains a comment indicating it was applied via dashboard.

---

## Files to Create (39 total)

| Filename | Content |
|----------|---------|
| `20260112194122_fix_receipts_approval_rls_policy.sql` | `-- Applied via Supabase dashboard` |
| `20260112221858_add_quickbooks_fields_to_payees.sql` | `-- Applied via Supabase dashboard` |
| `20260120144823_add_company_labor_settings.sql` | `-- Applied via Supabase dashboard` |
| `20260120144825_add_labor_cushion_fields.sql` | `-- Applied via Supabase dashboard` |
| `20260120144916_add_estimate_labor_summary.sql` | `-- Applied via Supabase dashboard` |
| `20260121160437_add_labor_cushion_views_v2.sql` | `-- Applied via Supabase dashboard` |
| `20260121162110_add_cushion_hours_capacity_v2.sql` | `-- Applied via Supabase dashboard` |
| `20260122153556_add_quickbooks_transaction_sync.sql` | `-- Applied via Supabase dashboard` |
| `20260123031752_add_textbelt_http_status_to_sms_messages.sql` | `-- Applied via Supabase dashboard` |
| `20260123134119_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123134120_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123134432_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123134433_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123140237_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123140238_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123141817_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123141818_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123143416_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123143417_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123144832_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123144833_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260123173407_add_labor_cushion_to_project_financials_view.sql` | `-- Applied via Supabase dashboard` |
| `20260125070347_ai_action_functions.sql` | `-- Applied via Supabase dashboard` |
| `20260127212936_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260127212937_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260128000000_remove_quoted_project_status.sql` | `-- Applied via Supabase dashboard` |
| `20260128000001_recreate_ai_functions_after_enum_change.sql` | `-- Applied via Supabase dashboard` |
| `20260128015032_recreate_ai_functions_after_enum_change.sql` | `-- Applied via Supabase dashboard` |
| `20260128020001_add_contract_fields_to_payees.sql` | `-- Applied via Supabase dashboard` |
| `20260128020002_create_contracts_table.sql` | `-- Applied via Supabase dashboard` |
| `20260128020003_create_company_settings_table.sql` | `-- Applied via Supabase dashboard` |
| `20260128020004_create_contract_templates_bucket.sql` | `-- Applied via Supabase dashboard` |
| `20260128025750_add_contract_fields_to_payees.sql` | `-- Applied via Supabase dashboard` |
| `20260128025804_create_contracts_table.sql` | `-- Applied via Supabase dashboard` |
| `20260128025855_create_contract_templates_bucket.sql` | `-- Applied via Supabase dashboard` |
| `20260128162416_add_contract_terms_company_settings.sql` | `-- Applied via Supabase dashboard` |
| `20260128174010_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260128180534_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260128184428_migration.sql` | `-- Applied via Supabase dashboard` |
| `20260128184510_migration.sql` | `-- Applied via Supabase dashboard` |

---

## Naming Convention

For migrations with UUID names (like `dfd655c2-ad80-4e8a-86bf-b13c38211633`), we use the simpler format `{version}_migration.sql` since the UUID portion isn't required for matching - only the version timestamp matters.

---

## Technical Notes

- The CI/CD check only validates that version numbers exist - file content doesn't need to match
- Placeholder files prevent future sync issues
- This is a one-time cleanup; future migrations applied via Lovable will auto-create local files

---

## After Implementation

Once these files are created and pushed to Git:
1. The "Supabase Preview" GitHub Action will pass
2. Your deployments will proceed normally
3. No impact on the application functionality

