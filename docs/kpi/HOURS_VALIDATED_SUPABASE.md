# Total Net Hours & Gross Hours – Validated in Supabase

**Validated via MCP `user-supabase` execute_sql against project `clsjdxwbsjbhjibvlqbz`.**

---

## Where hours exist in the database

| Location | Type | Columns | Stored or computed |
|----------|------|---------|--------------------|
| **public.expenses** | TABLE | (no `hours`, no `gross_hours`) | — |
| **public.expense_splits** | TABLE | split_amount, split_percentage, etc. (no hours) | — |
| **public.expense_line_item_correlations** | TABLE | (no hours) | — |
| **public.estimate_line_items** | TABLE | **labor_hours**, billing_rate_per_hour, actual_cost_rate_per_hour | **Stored** (estimate labor) |
| **public.change_order_line_items** | TABLE | **labor_hours**, billing_rate_per_hour, actual_cost_rate_per_hour | **Stored** (change order labor) |
| **public.estimate_financial_summary** | TABLE | **total_labor_hours**, cushion_hours_capacity | **Stored** (summary) |
| **public.payees** | TABLE | **hourly_rate** | **Stored** (rate, not hours) |
| **public.weekly_labor_hours** | VIEW | **total_hours**, **gross_hours**, hourly_rate | **Computed** (from expenses) |
| **reporting.weekly_labor_hours** | VIEW | **total_hours**, **gross_hours**, hourly_rate | **Computed** |
| **reporting.internal_labor_hours_by_project** | VIEW | **estimated_hours**, **actual_hours**, **hours_variance** | **Computed** |

**Conclusion:** Time-entry net/gross hours (from labor_internal expenses) are **not stored in any table**. They exist only as **computed** values in the views above. The only **stored** hours in the DB are: **estimate_line_items.labor_hours**, **change_order_line_items.labor_hours**, and **estimate_financial_summary.total_labor_hours** (estimate/change-order context). Per time-entry hours are derived from expenses.start_time, end_time, lunch_duration_minutes, lunch_taken, amount, and payees.hourly_rate.

---

## 1. `public.expenses` table

**Columns (from `information_schema.columns`):**

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| project_id | uuid | NO |
| payee_id | uuid | YES |
| transaction_type | USER-DEFINED | NO |
| expense_date | date | YES |
| category | USER-DEFINED | NO |
| account_name | text | YES |
| account_full_name | text | YES |
| description | text | YES |
| amount | numeric | NO |
| invoice_number | text | YES |
| is_planned | boolean | YES |
| quickbooks_transaction_id | text | YES |
| attachment_url | text | YES |
| created_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | YES |
| approval_status | text | YES |
| submitted_for_approval_at | timestamp with time zone | YES |
| approved_by | uuid | YES |
| approved_at | timestamp with time zone | YES |
| rejection_reason | text | YES |
| is_locked | boolean | YES |
| updated_by | uuid | YES |
| created_offline | boolean | YES |
| synced_at | timestamp with time zone | YES |
| local_id | text | YES |
| user_id | uuid | YES |
| receipt_id | uuid | YES |
| start_time | timestamp with time zone | YES |
| end_time | timestamp with time zone | YES |
| is_split | boolean | NO |
| lunch_taken | boolean | YES |
| lunch_duration_minutes | integer | YES |

**Facts:**

- **No `hours` column** on `expenses`.
- **No `gross_hours` column** on `expenses`.
- Net and gross hours must be **calculated** from `start_time`, `end_time`, `lunch_duration_minutes`, `lunch_taken`, and (when needed) `amount` / payee `hourly_rate`.

---

## 2. `public.weekly_labor_hours` view

**Columns:**

| column_name | data_type |
|-------------|-----------|
| employee_number | text |
| employee_name | text |
| week_start_sunday | date |
| week_end_saturday | timestamp without time zone |
| **total_hours** | numeric |
| **gross_hours** | numeric |
| total_cost | numeric |
| hourly_rate | numeric |
| entry_count | bigint |
| approved_entries | bigint |
| pending_entries | bigint |
| rejected_entries | bigint |

**Facts:**

- **`total_hours`** exists (total net / billable hours for the week).
- **`gross_hours`** exists (total gross shift hours for the week).
- Both are computed in the view; they are not stored on `expenses`.

---

## 3. Implications

1. **KPI / app logic** that references `expenses.hours` or `expenses.gross_hours` is wrong for this DB; use computed values from start/end/lunch or amount/rate.
2. **`execute_simple_report`** (migration 20260129120000) uses `SUM(exp.hours)` for data source `'internal_labor_hours'`. That will **error** at runtime because `expenses` has no `hours` column. That branch needs to be changed to compute hours (e.g. same logic as `weekly_labor_hours`) instead of selecting `exp.hours`.
3. **Total net hours** and **gross hours** are available from:
   - **View:** `weekly_labor_hours.total_hours` and `weekly_labor_hours.gross_hours`.
   - **Per row:** computed from `expenses` (start_time, end_time, lunch_duration_minutes, lunch_taken, amount, payee hourly_rate).
