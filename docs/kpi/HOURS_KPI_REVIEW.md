# Total Net Hours & Gross Hours – Database & KPI Guide Review

## Short Answer

**Yes, we have total net hours and gross hours** – in KPI definitions, in the weekly view, and in calculations. They are **not stored as columns** on the `expenses` table; both are **derived** from `start_time`, `end_time`, `lunch_duration_minutes`, `lunch_taken`, and (when needed) `amount` / `hourly_rate`.

---

## Where They Exist

### 1. KPI Definitions (library)

| Measure | Name | Source | Where shown in KPI Guide |
|--------|------|--------|---------------------------|
| **Per time entry** | | | |
| `time_entry_gross_hours` | Gross Hours | Frontend (calculated) | **Not shown** – no Time Entries tab |
| `time_entry_hours` | Hours (Net/Billable) | Database (`expenses.hours`) | **Not shown** – no Time Entries tab |
| **Under Expenses** | | | |
| `expense_gross_hours` | Gross Hours | Frontend (calculated) | **Expenses** tab |
| `expense_net_hours` | Net Hours (Billable) | Database (`expenses.hours`) | **Expenses** tab |
| **Under Views** | | | |
| `weekly_labor_total_hours` | Total Hours (Weekly Net) | View | **Views** tab |
| `weekly_labor_gross_hours` | Gross Hours (Weekly) | View | **Views** tab |

So in the **KPI Guide UI** today you get:

- **Expenses tab:** Gross Hours, Net Hours (Billable).
- **Views tab:** Total Hours (Weekly Net), Gross Hours (Weekly).
- **No Time Entries tab:** the dedicated time-entry KPIs (gross_hours, hours/net) are **not** visible in the guide.

### 2. Database

- **`expenses` table (Supabase types):**  
  No `hours` column and no `gross_hours` column.  
  So **total net hours** and **gross hours** for a single time entry are **not** stored; they are computed (see below).

- **`weekly_labor_hours` view:**  
  Has `total_hours` (net) and `gross_hours`, both computed in the view from `expenses` (start/end/lunch and amount/rate).

### 3. How Net and Gross Are Actually Computed

- **Gross hours (per entry):**  
  `EXTRACT(EPOCH FROM (end_time - start_time)) / 3600`  
  (or, when no times: `amount / hourly_rate`).

- **Net hours (per entry):**  
  Gross minus lunch:  
  `Gross - (lunch_duration_minutes / 60)` when lunch is taken; otherwise same as gross.  
  (Or, when no times: `amount / hourly_rate`.)

So we **do** have total net hours and gross hours in the **model** and in the **view**; we just don’t have them as physical columns on `expenses`.

---

## Gaps / Inconsistencies

1. **KPI Guide has no “Time Entries” tab**  
   So the **per-entry** “Total Net Hours” and “Gross Hours” (from `timeEntryKPIs`) are not visible in the guide, even though they exist in the library.

2. **`expense_net_hours` says field `expenses.hours`**  
   The `expenses` table has no `hours` column in the DB types. Net hours are calculated (or derived from amount/rate). The KPI definition is misleading; it should describe this as calculated/derived, not as a stored column.

3. **Naming**  
   We use “Net Hours (Billable)”, “Hours (Net/Billable)”, “Total Hours (Weekly Net)”. We do **not** use a single explicit “Total Net Hours” label for the per-entry measure in the guide, which can make it harder to find.

---

## Recommendations

1. **Add a “Time Entries” tab** to the KPI Guide and show `timeEntryKPIs` there, so **Gross Hours** and **Hours (Net/Billable)** – i.e. total net hours and gross hours per entry – are clearly documented.
2. **Update expense_net_hours** (and any similar) so the field/source reflects that net hours are **calculated** (from start/end/lunch or amount/rate), not stored in `expenses.hours`, and fix the KPI Guide / docs accordingly.
3. **Optionally** add a short “Hours (Net vs Gross)” section in the KPI Guide reference tab so users see in one place: total net hours = billable after lunch; gross hours = total shift length (e.g. for compliance/OT).

---

## Summary Table

| Concept | In DB? | In KPI defs? | In KPI Guide UI? |
|--------|--------|----------------|-------------------|
| Gross hours (per entry) | No (calculated) | Yes (`time_entry_gross_hours`, `expense_gross_hours`) | Expenses only; no Time Entries tab |
| Net hours (per entry) | No (calculated) | Yes (`time_entry_hours`, `expense_net_hours`) | Expenses only; no Time Entries tab |
| Total hours weekly (net) | In view (`weekly_labor_hours.total_hours`) | Yes (`weekly_labor_total_hours`) | Views tab |
| Gross hours weekly | In view (`weekly_labor_hours.gross_hours`) | Yes (`weekly_labor_gross_hours`) | Views tab |

So: we **do** have total net hours and gross hours in the system and in the KPI definitions; the main gaps are (1) no Time Entries tab in the guide, and (2) documentation/field metadata that still references a non-existent `expenses.hours` column.
