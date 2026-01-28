# Data Schema Reference

> Generated on 2025-11-12. This document consolidates the Supabase schema that backs ProfitBuild Dash as defined in `src/integrations/supabase/types.ts` and the SQL migrations under `supabase/migrations/`. It covers tables, views, enums, key indexes, relationships, and notable policies. Use this as a living reference when evolving the data layer.

## Quick Index

- [Enumerations](#enumerations)
- [Database View](#database-view)
- [Tables](#tables)
  - [Activity & Audit](#activity--audit)
  - [Commercial Entities](#commercial-entities)
  - [Project & Collaboration](#project--collaboration)
  - [Financial Operations](#financial-operations)
  - [Metadata & System](#metadata--system)
- [Recommendations](#recommendations)

## Enumerations

| Enum | Allowed Values | Usage |
|------|----------------|-------|
| `app_role` | `admin`, `manager`, `field_worker` | Role-based access control (RLS functions, `user_roles`). |
| `change_order_status` | `pending`, `approved`, `rejected` | `change_orders.status`. Approval trigger enforces complementary data. |
| `estimate_status` | `draft`, `sent`, `approved`, `rejected`, `expired` | `estimates.status`. |
| `expense_category` | `labor_internal`, `subcontractors`, `materials`, `equipment`, `other`, `permits`, `management`, `office_expenses`, `vehicle_expenses` | Shared classification across estimates, quotes, expenses. |
| `project_status` | `estimating`, `approved`, `in_progress`, `complete`, `on_hold`, `cancelled` | `projects.status`. |
| `project_type` | `construction_project`, `work_order` | `projects.project_type`. |
| `project_category` | `construction`, `system`, `overhead` | `projects.category`. Used for filtering project visibility across the application. |
| `quote_status` | `pending`, `accepted`, `rejected`, `expired` | `quotes.status`. |
| `sync_status` | `success`, `failed`, `pending` | Sync tracking tables. |
| `sync_type` | `import`, `export` | `quickbooks_sync_log.sync_type`. |
| `transaction_type` | `expense`, `bill`, `check`, `credit_card`, `cash` | Expense intake. |

## Database View

### `reporting.project_financials`

Comprehensive reporting view that aggregates project-level financial metrics, expenses, quotes, change orders, and revenue data. This view is the primary data source for the report builder system and provides calculated fields for variance analysis.

**Location:** `reporting` schema

**Base Tables:** `projects`, `estimates`, `expenses`, `expense_splits`, `quotes`, `change_orders`, `project_revenues`

**Filtering:** Currently uses legacy filtering `WHERE p.project_number NOT IN ('SYS-000', '000-UNASSIGNED')`. Future updates should migrate to category-based filtering using `WHERE p.category = 'construction'::project_category`.

**Key Fields:**

**Base Project Fields:**
- `id`, `project_number`, `project_name`, `client_name`, `status`, `project_type`, `job_type`
- `start_date`, `end_date`, `created_at`, `updated_at`

**Financial Calculated Fields (from projects table):**
- `contracted_amount` - Total contract value including approved estimates and change orders
- `current_margin` - Contracted amount minus actual expenses
- `actual_margin` - Total invoiced minus actual expenses (real profit)
- `margin_percentage` - Margin as percentage of revenue
- `projected_margin` - Expected final margin
- `original_margin` - Margin from original estimate
- `contingency_remaining` - Unused contingency
- `total_accepted_quotes` - Sum of accepted quotes
- `adjusted_est_costs` - Costs with accepted quotes applied
- `original_est_costs` - Original estimated costs

**Estimate Data:**
- `estimate_total` - Total amount from approved estimate
- `estimate_cost` - Total cost from approved estimate
- `contingency_amount` - Total contingency allocated
- `contingency_used` - Contingency already used
- `estimate_number` - Estimate identifier

**Expense Aggregations:**
- `total_expenses` - Sum of all expenses (handles split expenses correctly)
- `expense_count` - Number of expense records
- `expenses_by_category` - JSONB object with expenses grouped by category

**Quote Aggregations:**
- `accepted_quotes_total` - Sum of accepted quote amounts
- `accepted_quote_count` - Number of accepted quotes

**Change Order Aggregations:**
- `change_order_revenue` - Sum of approved change order client amounts
- `change_order_cost` - Sum of approved change order cost impacts
- `change_order_count` - Number of approved change orders

**Revenue Aggregations:**
- `total_invoiced` - Sum of all project_revenues.amount (actual revenue received)
- `invoice_count` - Number of invoice/revenue records

**Calculated Variance Fields:**
- `remaining_budget` - Contracted amount minus total expenses
- `budget_utilization_percent` - Percentage of budget spent
- `cost_variance` - Actual expenses minus estimated costs
- `cost_variance_percent` - Cost variance as percentage of estimated costs
- `revenue_variance` - Contracted amount minus total invoiced (estimated vs actual revenue)
- `revenue_variance_percent` - Revenue variance as percentage of contracted amount
- `contingency_utilization_percent` - Percentage of contingency used

**Access:** `GRANT SELECT ON reporting.project_financials TO authenticated;`

**Note:** This view replaces the older `project_financial_summary` view. All new reporting should use `reporting.project_financials`.

## Tables

### Activity & Audit

#### `activity_feed`

- **Purpose:** Central event log covering significant domain actions (time entries, schedule moves, approvals).
- **Columns:** `id` uuid PK (default `gen_random_uuid()`), `created_at` timestamptz default `now()`, `activity_type` text, `entity_type` text, `entity_id` uuid, `user_id` uuid nullable (FK `profiles.id`), `project_id` uuid nullable (FK `projects.id`), `description` text, `metadata` jsonb default `{}`, `deleted_at` timestamptz nullable.
- **Indexes:** `idx_activity_feed_created_at (created_at DESC)`, partial `idx_activity_feed_project_id (project_id IS NOT NULL)`, partial `idx_activity_feed_user_id (user_id IS NOT NULL)`, `idx_activity_feed_activity_type`, `idx_activity_feed_entity_type_id (entity_type, entity_id)`.
- **Policies:** RLS enabled; `can_access_project` governs visibility.

#### `admin_actions`

- **Purpose:** Audit log for privileged operations (password resets, role changes).
- **Columns:** `id` uuid PK, `admin_user_id` uuid (FK `auth.users`), `target_user_id` uuid nullable (FK `auth.users`), `action_type` text, `action_details` jsonb, `created_at` timestamptz default `now()`.
- **Indexes:** `idx_admin_actions_target_user`, `idx_admin_actions_admin_user`, `idx_admin_actions_created_at (DESC)`.
- **Policies:** Admin-only insert/select; targets can read their own events.

### Commercial Entities

#### `clients`

- **Purpose:** Customer roster.
- **Columns:** `id` uuid PK, `client_name` text, `company_name` text nullable, `contact_person` text nullable, `email` text nullable, `phone` text nullable, `billing_address` text nullable, `mailing_address` text nullable, `client_type` text nullable, `payment_terms` text nullable, `quickbooks_customer_id` text nullable, `notes` text nullable, `tax_exempt` boolean nullable, `is_active` boolean nullable, `created_at` timestamptz default `now()`, `updated_at` timestamptz default `now()`.
- **Indexes:** none defined; rely on PK.

#### `payees`

- **Purpose:** Vendors, subcontractors, internal labor with sync metadata.
- **Columns:** `id` uuid PK, `payee_name` text, `full_name` text nullable, `email` text nullable, `phone_numbers` text nullable, `billing_address` text nullable, `account_number` text nullable, `payee_type` text nullable, `provides_labor` boolean nullable, `provides_materials` boolean nullable, `permit_issuer` boolean nullable, `requires_1099` boolean nullable, `insurance_expires` date nullable, `hourly_rate` numeric nullable, `is_active` boolean nullable, `is_internal` boolean nullable, `quickbooks_vendor_id` text nullable, `last_synced_at` timestamptz nullable, `sync_status` enum nullable, `terms` text nullable, `user_id` uuid nullable (links to internal profile), auditing timestamps.
- **Indexes:** `idx_payees_user_id (user_id)`.

#### `company_branding_settings`

- **Purpose:** Stores theming assets (logo URLs, colors) for report generation.
- **Columns:** `id` uuid PK, company/brand textual fields, color hex values, asset URLs, `created_at`, `updated_at`.
- **Indexes:** none.
- **Note:** Table does not currently scope settings by tenant/company—assumed singleton.

### Project & Collaboration

#### `projects`

- **Purpose:** Primary project entities with financial baselines.
- **Columns:** `id` uuid PK (default `gen_random_uuid()`), `project_number` text (unique), `project_name` text, `client_name` text, `project_type` enum default `'construction_project'`, `status` enum default `'estimating'`, `category` enum `project_category` default `'construction'`, `start_date` date nullable, `end_date` date nullable, `address` text nullable, `project_id` relationships to client, `customer_po_number` text nullable, `contracted_amount` numeric nullable, `contingency_remaining` numeric nullable, `target_margin` numeric nullable, `current_margin` numeric nullable, `margin_percentage` numeric nullable, `original_est_costs` numeric nullable, `adjusted_est_costs` numeric nullable, `projected_margin` numeric nullable, `total_accepted_quotes` numeric nullable, QuickBooks linkage fields (`quickbooks_job_id`, `qb_formatted_number`), `minimum_margin_threshold` numeric nullable, `sequence_number` integer nullable, `work_order_counter` integer nullable, timestamps.
- **Foreign Keys:** `client_id` → `clients.id`.
- **Indexes:** `idx_projects_number`, `idx_projects_client_id`, `idx_projects_quickbooks_id` (legacy name but still relevant), `idx_projects_category`.
- **Category System:** The `category` field replaces hardcoded project number filtering. Values: `'construction'` (default, visible everywhere), `'system'` (hidden internal projects like SYS-000, 000-UNASSIGNED), `'overhead'` (visible only in expense/receipt contexts like 001-GAS, 002-GA). See `docs/project-category/` for full details.

#### `project_assignments`

- **Purpose:** Associates authenticated users with projects for field access.
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `user_id` uuid FK `auth.users`, `assigned_at` timestamptz default `now()`, `assigned_by` uuid FK `auth.users`, unique `(project_id, user_id)`.
- **Indexes:** none beyond PK/unique constraint.
- **Policies:** Users view own assignments; admins/managers manage.

#### `project_documents`

- **Purpose:** File manifest for project artifacts (drawings, permits, reports).
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `document_type` text, `file_url` text, `file_name` text, `file_size` numeric, `mime_type` text, `description` text nullable, `version_number` integer nullable, `expires_at` timestamptz nullable, `related_quote_id` uuid nullable (FK `quotes.id`), `uploaded_by` uuid nullable (FK `profiles.id`), timestamps.
- **Indexes:** `idx_project_documents_project_id`, `idx_project_documents_document_type`, `idx_project_documents_related_quote`.

#### `project_media`

- **Purpose:** Media library (photos, video) with EXIF-derived metadata.
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `file_url` text, `thumbnail_url` text nullable, `file_name` text, `mime_type` text, `file_type` text, `file_size` numeric, `duration` numeric nullable, `upload_source` text nullable, `taken_at` timestamptz nullable, `created_at` timestamptz default `now()`, `updated_at` timestamptz default `now()`, `uploaded_by` uuid nullable (`profiles`), location fields (lat/long/altitude, `location_name`), `device_model` text nullable, `description` text nullable, `caption` text nullable.
- **Indexes:** `idx_project_media_project_id`, `idx_project_media_taken_at`, `idx_project_media_uploaded_by`, `idx_project_media_file_type`.

#### `project_notes`

- **Purpose:** Structured project notes (with optional attachment reference).
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `user_id` uuid FK `profiles.id`, `note_text` text, `attachment_url` text nullable, `attachment_type` text nullable, `created_at` timestamptz default `now()`, `updated_at` timestamptz default `now()`.
- **Indexes:** `idx_project_notes_project_id`, `idx_project_notes_created_at DESC`.

#### `project_revenues`

- **Purpose:** Inbound revenue entries (invoices, payments).
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `client_id` uuid nullable (FK `clients.id`), `invoice_number` text nullable, `invoice_date` date default `current_date`, `amount` numeric, `account_name` text nullable, `account_full_name` text nullable, `quickbooks_transaction_id` text nullable, `description` text nullable, timestamps.
- **Indexes:** `idx_project_revenues_project_id`, `idx_project_revenues_client_id`, `idx_project_revenues_invoice_date`.

### Financial Operations

#### `estimates`

- **Purpose:** Baseline cost proposals with versioning.
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `estimate_number` text (unique), `revision_number` integer default `1`, `sequence_number` integer nullable, `version_number` integer nullable, `is_current_version` boolean nullable, `is_draft` boolean default `true`, `status` enum default `'draft'`, `date_created` date default `current_date`, `valid_until` date nullable, `valid_for_days` integer nullable, `notes` text nullable, `default_markup_percent` numeric nullable, `target_margin_percent` numeric nullable, `contingency_amount` numeric nullable, `contingency_percent` numeric nullable, `contingency_used` numeric nullable, `total_amount` numeric nullable, `total_cost` numeric nullable, `parent_estimate_id` uuid nullable (self FK), `created_by` uuid nullable, timestamps.
- **Indexes:** `idx_estimates_project_id`, `idx_estimates_number`, `idx_estimates_is_draft`, `idx_estimates_parent_estimate_id`, `idx_estimates_project_current_version (project_id, is_current_version)`.
- **Triggers:** `update_updated_at_column`.

#### `estimate_line_items`

- **Purpose:** Detailed scope line items tied to an estimate.
- **Columns:** `id` uuid PK, `estimate_id` uuid FK `estimates.id`, `category` enum, `description` text, quantity/rate-based pricing fields (with generated totals), QuickBooks item reference, scheduling fields (`scheduled_start_date`, `scheduled_end_date`, `duration_days`, `dependencies` JSONB default `[]`, `is_milestone` boolean default `false`, `schedule_notes` text), `markup_percent`/`markup_amount`, `price_per_unit`/`cost_per_unit`, `created_at` timestamptz.
- **Indexes:** `idx_estimate_line_items_estimate_id`, partial `idx_estimate_line_items_scheduled_dates`.

#### `change_orders`

- **Purpose:** Approved scope adjustments for a project.
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `change_order_number` text, `description` text, `reason_for_change` text nullable, `status` enum default `'pending'`, `requested_date` date default `current_date`, `approved_date` date nullable, `approved_by` uuid nullable, `amount` numeric default `0`, `client_amount` numeric nullable, `contingency_billed_to_client` numeric nullable, `cost_impact` numeric nullable, `margin_impact` numeric nullable, `includes_contingency` boolean nullable, timestamps.
- **Indexes:** `idx_change_orders_project_id`, `idx_change_orders_status`, `idx_change_orders_requested_date`, `idx_change_orders_approved_by`, unique `idx_change_orders_number_project (project_id, change_order_number)`.
- **Triggers:** `validate_change_order_approval_trigger`, `update_change_orders_updated_at`.

#### `change_order_line_items`

- **Purpose:** Scoped cost entries for change orders mirroring estimate line items.
- **Columns:** `id` uuid PK, `change_order_id` uuid FK `change_orders.id`, `category` enum, `description` text, `quantity` numeric default `1`, `unit` text nullable, `cost_per_unit` numeric default `0`, `price_per_unit` numeric default `0`, generated totals (`total_cost`, `total_price`, `markup_amount`), `duration_days` integer nullable, `dependencies` JSONB default `[]`, `is_milestone` boolean default `false`, `schedule_notes` text nullable, `payee_id` uuid nullable (`payees.id`), `sort_order` integer default `0`, `created_at` timestamptz default `now()`, `updated_at` timestamptz default `now()`.
- **Indexes:** `idx_change_order_line_items_change_order_id`, `idx_change_order_line_items_payee`, partial `idx_change_order_line_items_scheduled_dates`.

#### `quotes`

- **Purpose:** Vendor quotes tied to projects/estimates (now also payees).
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `estimate_id` uuid FK `estimates.id`, `payee_id` uuid FK `payees.id`, `quote_number` text unique, `date_received` date default `current_date`, `valid_until` date nullable, `status` enum default `'pending'`, `total_amount` numeric nullable, `notes` text nullable, `attachment_url` text nullable, `includes_labor` boolean default `false`, `includes_materials` boolean default `false`, timestamps.
- **Indexes:** `idx_quotes_project_id`, `idx_quotes_estimate_id`, `idx_quotes_number`, `idx_quotes_payee_id`, (legacy `idx_quotes_vendor_id` retained for historical data).

#### `quote_line_items`

- **Purpose:** Vendor quote detail entries, optionally mapped to estimate or change-order lines.
- **Columns:** `id` uuid PK, `quote_id` uuid FK `quotes.id`, `estimate_line_item_id` uuid nullable, `change_order_line_item_id` uuid nullable, `category` enum, `description` text nullable, `quantity` numeric default `1`, `unit` text nullable, `rate` numeric default `0`, generated totals, `sort_order` integer default `0`, timestamps.
- **Indexes:** `idx_quote_line_items_quote_id`, `idx_quote_line_items_co_line_item_id`.

#### `expenses`

- **Purpose:** Operational expense capture with approval workflow and receipt linkage.
- **Columns:** `id` uuid PK, `project_id` uuid FK `projects.id`, `payee_id` uuid nullable, `transaction_type` enum, `expense_date` date default `current_date`, `category` enum, `account_name`/`account_full_name` text nullable, `description` text nullable, `amount` numeric, `invoice_number` text nullable, `is_planned` boolean default `false`, `created_offline` boolean default `false`, `is_split` boolean default `false`, `is_locked` boolean nullable, `approval_status` text nullable, `approved_at` timestamptz nullable, `approved_by` uuid nullable, `rejection_reason` text nullable, `start_time` timestamptz nullable, `end_time` timestamptz nullable, `receipt_id` uuid nullable (FK `receipts.id`), `local_id` text nullable, `quickbooks_transaction_id` text nullable, `attachment_url` text nullable, `user_id` uuid nullable (`auth.users`), `submitted_for_approval_at` timestamptz nullable, `synced_at` timestamptz nullable, timestamps.
- **Indexes:** `idx_expenses_project_id`, `idx_expenses_quickbooks_id`, `idx_expenses_payee_id`, `idx_expenses_is_split`, `idx_expenses_start_time` (for labor internal tasks), `idx_expenses_end_time`, `idx_expenses_approval_status`, `idx_expenses_approved_by`, `idx_expenses_local_id`, `expenses_receipt_id_idx`.

#### `expense_splits`

- **Purpose:** Allocates a single expense across multiple projects.
- **Columns:** `id` uuid PK, `expense_id` uuid FK `expenses.id`, `project_id` uuid FK `projects.id`, `split_amount` numeric, `split_percentage` numeric nullable, `notes` text nullable, `created_by` uuid nullable (`profiles.id`), timestamps.
- **Indexes:** `idx_expense_splits_expense_id`, `idx_expense_splits_project_id`, `idx_expense_splits_created_at DESC`.

#### `expense_line_item_correlations`

- **Purpose:** Tracks how expenses align with estimate/quote/change-order lines.
- **Columns:** `id` uuid PK, `expense_id` uuid nullable, `expense_split_id` uuid nullable, `estimate_line_item_id` uuid nullable, `change_order_line_item_id` uuid nullable, `quote_id` uuid nullable, `correlation_type` text, `confidence_score` numeric nullable, `auto_correlated` boolean nullable, `notes` text nullable, `created_at` timestamptz default `now()`, `updated_at` timestamptz default `now()`.
- **Indexes:** `idx_expense_correlations_expense_id`, `idx_expense_correlations_estimate_line_item_id`, `idx_expense_correlations_quote_id`, `idx_expense_correlations_co_line_item`, `idx_correlations_split_id`.

#### `receipts`

- **Purpose:** Raw receipt captures (before/after expense conversion).
- **Columns:** `id` uuid PK, `user_id` uuid FK `profiles.id`, `project_id` uuid nullable (`projects.id`), `payee_id` uuid nullable (`payees.id`), `image_url` text, `amount` numeric, `description` text nullable, `approval_status` text nullable, `captured_at` timestamptz default `now()`, `submitted_for_approval_at` timestamptz nullable, `approved_at` timestamptz nullable, `approved_by` uuid nullable, `rejection_reason` text nullable, timestamps.
- **Indexes:** `receipts_user_id_idx`, `receipts_payee_id_idx`, `receipts_project_id_idx`, `receipts_captured_at_idx (DESC)`, `idx_receipts_approval_status`.

#### `project_media` support table — `media_comments`

- **Purpose:** Comments anchored to media items.
- **Columns:** `id` uuid PK, `media_id` uuid FK `project_media.id`, `user_id` uuid FK `profiles.id`, `comment_text` text, `created_at` timestamptz, `updated_at` timestamptz.
- **Indexes:** `idx_media_comments_media_id`, `idx_media_comments_created_at DESC`, `idx_media_comments_user_id`.

### Metadata & System

#### `profiles`

- **Purpose:** Application-facing profile table mirroring Supabase auth users.
- **Columns:** `id` uuid PK (`auth.users`), `email` text nullable, `full_name` text nullable, `is_active` boolean default `true`, `must_change_password` boolean default `false`, `password_changed_at` timestamptz nullable, `failed_login_attempts` integer default `0`, `account_locked_until` timestamptz nullable, `deactivated_at` timestamptz nullable, `deactivated_by` uuid nullable (`profiles.id`), timestamps.
- **Indexes:** `idx_profiles_is_active`, `idx_profiles_must_change_password`.

#### `user_roles`

- **Purpose:** Multi-role assignments for an auth user.
- **Columns:** `id` uuid PK, `user_id` uuid FK `auth.users`, `role` enum `app_role`, `assigned_at` timestamptz default `now()`, `assigned_by` uuid nullable (`auth.users`); unique `(user_id, role)`.
- **Indexes:** rely on PK & unique constraint.

#### `quickbooks_account_mappings`

- **Purpose:** Maps QuickBooks account paths to internal expense categories.
- **Columns:** `id` uuid PK, `qb_account_full_path` text, `qb_account_name` text, `app_category` enum, `is_active` boolean default `true`, timestamps.
- **Indexes:** none; each account path expected unique.

#### `quickbooks_sync_log`

- **Purpose:** Tracks import/export sync attempts.
- **Columns:** `id` uuid PK, `sync_type` enum, `entity_type` text, `entity_id` uuid nullable, `quickbooks_id` text nullable, `status` enum default `'pending'`, `error_message` text nullable, `synced_at` timestamptz nullable, `created_at` timestamptz default `now()`.
- **Indexes:** `idx_sync_log_entity (entity_type, entity_id)`, `idx_sync_log_quickbooks_id`.

#### `system_settings`

- **Purpose:** Arbitrary key-value feature flags or configuration.
- **Columns:** `id` uuid PK, `setting_key` text, `setting_value` text, `description` text nullable, timestamps.
- **Indexes:** none.

#### `admin_actions` already covered under Activity.

#### `reporting.project_financials` view usage

- Primary data source for the report builder system (`execute_simple_report` RPC function)
- Used by financial dashboards and reporting components
- Provides aggregated metrics without requiring complex joins in application code
- All FK relationships reference the base `projects` table; the view is read-only for reporting purposes

#### Archival Table `estimate_line_items_backup_20251030`

- Legacy snapshot created during schedule migration; structure mirrors `estimate_line_items` but is not touched by application code. Retained for reference/migrations only; no indexes.

## Recommendations

- **Add composite indexes for assignment lookups:** `project_assignments` is frequently queried by `user_id` (e.g., to populate dashboards). Consider adding an index on `(user_id, project_id)` to avoid sequential scans when `user_id` is the filter.
- **Enforce singleton or tenancy on branding:** `company_branding_settings` lacks a tenant discriminator and unique constraint. If multiple companies are supported, add a `company_id` FK with a unique constraint; if global singleton, add a check/constraint to prevent multiple rows.
- **Normalize QuickBooks remnants:** Legacy fields such as `vendor_id` columns and indexes (`idx_quotes_vendor_id`, `idx_expenses_vendor_id`) remain in the schema but no longer have direct application usage. Evaluate whether these should be dropped to reduce confusion.
- **Audit approval references:** `change_orders.approved_by` and `expenses.approved_by` store raw UUIDs without FK constraints (to avoid cross-schema references). Consider shadow columns with FK to `profiles.id` plus triggers to maintain alignment if referential integrity is desired.
- **Monitor view dependencies:** Several FK relationships point to `project_financial_summary`. While harmless, it complicates introspection. A future cleanup could remove redundant references to improve Supabase type clarity.

