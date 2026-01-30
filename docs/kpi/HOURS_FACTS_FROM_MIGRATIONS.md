# Facts: Total Net Hours & Gross Hours (from migrations only)

**I did not run any queries against your Supabase project.** The below is from the migration files and TypeScript types only. To get facts from your live DB, run `docs/kpi/VALIDATE_HOURS_IN_SUPABASE.sql` in the Supabase SQL Editor.

---

## 1. Where the `expenses` table is defined

- **Not in this repo.** No migration in `supabase/migrations/` contains `CREATE TABLE ... expenses` or `ALTER TABLE ... expenses ... ADD COLUMN`.
- So the **canonical list of columns** for `expenses` is not in these migrations; it was created elsewhere (earlier project or different repo).

---

## 2. What the migrations say about `hours` and `gross_hours`

| Source | Fact |
|--------|------|
| **20260129120001_fix_weekly_labor_hours_gross_hours.sql** | Comment: *"no e.hours column, so compute from time or amount/rate"*. So that migration **assumes `expenses` has no `hours` column**. |
| **20260129120001** (same file) | Defines view `weekly_labor_hours` with **computed** `total_hours` and `gross_hours` (from `start_time`, `end_time`, `lunch_duration_minutes`, or `amount`/`hourly_rate`). No reference to `e.hours`. |
| **20260129120000_fix_enum_casting_in_execute_simple_report.sql** | For data source `'internal_labor_hours'`, the SQL uses **`SUM(exp.hours)`** from `expenses`. So that migration **assumes `expenses` has an `hours` column**. |

So in the migration history:

- One migration says there is **no** `e.hours` column and computes net from time/amount.
- Another migration **uses** `exp.hours` in `execute_simple_report`.

That is an **inconsistency**. Either:

- The live DB has `expenses.hours` (and 20260129120001 is only saying “we don’t use it in this view”), or  
- The live DB does **not** have `expenses.hours`, and the `internal_labor_hours` branch in `execute_simple_report` will **error** when run.

Only Supabase can tell you which is true.

---

## 3. TypeScript types (generated, not source of truth)

- **Path:** `src/integrations/supabase/types.ts`
- **expenses Row:** Lists columns such as `amount`, `start_time`, `end_time`, `lunch_duration_minutes`, `lunch_taken`, etc. **It does not list `hours` or `gross_hours`.**
- So the **generated types** say: no `hours`, no `gross_hours` on `expenses`. Types can be stale; the DB is the truth.

---

## 4. View `weekly_labor_hours` (from migrations)

- **Definition:** `20260129120001_fix_weekly_labor_hours_gross_hours.sql`
- **Columns (from that migration):**  
  `employee_number`, `employee_name`, `week_start_sunday`, `week_end_saturday`, **`total_hours`**, **`gross_hours`**, `total_cost`, `hourly_rate`, `entry_count`, `approved_entries`, `pending_entries`, `rejected_entries`
- **total_hours:** Computed (net; with lunch deduction when `start_time`/`end_time` exist; else `amount`/rate).
- **gross_hours:** Computed from `EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 3600` or `amount`/rate.

So in the **migrations**, the view **does** expose total net hours and gross hours; they are not stored on `expenses` in that migration.

---

## 5. How to get facts from Supabase

1. Open **Supabase Dashboard → SQL Editor**.
2. Open **`docs/kpi/VALIDATE_HOURS_IN_SUPABASE.sql`** in this repo.
3. Copy its contents into a new query and run it.

That will show:

- All columns of `public.expenses` (and whether `hours` / `gross_hours` exist).
- All columns of `public.weekly_labor_hours` (including `total_hours` and `gross_hours`).

Use that output as the **facts** for your DB. No updates were made to the app in this step; this is validation and documentation only.
