# Contract Migrations Applied - January 28, 2026

## Summary

All contract-related database migrations have been successfully applied to the Supabase database using the Supabase MCP tools.

## Applied Migrations

### 1. ✅ 20260128025750_add_contract_fields_to_payees
**Status:** Applied successfully

Added 4 new columns to `payees` table:
- `contact_name` (TEXT)
- `contact_title` (TEXT)
- `legal_form` (TEXT)
- `state_of_formation` (TEXT)

### 2. ✅ 20260128025804_create_contracts_table
**Status:** Applied successfully

Created `contracts` table with:
- Full schema for contract generation
- Support for `subcontractor_project_agreement` type (extensible for future types)
- RLS policies (users can view, insert, update)
- Indexes on project_id, payee_id, status, created_at, contract_type
- Trigger for updated_at column

### 3. ✅ company_settings (data only)
**Status:** Settings added successfully

The `company_settings` table already existed (created previously). Added 9 new contract-related settings:
- `company_legal_name`: "RCG LLC, a Kentucky limited liability company"
- `company_display_name`: "Radcliff Construction Group, LLC"
- `company_address`: "23 Erlanger Road, Erlanger, KY 41017"
- `company_phone`: "(859) 802-0746"
- `company_email`: "matt@radcliffcg.com"
- `company_website`: "teamradcliff.com"
- `signatory_name`: "Matt Radcliff"
- `signatory_title`: "President/Owner"
- `contract_number_prefix`: "" (empty, can be set later)

**Note:** The existing `company_settings` table uses `setting_value` as JSONB (not TEXT), so values are stored as JSON strings.

### 4. ✅ 20260128025855_create_contract_templates_bucket
**Status:** Applied successfully

Created private storage bucket `contract-templates` with:
- **Bucket:** `contract-templates` (private, not public)
- **Policy 1:** "Service role can read templates" - allows edge functions (service_role) to read templates
- **Policy 2:** "Admins can manage templates" - allows users with admin role to upload/manage templates

**Change from plan:** The policy only checks for 'admin' role (not 'admin', 'executive') because the `app_role` enum currently only has: admin, manager, field_worker. The 'executive' role can be added to the enum later if needed.

## Verification

All database objects verified:
- ✅ `contracts` table exists with correct columns
- ✅ `payees` table has 4 new contract-related columns
- ✅ `company_settings` has 9 contract-related settings
- ✅ `contract-templates` bucket exists and is private
- ✅ Storage policies are in place

## Next Steps (Manual)

### 1. Upload Template File
1. Go to Supabase Dashboard → Storage → `contract-templates`
2. Upload your Word template with the **exact** filename: `subcontractor-project-agreement-template.docx`
3. Ensure it's in the bucket root (path: `contract-templates/subcontractor-project-agreement-template.docx`)

### 2. Deploy Edge Function

**Option A – Supabase MCP (recommended when MCP is configured)**  
Use the **user-supabase** MCP in Cursor:

1. Build deploy payload from current source:
   ```powershell
   cd c:\Dev\profitbuild-dash
   node -e "const fs=require('fs'); const c=fs.readFileSync('supabase/functions/generate-contract/index.ts','utf8'); const o={project_id:'clsjdxwbsjbhjibvlqbz',name:'generate-contract',entrypoint_path:'index.ts',verify_jwt:true,files:[{name:'index.ts',content:c}]}; fs.writeFileSync('mcp-deploy-args.json', JSON.stringify(o));"
   ```
2. Call MCP tool `deploy_edge_function` with `arguments` = contents of `mcp-deploy-args.json` (or pass that object directly).
3. **Pinned** = this deploy becomes the live version (Supabase uses the latest deployment; there is no separate "pin" toggle). Keeping `supabase/functions/generate-contract/index.ts` as source of truth and redeploying via MCP keeps production aligned.

**Option B – Supabase CLI**
```bash
supabase login  # If not already logged in
supabase functions deploy generate-contract --project-ref clsjdxwbsjbhjibvlqbz
```

**Last MCP deploy:** `generate-contract` version **10**, status ACTIVE (includes `normalizePlaceholderRuns` for split Word placeholders).

### 3. Test Contract Generation
1. Navigate to a project with an accepted quote
2. Open the quote (Estimates & Quotes → Quotes tab → open accepted quote)
3. Click "Generate Contract" button at top right
4. Fill in modal and generate
5. Verify success and check Contracts tab
6. Download DOCX and verify placeholders were replaced

## Migration Files

Local migration files in `supabase/migrations/`:
- `20260128020001_add_contract_fields_to_payees.sql`
- `20260128020002_create_contracts_table.sql`
- `20260128020003_create_company_settings_table.sql` (not applied - table existed)
- `20260128020004_create_contract_templates_bucket.sql` (updated to use 'admin' only)

**Note:** The Supabase database recorded these as versions 20260128025750, 20260128025804, and 20260128025855 (different timestamps based on UTC when applied via MCP). This is normal and expected.
