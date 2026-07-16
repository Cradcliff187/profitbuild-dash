# AI Reporting Accuracy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Reports AI physically incapable of stating a financial number it did not receive from Postgres, and make its SQL failures self-repairing instead of user-facing.

**Architecture:** Three moves. (1) `execute_ai_query` becomes the single source of numeric truth — it computes per-column totals over the **full** result set (before the 500-row cap) and returns them alongside the data; the edge function injects those totals as ground truth and the answer prompt forbids arithmetic. (2) The RPC stops destroying `SQLSTATE`, so the edge function classifies errors on Postgres error codes instead of substring guesses — which makes the entire `42xxx` "malformed SQL" class retryable, including the `42803` GROUP BY error that is currently the one class with no retry. (3) The retry stops "simplifying" (which silently answers a different question) and starts **repairing** the specific error. Plus targeted fixes: the `ReportViewer` totals-row label collision, the prompt self-contradiction on name matching, a stronger model for SQL generation only, and Whisper domain biasing.

**Tech Stack:** Supabase Postgres (PL/pgSQL, `SECURITY DEFINER`), Deno edge functions, OpenAI (`gpt-4o` for SQL, `gpt-4o-mini` for narration, `whisper-1` for voice), React 18 + TypeScript, Vitest + jsdom.

---

## Decisions (made per Chris's "best root-cause fix, your call")

| Decision | Choice | Why this is the root fix |
|---|---|---|
| **Totals source** | RPC computes over the **full** result set; UI prefers server totals, falls back to client compute | The model doing arithmetic is the root cause. Deterministic math in Postgres is Architectural Rule 1 applied to the narration layer. Computing pre-`LIMIT 500` also kills the truncation lie in both the prose *and* the table footer. Client fallback retained because `ReportViewer` is shared with non-AI reports that have no RPC totals. |
| **SQL model** | `gpt-4o` for SQL generation only; `gpt-4o-mini` stays for narration/insights | Prompt-only fixes already failed once on this exact class — the name-matching guidance is deployed (v79) and was ignored. Narration no longer does math, so it stays cheap. ~$0.08/query on one of four calls. |
| **Retry prompt** | Repair the error, don't simplify | The current retry prompt says "Uses only the main table (reporting.project_financials)" and "Might answer a related but simpler question" — it would rewrite an expenses/payee query into a project query and answer something else. Making GROUP BY retryable *without* this fix would just trade a loud error for a silent wrong answer. |
| **Delivery** | One PR, one commit per task | The totals fix depends on the RPC change; the retry fix depends on the SQLSTATE change. Splitting them means shipping half-mechanisms. Lovable requires a manual Publish per release, so fewer publishes is also operationally better. |

## Evidence this plan is built on (verified against production, 2026-07-16)

- `ILIKE '%chris radcliff%'` → **13 rows, $8,531.87** (all `bill` / `approved`). The AI narrated **$6,161.87**. No filter combination reproduces the stated figure — it is fabricated arithmetic, off by $2,370.
- `ReportViewer.tsx:472` computes `$8,531.87` correctly at line 187 and then overwrites it with the literal string `'Total'` because the currency column is index 0.
- `parseQueryError` (index.ts:714–769) routes `column "e.expense_date" must appear in the GROUP BY clause` to `canRetry: false` — it contains `column` but not `does not exist`.
- `execute_ai_query`'s `WHEN OTHERS THEN RAISE EXCEPTION 'Query execution failed: %', SQLERRM` discards SQLSTATE `42803`.
- Deployed `ai-report-assistant` is **v79** (CLAUDE.md pins v78 — drift to reconcile in Task 12).
- `transcribe-audio` (v142) sends only `file` + `model` to `whisper-1`.

---

## File Structure

| File | Responsibility |
|---|---|
| **Create** `src/utils/reportTotals.ts` | Pure totals logic for report tables: compute per-column numeric totals, and resolve which footer cell carries the `Total` label. Extracted out of `ReportViewer` so the label-collision bug is unit-testable without React Testing Library (not installed). |
| **Create** `src/utils/__tests__/reportTotals.test.ts` | Vitest coverage for the above, including the exact production regression (currency column at index 0). |
| **Create** `supabase/functions/ai-report-assistant/queryErrors.ts` | Pure SQLSTATE-based error classifier. Deno-importable (explicit `.ts`) and Vitest-importable (no Deno globals). |
| **Create** `src/utils/__tests__/queryErrors.test.ts` | Vitest coverage for the classifier, including `42803`. |
| **Create** `supabase/migrations/<version>_ai_query_totals_and_sqlstate.sql` | Placeholder only, per the Critical Migration Rules. Real SQL applied via MCP. |
| **Modify** `src/components/reports/ReportViewer.tsx:23-29, 186-205, 245-261, 468-476` | Accept optional `totals` + `truncated` props; render footer via `reportTotals`. |
| **Modify** `src/components/reports/AIReportChat.tsx:295-305` | Pass server totals + truncated flag through to `ReportViewer`. |
| **Modify** `src/hooks/useAIReportAssistant.ts` | Carry `totals` + `truncated` on the message shape. |
| **Modify** `supabase/functions/ai-report-assistant/index.ts` | Use the classifier; repair-not-simplify retry; inject authoritative totals; ban arithmetic in the answer prompt; fix the name-matching contradiction; `gpt-4o` for SQL; NULL-safe field inference; return `totals`. |
| **Modify** `supabase/functions/transcribe-audio/index.ts:92-107` | Add Whisper `prompt`, `language`, `temperature`. |
| **Modify** `CLAUDE.md` | New Gotcha #71, Rule update, version pins. |

---

## Task 1: Extract and fix the report totals logic

**Files:**
- Create: `src/utils/reportTotals.ts`
- Test: `src/utils/__tests__/reportTotals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/reportTotals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeColumnTotals, resolveTotalsLabelIndex, isNumericField } from '../reportTotals';
import type { ReportField } from '@/utils/reportExporter';

// Exact shape of the production regression: the currency column is index 0.
const FIELDS: ReportField[] = [
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'payee_name', label: 'Payee Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'expense_date', label: 'Expense Date', type: 'date' },
];

const ROWS = [
  { amount: 100, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 1300, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 1062.5, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 175, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 400, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-07-02' },
  { amount: 475, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 125, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 550, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 325, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 650, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-17' },
  { amount: 1425, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-06-03' },
  { amount: 1494.37, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-05-20' },
  { amount: 450, category: 'subcontractors', payee_name: 'Chris Radcliff', description: 'bill', expense_date: '2026-05-20' },
];

describe('isNumericField', () => {
  it('treats currency, number and percent as numeric', () => {
    expect(isNumericField({ key: 'a', label: 'A', type: 'currency' })).toBe(true);
    expect(isNumericField({ key: 'a', label: 'A', type: 'number' })).toBe(true);
    expect(isNumericField({ key: 'a', label: 'A', type: 'percent' })).toBe(true);
  });

  it('treats text, date and boolean as non-numeric', () => {
    expect(isNumericField({ key: 'a', label: 'A', type: 'text' })).toBe(false);
    expect(isNumericField({ key: 'a', label: 'A', type: 'date' })).toBe(false);
    expect(isNumericField({ key: 'a', label: 'A', type: 'boolean' })).toBe(false);
    expect(isNumericField({ key: 'a', label: 'A' })).toBe(false);
  });
});

describe('computeColumnTotals', () => {
  it('sums the production regression to the value the AI failed to state', () => {
    const totals = computeColumnTotals(ROWS, FIELDS);
    expect(totals.amount).toBeCloseTo(8531.87, 2);
  });

  it('does not produce totals for non-numeric columns', () => {
    const totals = computeColumnTotals(ROWS, FIELDS);
    expect(totals.category).toBeUndefined();
    expect(totals.expense_date).toBeUndefined();
  });

  it('averages percent columns rather than summing them', () => {
    const fields: ReportField[] = [{ key: 'margin_percent', label: 'Margin', type: 'percent' }];
    const totals = computeColumnTotals(
      [{ margin_percent: 10 }, { margin_percent: 20 }, { margin_percent: 30 }],
      fields
    );
    expect(totals.margin_percent).toBeCloseTo(20, 5);
  });

  it('ignores nulls when averaging percent columns', () => {
    const fields: ReportField[] = [{ key: 'margin_percent', label: 'Margin', type: 'percent' }];
    const totals = computeColumnTotals(
      [{ margin_percent: 10 }, { margin_percent: null }, { margin_percent: 30 }],
      fields
    );
    expect(totals.margin_percent).toBeCloseTo(20, 5);
  });

  it('treats null and non-numeric values as zero when summing', () => {
    const fields: ReportField[] = [{ key: 'amount', label: 'Amount', type: 'currency' }];
    const totals = computeColumnTotals(
      [{ amount: 100 }, { amount: null }, { amount: 'oops' }, { amount: 50 }],
      fields
    );
    expect(totals.amount).toBeCloseTo(150, 2);
  });

  it('returns an empty map for an empty dataset', () => {
    expect(computeColumnTotals([], FIELDS)).toEqual({});
  });
});

describe('resolveTotalsLabelIndex', () => {
  it('REGRESSION: does not put the label on a numeric first column', () => {
    // Production bug: `index === 0 ? 'Total' : ...` blanked the $8,531.87 total
    // because the currency column was index 0.
    const idx = resolveTotalsLabelIndex(FIELDS);
    expect(idx).not.toBe(0);
    expect(idx).toBe(1); // 'category' is the first non-numeric column
  });

  it('uses index 0 when the first column is non-numeric', () => {
    const fields: ReportField[] = [
      { key: 'project', label: 'Project', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'currency' },
    ];
    expect(resolveTotalsLabelIndex(fields)).toBe(0);
  });

  it('returns -1 when every column is numeric (no cell is free for a label)', () => {
    const fields: ReportField[] = [
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'hours', label: 'Hours', type: 'number' },
    ];
    expect(resolveTotalsLabelIndex(fields)).toBe(-1);
  });

  it('returns -1 for an empty field list', () => {
    expect(resolveTotalsLabelIndex([])).toBe(-1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/__tests__/reportTotals.test.ts`
Expected: FAIL — `Failed to resolve import "../reportTotals"`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/reportTotals.ts`:

```ts
import type { ReportField } from '@/utils/reportExporter';

/**
 * Totals logic for report tables, extracted from ReportViewer so it can be
 * unit-tested without a DOM harness.
 *
 * Background: ReportViewer previously rendered its footer as
 *   `{index === 0 ? 'Total' : (formattedTotals[field.key] || '')}`
 * which silently discarded the total whenever the first column was the numeric
 * one — the exact shape of an "expenses by payee" result. See CLAUDE.md Gotcha #71.
 */

export type ColumnTotals = Record<string, number>;

/** Columns we can meaningfully aggregate. */
export function isNumericField(field: ReportField): boolean {
  return field.type === 'currency' || field.type === 'number' || field.type === 'percent';
}

/**
 * Sum currency/number columns; average percent columns (summing percentages is
 * meaningless). Non-numeric columns get no entry at all — callers use the
 * absence of a key to decide a cell is free to hold the "Total" label.
 */
export function computeColumnTotals(data: any[], fields: ReportField[]): ColumnTotals {
  const totals: ColumnTotals = {};
  if (!data.length) return totals;

  for (const field of fields) {
    if (field.type === 'currency' || field.type === 'number') {
      totals[field.key] = data.reduce((sum, row) => sum + (Number(row[field.key]) || 0), 0);
    } else if (field.type === 'percent') {
      const values = data
        .map(row => Number(row[field.key]))
        .filter(val => Number.isFinite(val));
      if (values.length > 0) {
        totals[field.key] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }
  }

  return totals;
}

/**
 * Index of the footer cell that should carry the "Total" label: the first
 * column that has no total of its own. Returns -1 when every column is numeric,
 * in which case there is no free cell and the caller renders no label (the
 * footer is still visually distinct and carries aria-label="Totals").
 */
export function resolveTotalsLabelIndex(fields: ReportField[]): number {
  return fields.findIndex(field => !isNumericField(field));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/__tests__/reportTotals.test.ts`
Expected: PASS — 12 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/reportTotals.ts src/utils/__tests__/reportTotals.test.ts
git commit -m "fix(reports): extract totals logic; label no longer clobbers a numeric first column"
```

---

## Task 2: Render the real total in ReportViewer, and never overstate a truncated one

**Files:**
- Modify: `src/components/reports/ReportViewer.tsx:23-29, 186-205, 245-261, 468-476`

- [ ] **Step 1: Add the import**

In `src/components/reports/ReportViewer.tsx`, after line 21 (`import { cn } from "@/lib/utils";`), add:

```tsx
import { computeColumnTotals, resolveTotalsLabelIndex, type ColumnTotals } from '@/utils/reportTotals';
```

- [ ] **Step 2: Extend the props**

Replace the interface at lines 23-29:

```tsx
interface ReportViewerProps {
  data: any[];
  fields: ReportField[];
  isLoading?: boolean;
  pageSize?: number;
  /**
   * Authoritative per-column totals computed server-side over the FULL result
   * set. When present these win over client-side computation, because `data`
   * may be capped at 500 rows by execute_ai_query — summing it would understate
   * the truth while looking authoritative.
   */
  totals?: ColumnTotals;
  /** True when the server capped `data`; suppresses any client-computed total. */
  truncated?: boolean;
}
```

Then update the component signature (the destructured props just below the interface) to:

```tsx
export function ReportViewer({ data, fields, isLoading, pageSize, totals: serverTotals, truncated }: ReportViewerProps) {
```

> Keep whatever the existing signature's default for `pageSize` is — only add the two new props.

- [ ] **Step 3: Replace the totals computation**

Replace the `totals` useMemo at lines 186-205 with:

```tsx
  // Totals: server-computed values win (they cover the full result set, not the
  // 500-row cap). Fall back to client computation for non-AI reports, which pass
  // complete data and no server totals. If the server truncated and gave us no
  // totals, we show none rather than a confidently understated number.
  const totals = useMemo<ColumnTotals>(() => {
    if (serverTotals) return serverTotals;
    if (truncated) return {};
    return computeColumnTotals(data, fields);
  }, [serverTotals, truncated, data, fields]);

  const totalsLabelIndex = useMemo(() => resolveTotalsLabelIndex(fields), [fields]);
  const hasAnyTotal = useMemo(() => Object.keys(totals).length > 0, [totals]);
```

- [ ] **Step 4: Simplify formattedTotals**

Replace the `formattedTotals` useMemo at lines 249-261 with:

```tsx
  const formattedTotals = useMemo(() => {
    const formatted: Record<string, string> = {};
    fields.forEach(field => {
      formatted[field.key] = totals[field.key] !== undefined
        ? formatValue(totals[field.key], field.type)
        : '';
    });
    return formatted;
  }, [totals, fields]);
```

- [ ] **Step 5: Fix the footer render — the actual bug**

Replace the `<TableFooter>` block at lines 468-476 with:

```tsx
            {hasAnyTotal && (
              <TableFooter className="sticky bottom-0 bg-muted/50 border-t z-10">
                <TableRow className="font-semibold" aria-label="Totals">
                  {fields.map((field, index) => (
                    <TableCell key={field.key} className="whitespace-nowrap">
                      {formattedTotals[field.key] !== ''
                        ? formattedTotals[field.key]
                        : (index === totalsLabelIndex ? 'Total' : '')}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            )}
```

Why this is correct: a cell renders its own total whenever it has one. The `'Total'` label only lands in a cell that has **no** total to display, so it can never overwrite a number. When every column is numeric (`totalsLabelIndex === -1`) no label renders, and `aria-label="Totals"` carries the meaning. When nothing is aggregatable the footer is omitted entirely instead of rendering an empty row — which is what the transcript showed.

- [ ] **Step 6: Verify type-check and existing tests**

Run: `npm run type-check && npx vitest run`
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/reports/ReportViewer.tsx
git commit -m "fix(reports): render real column totals in footer; suppress totals on truncated data"
```

---

## Task 3: Make `execute_ai_query` the source of numeric truth and stop destroying SQLSTATE

**Files:**
- Create: `supabase/migrations/<version>_ai_query_totals_and_sqlstate.sql` (placeholder — see Critical Migration Rules)

This RPC does four things wrong today: it discards `SQLSTATE`, it strips the model's `LIMIT` (so "top 5" returns 500), it caps `row_count` at 501, and it computes no totals. All four are fixed by one rewrite. Wrapping the user query in a `MATERIALIZED` CTE evaluates it **once**, makes an inner `LIMIT` legal (so stripping is no longer needed), and lets `row_count` and `totals` be computed over the full set while `data` stays capped at 500.

- [ ] **Step 1: Verify the current failure on the sandbox before changing anything**

Run via MCP `execute_sql` against `clsjdxwbsjbhjibvlqbz`:

```sql
SELECT public.execute_ai_query(
  'SELECT SUM(e.amount) FROM expenses e JOIN payees p ON p.id = e.payee_id
   WHERE p.payee_name ILIKE ''%chris radcliff%'' ORDER BY e.expense_date DESC'
);
```

Expected: ERROR `Query execution failed: column "e.expense_date" must appear in the GROUP BY clause...` with SQLSTATE `P0001` (`raise_exception`) — **not** the true `42803`. This is the bug: the code the edge function needs is gone.

- [ ] **Step 2: Apply the migration via MCP `apply_migration`**

Name: `ai_query_totals_and_sqlstate`

```sql
CREATE OR REPLACE FUNCTION public.execute_ai_query(p_query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '10s'
 SET search_path TO 'public', 'reporting', 'extensions'
AS $function$
DECLARE
  result jsonb;
  clean_query text;
BEGIN
  -- Strip leading/trailing whitespace and any trailing semicolon.
  clean_query := btrim(p_query, E' \t\n\r');
  clean_query := regexp_replace(clean_query, ';\s*$', '');

  -- NOTE: a trailing LIMIT is deliberately PRESERVED. The previous version
  -- stripped it to avoid a double-LIMIT syntax error, which silently broke
  -- every "top N" question. Wrapping the query in a CTE below makes an inner
  -- LIMIT legal, so stripping is no longer necessary.

  IF NOT (lower(clean_query) ~ '^(select|with)') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed.' USING ERRCODE = '42501';
  END IF;

  IF lower(clean_query) ~ '\b(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b' THEN
    RAISE EXCEPTION 'Query contains prohibited keywords.' USING ERRCODE = '42501';
  END IF;

  -- q is MATERIALIZED so the user's query runs exactly once even though we read
  -- it three times (data / row_count / totals).
  --   data      : capped at 500 rows for payload size
  --   row_count : TRUE count over the full set (was capped at 501)
  --   totals    : per-column sums over the FULL set, before the cap. This is the
  --               number the AI is forbidden to invent. Any JSON-number column is
  --               summed; jsonb_typeof tells us which those are without needing
  --               to know the query's shape in advance.
  EXECUTE format('
    WITH q AS MATERIALIZED (%s),
    j AS (SELECT to_jsonb(q) AS r FROM q)
    SELECT jsonb_build_object(
      ''data'', COALESCE((SELECT jsonb_agg(d.r) FROM (SELECT r FROM j LIMIT 500) d), ''[]''::jsonb),
      ''row_count'', (SELECT count(*) FROM j),
      ''totals'', COALESCE((
        SELECT jsonb_object_agg(t.key, t.total)
        FROM (
          SELECT kv.key, sum((kv.value #>> ''{}'')::numeric) AS total
          FROM j, jsonb_each(j.r) AS kv
          WHERE jsonb_typeof(kv.value) = ''number''
          GROUP BY kv.key
        ) t
      ), ''{}''::jsonb)
    )', clean_query) INTO result;

  result := result || jsonb_build_object(
    'truncated', (result->>'row_count')::int > 500,
    'executed_at', now()
  );

  RETURN result;

EXCEPTION
  WHEN query_canceled THEN
    RAISE EXCEPTION 'Query timed out after 10 seconds.' USING ERRCODE = '57014';
  WHEN OTHERS THEN
    -- Bare RAISE re-raises the ORIGINAL error with its SQLSTATE intact.
    -- The previous version re-raised a generic 'Query execution failed: %'
    -- string, which destroyed the error code and forced the edge function to
    -- classify errors by substring matching — the reason a 42803 GROUP BY error
    -- was the ONE class that never got a retry. See CLAUDE.md Gotcha #71.
    RAISE;
END;
$function$;
```

- [ ] **Step 3: Create the local placeholder migration file**

Get the exact recorded name:

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;
```

Create `supabase/migrations/{version}_{name}.sql` containing **only**:

```sql
-- Applied via Supabase dashboard since the actual SQL is already in your database.
```

Then confirm the counts match (Critical Migration Rules):

```bash
ls supabase/migrations/*.sql | wc -l
```
must equal `SELECT COUNT(*) FROM supabase_migrations.schema_migrations;`

And confirm no BOM was introduced:
```bash
grep -rl $'\xEF\xBB\xBF' supabase/migrations/ | wc -l   # must be 0
```

- [ ] **Step 4: Verify SQLSTATE now survives**

Re-run Step 1's query via MCP.
Expected: ERROR with SQLSTATE **`42803`** and the message `column "e.expense_date" must appear in the GROUP BY clause or be used in an aggregate function`. The code is now available to the caller.

- [ ] **Step 5: Verify totals are correct and complete**

```sql
SELECT public.execute_ai_query(
  'SELECT e.amount, e.category, p.payee_name, e.description, e.expense_date
   FROM expenses e JOIN payees p ON p.id = e.payee_id
   WHERE p.payee_name ILIKE ''%chris radcliff%''
   ORDER BY e.expense_date DESC'
) -> 'totals';
```

Expected: `{"amount": 8531.87}` — the number the AI failed to state. Confirm `-> 'row_count'` is `13` and `-> 'truncated'` is `false`.

- [ ] **Step 6: Verify the LIMIT-stripping regression is fixed**

```sql
SELECT public.execute_ai_query(
  'SELECT project_number, actual_margin FROM reporting.project_financials
   ORDER BY actual_margin DESC NULLS LAST LIMIT 5'
) -> 'row_count';
```

Expected: `5`. Before this change the trailing `LIMIT 5` was regexed away and this returned up to 500.

- [ ] **Step 7: Verify row_count is no longer capped at 501**

```sql
SELECT public.execute_ai_query('SELECT id, amount FROM expenses') -> 'row_count',
       public.execute_ai_query('SELECT id, amount FROM expenses') -> 'truncated',
       jsonb_array_length(public.execute_ai_query('SELECT id, amount FROM expenses') -> 'data');
```

Expected: `row_count` = the true count (>1,280), `truncated` = `true`, `data` length = `500`. Previously `row_count` reported `501`.

- [ ] **Step 8: Verify the security guards still hold**

```sql
SELECT public.execute_ai_query('DELETE FROM expenses');           -- expect: Only SELECT queries are allowed. (42501)
SELECT public.execute_ai_query('SELECT 1; DROP TABLE expenses');  -- expect: Query contains prohibited keywords. (42501)
```

- [ ] **Step 9: Verify a `WITH` query still works (nested CTE)**

```sql
SELECT public.execute_ai_query(
  'WITH x AS (SELECT amount FROM expenses LIMIT 3) SELECT SUM(amount) AS total FROM x'
);
```
Expected: one row, no error. Confirms `WITH q AS MATERIALIZED (WITH x AS ...)` nesting is legal.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/
git commit -m "fix(ai-reports): execute_ai_query returns full-set totals, preserves LIMIT and SQLSTATE"
```

---

## Task 4: Classify SQL errors on Postgres error codes

**Files:**
- Create: `supabase/functions/ai-report-assistant/queryErrors.ts`
- Test: `src/utils/__tests__/queryErrors.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/queryErrors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyQueryError } from '../../../supabase/functions/ai-report-assistant/queryErrors';

describe('classifyQueryError', () => {
  it('REGRESSION: a GROUP BY error is retryable', () => {
    // Production failure, 2026-07-16: "what is the sum total of all the payments"
    // produced SQLSTATE 42803 and was the ONE error class routed to canRetry:false,
    // so the raw Postgres text was shown to the user.
    const result = classifyQueryError({
      code: '42803',
      message: 'column "e.expense_date" must appear in the GROUP BY clause or be used in an aggregate function',
    });
    expect(result.canRetry).toBe(true);
    expect(result.category).toBe('malformed_sql');
  });

  it('classifies an undefined column as retryable', () => {
    const result = classifyQueryError({ code: '42703', message: 'column "total_cost" does not exist' });
    expect(result.canRetry).toBe(true);
    expect(result.category).toBe('malformed_sql');
  });

  it('classifies an undefined table as retryable', () => {
    const result = classifyQueryError({ code: '42P01', message: 'relation "foo" does not exist' });
    expect(result.canRetry).toBe(true);
  });

  it('classifies a syntax error as retryable', () => {
    const result = classifyQueryError({ code: '42601', message: 'syntax error at or near "FROM"' });
    expect(result.canRetry).toBe(true);
  });

  it('classifies a data-exception (bad cast) as retryable', () => {
    const result = classifyQueryError({ code: '22P02', message: 'invalid input syntax for type numeric' });
    expect(result.canRetry).toBe(true);
    expect(result.category).toBe('bad_data_reference');
  });

  it('does NOT retry our own security guard', () => {
    const result = classifyQueryError({ code: '42501', message: 'Only SELECT queries are allowed.' });
    expect(result.canRetry).toBe(false);
    expect(result.category).toBe('blocked');
  });

  it('does NOT retry a timeout (a rewrite will just time out again)', () => {
    const result = classifyQueryError({ code: '57014', message: 'Query timed out after 10 seconds.' });
    expect(result.canRetry).toBe(false);
    expect(result.category).toBe('timeout');
  });

  it('falls back to substring matching when no code is present', () => {
    // Defensive: older deployments, or a transport that drops `code`.
    const result = classifyQueryError({ message: 'column "x" does not exist' });
    expect(result.canRetry).toBe(true);
  });

  it('falls back to substring matching for GROUP BY with no code', () => {
    const result = classifyQueryError({
      message: 'column "e.expense_date" must appear in the GROUP BY clause',
    });
    expect(result.canRetry).toBe(true);
  });

  it('does not retry an unknown error', () => {
    const result = classifyQueryError({ code: '08006', message: 'connection failure' });
    expect(result.canRetry).toBe(false);
    expect(result.category).toBe('other');
  });

  it('does not throw on a null/empty error', () => {
    expect(() => classifyQueryError(null)).not.toThrow();
    expect(classifyQueryError(null).canRetry).toBe(false);
    expect(classifyQueryError({}).canRetry).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/__tests__/queryErrors.test.ts`
Expected: FAIL — cannot resolve `queryErrors`.

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/ai-report-assistant/queryErrors.ts`. **Keep this file free of Deno globals and URL imports** — it is imported by both Deno (edge function) and Vitest (tests).

```ts
/**
 * SQL error classification for the Reports AI.
 *
 * This classifies on Postgres SQLSTATE, not on error text. The previous
 * substring-based classifier required an error to contain both "column" and
 * "does not exist" to be retryable, which meant a 42803 grouping error
 * ("column X must appear in the GROUP BY clause") fell through to canRetry:false
 * — the single most common way an LLM writes bad SQL was the only class we
 * never repaired. See CLAUDE.md Gotcha #71.
 *
 * The insight: SQLSTATE class 42 IS "the statement is malformed", which is
 * exactly the set a repair attempt can fix. Classifying on the class rather than
 * enumerating codes means new failure modes are retryable by default.
 *
 * Requires execute_ai_query to re-raise with a bare RAISE so the code survives.
 */

export type QueryErrorCategory =
  | 'malformed_sql'       // SQLSTATE class 42 — syntax / missing object / grouping
  | 'bad_data_reference'  // SQLSTATE class 22 — bad cast, bad literal
  | 'timeout'
  | 'blocked'             // our own SECURITY guard rejected it
  | 'other';

export interface QueryErrorInfo {
  category: QueryErrorCategory;
  code: string | null;
  message: string;
  suggestion: string;
  canRetry: boolean;
}

export function classifyQueryError(error: any): QueryErrorInfo {
  const code: string | null = typeof error?.code === 'string' ? error.code : null;
  const message: string = typeof error?.message === 'string' ? error.message : 'Unknown database error';

  // Our own guards. Never retry — a rewrite cannot make DELETE allowed.
  if (code === '42501') {
    return {
      category: 'blocked', code, message,
      suggestion: 'Only read-only questions are supported.',
      canRetry: false,
    };
  }

  // Timeout. A repair does not make it faster; the retry would just time out again.
  if (code === '57014' || /timed out|timeout|canceling statement/i.test(message)) {
    return {
      category: 'timeout', code, message,
      suggestion: 'Try narrowing the question to a shorter date range.',
      canRetry: false,
    };
  }

  // Class 42 — syntax error or access rule violation. Everything here is a
  // malformed statement: 42601 syntax, 42703 undefined_column, 42P01
  // undefined_table, 42803 grouping_error, 42P10 invalid_column_reference,
  // 42883 undefined_function, 42804 datatype_mismatch, ...
  if (code && code.startsWith('42')) {
    return {
      category: 'malformed_sql', code, message,
      suggestion: 'The query needs to be corrected.',
      canRetry: true,
    };
  }

  // Class 22 — data exception (bad cast, invalid literal).
  if (code && code.startsWith('22')) {
    return {
      category: 'bad_data_reference', code, message,
      suggestion: 'A value in the query has the wrong type.',
      canRetry: true,
    };
  }

  // Fallback for deployments where the code did not survive transport.
  if (!code) {
    const lower = message.toLowerCase();
    const looksMalformed =
      (lower.includes('does not exist') && (lower.includes('column') || lower.includes('relation'))) ||
      lower.includes('must appear in the group by clause') ||
      lower.includes('syntax error') ||
      lower.includes('invalid input syntax');

    if (looksMalformed) {
      return {
        category: 'malformed_sql', code: null, message,
        suggestion: 'The query needs to be corrected.',
        canRetry: true,
      };
    }
  }

  return {
    category: 'other', code, message,
    suggestion: 'Please rephrase your question.',
    canRetry: false,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/__tests__/queryErrors.test.ts`
Expected: PASS — 11 tests passing.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/ai-report-assistant/queryErrors.ts src/utils/__tests__/queryErrors.test.ts
git commit -m "fix(ai-reports): classify SQL errors on SQLSTATE so GROUP BY failures retry"
```

---

## Task 5: Repair the failed query instead of "simplifying" it

**Files:**
- Modify: `supabase/functions/ai-report-assistant/index.ts:714-769` (delete `parseQueryError`), `:771-830` (rewrite the retry prompt), `:1277-1292` (call site)

Making GROUP BY retryable is only safe once the retry stops rewriting the question. The current prompt tells the model to use `reporting.project_financials` and that it "might answer a related but simpler question" — on an expenses-by-payee query that trades a visible error for an invisible wrong answer.

- [ ] **Step 1: Add the import**

At the top of `index.ts`, alongside the existing `import { KPI_CONTEXT } from "./kpi-context.generated.ts";` (line 28), add:

```ts
import { classifyQueryError } from "./queryErrors.ts";
```

- [ ] **Step 2: Delete the substring classifier**

Delete the entire `parseQueryError` function (lines 714-769). It is fully replaced by `classifyQueryError`.

- [ ] **Step 3: Rewrite the retry prompt**

In `retryWithSimplerQuery`, replace the `retryPrompt` template (lines 780-796) with:

```ts
  const errorInfo = classifyQueryError(error);

  const retryPrompt = `Your SQL failed. Repair it.

Postgres error${errorInfo.code ? ` (SQLSTATE ${errorInfo.code})` : ''}: ${errorInfo.message}

Failed SQL:
${originalQuery}

User's question: "${userQuery}"

Rules:
1. Fix ONLY what the error complains about. Keep the query answering the SAME question.
2. Do NOT switch tables to "simplify". If the question is about expenses, payees or time entries, stay on those tables.
3. Do NOT drop filters the user asked for (names, dates, projects, categories).
4. Do NOT answer a different or narrower question than the one asked.
5. If the error says a column "must appear in the GROUP BY clause", the usual cause is a leftover
   ORDER BY or SELECT column from a previous non-aggregate query. Either add it to GROUP BY or
   remove it — pick whichever preserves the user's intent. For a pure total, drop the stray
   ORDER BY and select only the aggregate.

If the question genuinely cannot be answered from this schema, respond with:
{ "cannotRetry": true, "reason": "explanation for user" }

Otherwise respond with:
{ "repairedQuery": "SELECT ...", "explanation": "what changed and why" }
`;
```

- [ ] **Step 4: Update the response parsing in the same function**

Replace the `parsed.simplifiedQuery` handling (around line 835) so it reads the new key, accepting the old one defensively:

```ts
      const repaired = parsed.repairedQuery || parsed.simplifiedQuery;

      if (repaired) {
        // Execute the repaired query
        const { data: retryResult, error: retryError } = await supabase.rpc('execute_ai_query', {
          p_query: repaired
        });
```

> Leave the rest of that block (the `retryError` / success handling) exactly as it is.

- [ ] **Step 5: Force JSON output from the retry call**

In the same `fetch` body (around line 807), add `response_format` so the `JSON.parse(content)` below cannot throw on a prose reply:

```ts
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a SQL expert. Repair failed queries while preserving the user's original question. Respond with JSON only." },
          ...conversationHistory.slice(-4).map((msg: any) => ({
            role: msg.role,
            content: msg.content
          })),
          { role: "user", content: retryPrompt }
        ],
        response_format: { type: "json_object" },
      }),
```

- [ ] **Step 6: Update the call site**

At line 1277, replace:

```ts
      const errorInfo = await parseQueryError(queryError, sqlQuery);
```

with:

```ts
      const errorInfo = classifyQueryError(queryError);
      console.log('[AI Debug] Query failed:', errorInfo.code, errorInfo.category, 'canRetry:', errorInfo.canRetry);
```

> `classifyQueryError` is synchronous — make sure no `await` remains. The `errorInfo.canRetry` / `errorInfo.category` / `errorInfo.message` / `errorInfo.suggestion` reads further down all keep working, since `QueryErrorInfo` preserves those field names.

- [ ] **Step 7: Rename the function for honesty**

Rename `retryWithSimplerQuery` → `repairFailedQuery` at its declaration (line 771) and at its single call site (line 1285). It no longer simplifies.

- [ ] **Step 8: Verify**

Run: `npm run type-check`
Expected: PASS. Then confirm nothing references the deleted function:

```bash
grep -rn "parseQueryError\|retryWithSimplerQuery\|simplifiedQuery" supabase/functions/ai-report-assistant/index.ts
```
Expected: only the defensive `parsed.simplifiedQuery` fallback from Step 4.

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/ai-report-assistant/index.ts
git commit -m "fix(ai-reports): repair failed SQL against the original question instead of simplifying it"
```

---

## Task 6: Give the answer model the totals and forbid it from doing arithmetic

**Files:**
- Modify: `supabase/functions/ai-report-assistant/index.ts:1431` (read totals), `:1446-1454` (answer prompt), `:1318-1325` (retry answer prompt), `:1560-1575` (response payload), `generateAnswerSystemPrompt` (~line 590)

This is the fix for the fabricated $6,161.87.

- [ ] **Step 1: Read the totals off the RPC result**

At line 1431, where `rowCount` is read, add:

```ts
    const rowCount = queryResult?.row_count || 0;
    const serverTotals: Record<string, number> = queryResult?.totals || {};
    const truncated: boolean = queryResult?.truncated === true;
```

> If `truncated` is already declared nearby from the existing payload, reuse it rather than redeclaring.

- [ ] **Step 2: Add a helper that renders the totals as authoritative facts**

Add near the other helpers (just above the `serve(` handler):

```ts
/**
 * Renders server-computed totals as an authoritative block for the answer model.
 *
 * These come from execute_ai_query and are computed in Postgres over the FULL
 * result set — before the 500-row data cap. The answer model is shown at most 20
 * rows, so any total it computes itself is wrong the moment a result exceeds 20
 * rows, and (as of 2026-07-16) was observed to be wrong at 13 rows too: it stated
 * $6,161.87 for a set totalling $8,531.87. See CLAUDE.md Gotcha #71.
 */
function formatAuthoritativeTotals(totals: Record<string, number>): string {
  const keys = Object.keys(totals);
  if (keys.length === 0) return '';

  const lines = keys.map(key => {
    const isCurrency = /amount|cost|total|price|revenue|margin|balance|paid/i.test(key);
    const value = totals[key];
    const rendered = isCurrency
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
      : String(Math.round(value * 100) / 100);
    return `- ${key}: ${rendered}`;
  });

  return `\n\nAUTHORITATIVE TOTALS (computed by the database over the COMPLETE result set — use these EXACT figures, never your own arithmetic):\n${lines.join('\n')}`;
}
```

- [ ] **Step 3: Rewrite the answer prompt**

Replace the `answerPrompt` assignment at lines 1446-1454 with:

```ts
    // Interpret results — consolidated answer + insights + follow-ups in ONE AI call
    const shownRows = reportData.slice(0, 20);

    let answerPrompt = 'User asked: "' + query + '"\n\n' +
      'SQL executed: ' + sqlQuery + '\n' +
      'Results: ' + rowCount + ' rows\n\n' +
      (reportData.length > 0
        ? `Sample rows (${shownRows.length} of ${rowCount} — this is a SAMPLE, not the full set; never add these up):\n` +
          JSON.stringify(shownRows, null, 2)
        : 'No results found.'
      ) +
      formatAuthoritativeTotals(serverTotals) +
      (truncated ? '\n\nNOTE: the row sample was capped at 500 rows, but the totals above still cover every row.' : '') +
      '\n\nGive a helpful, conversational response. For any sum, total or count, quote the AUTHORITATIVE TOTALS and the row count verbatim. Do not compute figures yourself.';
```

- [ ] **Step 4: Apply the same treatment to the retry answer prompt**

At lines 1318-1325 the retry path builds its own prompt with `Data (first 20)`. Replace that prompt construction with the same shape, using the retry's own result object:

```ts
          const retryTotals: Record<string, number> = retryResult.data?.totals || {};
          const retryShown = retryData.slice(0, 20);

          const retryAnswerPrompt = 'User asked: "' + query + '"\n\n' +
            'Results: ' + retryRowCount + ' rows\n\n' +
            (retryData.length > 0
              ? `Sample rows (${retryShown.length} of ${retryRowCount} — a SAMPLE, never add these up):\n` +
                JSON.stringify(retryShown, null, 2)
              : 'No results found.'
            ) +
            formatAuthoritativeTotals(retryTotals) +
            '\n\nGive a helpful, conversational response. For any sum, total or count, quote the AUTHORITATIVE TOTALS and the row count verbatim. Do not compute figures yourself.';
```

> Wire `retryAnswerPrompt` into the existing retry answer `fetch` in place of whatever variable it currently sends.

- [ ] **Step 5: Harden the answer system prompt**

In `generateAnswerSystemPrompt()` (~line 590), add these rules to the returned template, immediately after the existing `- Keep it conversational - no jargon` line:

```
- NEVER perform arithmetic. Do not add, subtract, average or otherwise compute numbers.
- Every sum or total you state MUST be copied verbatim from the AUTHORITATIVE TOTALS block. If a
  figure the user asked for is not in that block and not in a single row, say you don't have it
  rather than working it out.
- The row sample you are shown may be a subset. Never describe it as the complete set, and never
  characterise the whole result from the sample alone.
- State the row count exactly as given.
```

- [ ] **Step 6: Return totals to the client**

In the response payload (~line 1560), add `totals` next to the existing `truncated`:

```ts
      data: reportData,
      fields,
      rowCount,
      truncated,
      totals: serverTotals,
      insights,
```

- [ ] **Step 7: Verify**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/ai-report-assistant/index.ts
git commit -m "fix(ai-reports): inject DB-computed totals as ground truth; ban model arithmetic"
```

---

## Task 7: Resolve the name-matching contradiction in the SQL prompt

**Files:**
- Modify: `supabase/functions/ai-report-assistant/index.ts:372`, `:512-519`

The prompt already tells the model to match on the shortest distinctive fragment and even names "Christopher L Radcliff" as the example (line 514). It is deployed. It was ignored — partly because line 372 says the opposite.

- [ ] **Step 1: Remove the contradicting instruction**

At line 372, replace:

```
- Always try the simple match first (ILIKE '%name%'). Don't over-engineer name queries.
```

with:

```
- Match names on the shortest distinctive fragment (see NAME MATCHING below). Never ILIKE the full
  "First Last" string — stored names often carry a middle initial, so '%chris radcliff%' silently
  misses "Christopher L Radcliff".
```

- [ ] **Step 2: Add the dropped-conjunct rule to the NAME MATCHING section**

At line 519, after the existing `- If unsure of spelling, match the last name alone...` bullet, append:

```
- If the user names MORE THAN ONE person or spelling ("X or Y"), your WHERE clause MUST cover every
  one of them. Never answer for a subset of what was asked. Prefer one fragment that covers them all
  (e.g. "chris radcliff or christopher l radcliff" -> `p.payee_name ILIKE '%radcliff%' AND
  p.payee_name ILIKE '%chris%'`, which matches both). If no single fragment covers them, OR the
  conditions together explicitly.
- Verify before you answer: every person, project, date range and category the user named must appear
  in the WHERE clause. A query that quietly covers less than the question is a wrong answer, not a
  simpler one.
```

- [ ] **Step 3: Verify the guidance is self-consistent**

```bash
grep -n "over-engineer\|shortest distinctive\|full \"First Last\"" supabase/functions/ai-report-assistant/index.ts
```
Expected: no surviving instruction telling the model to prefer a naive full-name match.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ai-report-assistant/index.ts
git commit -m "fix(ai-reports): remove contradicting name-match guidance; require covering every named person"
```

---

## Task 8: Use a stronger model for SQL generation only

**Files:**
- Modify: `supabase/functions/ai-report-assistant/index.ts:1155` (SQL generation), `:290` (fixInvalidSql)

Narration keeps `gpt-4o-mini` — after Task 6 it does no math, so it is low-risk. SQL generation gets `gpt-4o`, because that is where a mistake becomes a wrong financial answer and where prompt-only fixes have already demonstrably failed.

- [ ] **Step 1: Add a model constant**

Near the top of `index.ts`, after the imports (~line 30):

```ts
// SQL generation gets the stronger model: a mistake here becomes a wrong financial
// answer, and prompt-only guidance has already failed once in production (the
// deployed v79 name-matching rules were ignored, dropping half a user's query).
// Narration/insights stay on gpt-4o-mini — after the totals fix they do no arithmetic.
const SQL_MODEL = "gpt-4o";
const NARRATION_MODEL = "gpt-4o-mini";
```

- [ ] **Step 2: Use it for SQL generation**

At line 1155, replace `model: "gpt-4o-mini",` with `model: SQL_MODEL,`.

- [ ] **Step 3: Use it for the column-fix call**

At line 290 (inside `fixInvalidSql`), replace `model: "gpt-4o-mini",` with `model: SQL_MODEL,` — this call also emits SQL.

- [ ] **Step 4: Leave narration calls alone, but name them**

At the answer-generation call (~line 1513) and the retry-answer call, replace `model: "gpt-4o-mini",` with `model: NARRATION_MODEL,`. Behaviour is unchanged; the constant documents the split.

> Leave `repairFailedQuery`'s model as `NARRATION_MODEL` for now — it is a constrained repair with the exact error text supplied, and it only runs on failures. Revisit if repair success rate is poor after Task 11.

- [ ] **Step 5: Verify no stray literals remain**

```bash
grep -n '"gpt-4o-mini"\|"gpt-4o"' supabase/functions/ai-report-assistant/index.ts
```
Expected: only the two constant declarations.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/ai-report-assistant/index.ts
git commit -m "feat(ai-reports): use gpt-4o for SQL generation, keep gpt-4o-mini for narration"
```

---

## Task 9: Make field-type inference NULL-safe

**Files:**
- Modify: `supabase/functions/ai-report-assistant/index.ts:1546-1560`, `:1354-1371`

Both inference blocks sample `data[0][key]` only. A NULL in the first row types the column as `text`, so it gets no total and no currency formatting — the totals row would silently drop a money column. This is the same "one sample decides everything" fragility that produced Gotcha #47.

- [ ] **Step 1: Add a shared inference helper**

Add near the other helpers:

```ts
/**
 * Infer report field types from data. Scans every row for the first non-null
 * sample per column rather than trusting row 0 — a NULL in the first row would
 * otherwise type a currency column as text, silently dropping it from totals
 * and formatting. (Same class as Gotcha #47: don't let one sample decide.)
 */
function inferReportFields(data: any[]): Array<{ key: string; label: string; type: string }> {
  if (!data.length) return [];

  return Object.keys(data[0]).map(key => {
    const sample = data.find(row => row[key] !== null && row[key] !== undefined)?.[key];

    let type = 'text';
    if (typeof sample === 'number') {
      type = key.includes('percent') || key.includes('margin') ? 'percent'
        : key.includes('hours') || key.includes('count') || key.includes('entries') ? 'number'
        : key.includes('amount') || key.includes('cost') || key.includes('total') ? 'currency'
        : 'number';
    } else if (typeof sample === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sample)) {
      type = 'date';
    }

    return {
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type
    };
  });
}
```

- [ ] **Step 2: Replace both inference sites**

At line 1546, replace the whole `const fields = reportData.length > 0 ? Object.keys(...)... : [];` expression with:

```ts
    const fields = inferReportFields(reportData);
```

At line 1354, replace the `retryFields` expression with:

```ts
          const retryFields = inferReportFields(retryData);
```

Note this also fixes a real inconsistency: the retry block classified `hours`/`count`/`entries` as `number`, and the main block did not — so the same column could be typed differently depending on whether a retry fired.

- [ ] **Step 3: Verify**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ai-report-assistant/index.ts
git commit -m "fix(ai-reports): infer field types from first non-null sample, unify both call sites"
```

---

## Task 10: Bias Whisper toward this company's vocabulary

**Files:**
- Modify: `supabase/functions/transcribe-audio/index.ts:92-107`

Voice lands in the Reports input for review, so it is not silently corrupting anything — but proper nouns are exactly what it mistranscribes and exactly what queries filter on. A plausible "Radcliffe" passes review, misses the ILIKE, and the model rationalises the empty result.

- [ ] **Step 1: Add the domain prompt constant**

Near the top of `transcribe-audio/index.ts`, after the imports:

```ts
/**
 * Whisper's `prompt` biases decoding toward expected vocabulary. Without it,
 * whisper-1 reliably mangles the proper nouns this app filters on — "Radcliff"
 * becomes "Radcliffe"/"Ratcliff", project numbers lose their hyphen. Those
 * transcripts then feed the Reports AI, where a near-miss name produces zero rows
 * and a confident rationalisation rather than an error. See CLAUDE.md Gotcha #71.
 *
 * Keep this under ~224 tokens — Whisper silently truncates beyond that.
 */
const DOMAIN_PROMPT = [
  'Radcliff Construction Group (RCG) field and office notes.',
  'Names: Chris Radcliff, Christopher L Radcliff, Don Radcliff, Matt Radcliff, Tom Finn.',
  'Project numbers are spoken like 225-078, 225-012, 001-GAS, 002-GA, 005-MEAL.',
  'Terms: payee, subcontractor, change order, estimate, line item, quote, contingency,',
  'retainage, punch list, drywall, framing, casework, RFI, submittal, work order,',
  'time entry, paid hours, gross hours, receipt, invoice, margin.',
].join(' ');
```

- [ ] **Step 2: Send it, pin the language, and zero the temperature**

Replace lines 97-99:

```ts
  formData.append('file', audioBlob, `media.${ext}`);
  formData.append('model', 'whisper-1');
```

with:

```ts
  formData.append('file', audioBlob, `media.${ext}`);
  formData.append('model', 'whisper-1');
  // Bias decoding toward RCG's proper nouns and project-number format.
  formData.append('prompt', DOMAIN_PROMPT);
  // Pin the language: auto-detect misfires on short or noisy clips and can flip
  // whisper into translating, which garbles names beyond recognition.
  formData.append('language', 'en');
  // Greedy decoding — no creative reconstruction of unclear audio.
  formData.append('temperature', '0');
```

- [ ] **Step 3: Deploy and verify**

```bash
npx supabase functions deploy transcribe-audio --project-ref clsjdxwbsjbhjibvlqbz
npx supabase functions list --project-ref clsjdxwbsjbhjibvlqbz | grep transcribe-audio
```
Expected: version increments from 142 to 143.

- [ ] **Step 4: Verify in the browser**

Start the dev server (`npm run dev`, port 5225), open the Reports AI chat, tap the mic and say: *"show all expenses paid to Chris Radcliff"*.
Expected: the input box is populated with "Radcliff" spelled correctly (not "Radcliffe"/"Ratcliff"). Repeat with *"show me project two twenty five dash zero seventy eight"* and confirm the number survives recognisably.

If a name still comes through wrong, add it to `DOMAIN_PROMPT` and redeploy — that is the intended maintenance path, not a code change.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/transcribe-audio/index.ts
git commit -m "fix(transcribe): bias whisper with RCG vocabulary, pin language, zero temperature"
```

---

## Task 11: Deploy and verify end-to-end against the original transcript

**Files:** none (verification)

- [ ] **Step 1: Full local gate**

```bash
npm run pre-deploy && npx vitest run
```
Expected: lint, type-check and all tests PASS.

- [ ] **Step 2: Deploy the edge function**

The function is ~135KB across `index.ts` + `kpi-context.generated.ts`, which exceeds MCP parameter limits — use the CLI (see CLAUDE.md "Managing Edge Functions"):

```bash
npx supabase functions deploy ai-report-assistant --project-ref clsjdxwbsjbhjibvlqbz
npx supabase functions list --project-ref clsjdxwbsjbhjibvlqbz | grep ai-report-assistant
```
Expected: version increments from **79** to **80**, status ACTIVE.

- [ ] **Step 3: Reproduce the original transcript, turn 1**

Open the Reports AI chat as an admin (Reports is admin/manager only — a field-worker session cannot reach it) and send **verbatim**:

```
show all expenses paid to chris radcliff or christopher l radcliff
```

Assert all four:
1. The prose total reads **$8,531.87** — not $6,161.87, and not any other number.
2. The detail table's footer shows **$8,531.87** under the Amount column instead of a blank row.
3. The SQL covers **both** names (expand "View details" and read the query) and the row count is **75**, not 13.
4. The answer does not claim to have covered only "Chris Radcliff".

> Note on expectations for #3: the 62 "Christopher L Radcliff" rows are time entries with `amount = 0`, so the **dollar** total stays $8,531.87 while the row count rises to 75. That is correct, and it is the point — the money is unchanged but the question is now actually answered.

- [ ] **Step 4: Reproduce the original transcript, turn 2**

In the same conversation, send **verbatim**:

```
what is the sum total of all the payments
```

Assert:
1. No raw Postgres error is shown. The previous behaviour was `Query execution failed: column "e.expense_date" must appear in the GROUP BY clause`.
2. The answer states **$8,531.87**.
3. Check the function logs and confirm the repair path fired:

```bash
npx supabase functions logs ai-report-assistant --project-ref clsjdxwbsjbhjibvlqbz | grep "Query failed"
```
Expected: a line showing `42803 malformed_sql canRetry: true` — the code is now surviving from Postgres, and the class is retryable.

> If turn 2 succeeds on the first attempt with no retry at all, that is also a pass: `gpt-4o` may simply write correct aggregate SQL. Confirm via the absence of a `Query failed` log line, and separately confirm the retry path still works using Step 5.

- [ ] **Step 5: Force the retry path deliberately**

To prove the repair path independently of model luck, call the RPC directly with the known-bad SQL via MCP:

```sql
SELECT public.execute_ai_query(
  'SELECT SUM(e.amount) FROM expenses e JOIN payees p ON p.id = e.payee_id
   WHERE p.payee_name ILIKE ''%chris radcliff%'' ORDER BY e.expense_date DESC'
);
```
Expected: SQLSTATE `42803` surfaces. This is what `classifyQueryError` now receives, and Task 4's tests prove it routes to `canRetry: true`.

- [ ] **Step 6: Verify the truncation fix**

Ask the chat:

```
list every expense this year
```

Assert: the stated total matches the database, not the 20-row sample. Cross-check via MCP:

```sql
SELECT COUNT(*), ROUND(SUM(amount)::numeric, 2)
FROM expenses WHERE expense_date >= DATE_TRUNC('year', CURRENT_DATE);
```
Expected: the AI's stated total equals this sum exactly. Before this work, the AI would have summed 20 rows and stated that as the answer.

- [ ] **Step 7: Verify the top-N fix**

Ask the chat:

```
top 5 projects by actual margin
```
Expected: 5 rows, not 500.

- [ ] **Step 8: Regression-check a normal report**

Open any non-AI report at `/reports` that renders through `ReportViewer` (it receives no `totals` prop) and confirm the footer still shows correct client-computed totals. This proves the fallback path in Task 2 works.

- [ ] **Step 9: Publish the frontend**

The `ReportViewer` and `AIReportChat` changes are frontend and do **not** auto-deploy — Lovable requires a manual Publish (CLAUDE.md Git & Deployment). Open Lovable, click Publish, then confirm:

```bash
curl -s https://rcgwork.com/version.json
```
Expected: `buildTime` is **after** the merge commit. Until this shows a newer build, production still renders the blank-total footer even though the edge function is fixed.

---

## Task 12: Update the documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Reconcile the version pins**

In the "Critical: AI Report Assistant Version" table, change the pinned version from `78` to **`80`** and the AI Model from `gpt-4o-mini` to `gpt-4o (SQL) / gpt-4o-mini (narration)`. The doc said 78 while production ran 79 — that drift is what let a stale mental model of the deployed prompt persist.

- [ ] **Step 2: Add Gotcha #71**

Append to "Known Quirks & Gotchas":

```markdown
71. **The Reports AI stated a fabricated dollar total, and the four mechanisms that should have caught it were each independently broken (Jul 16, 2026)** — User asked "show all expenses paid to chris radcliff or christopher l radcliff". The AI answered **$6,161.87**; the true total of the rows it displayed was **$8,531.87** (13 rows, all `bill`/`approved`). No filter combination reproduces the stated figure — it was arithmetic hallucinated by `gpt-4o-mini`. Five compounding causes, all now fixed:

    1. **Nothing computed the total.** The answer prompt handed the model a JSON row dump plus "Use specific numbers from the data" and let it add up currency in prose. No aggregate existed anywhere in the pipeline. This made the narration layer a third, unaudited financial calculation surface in direct violation of Architectural Rule 1. **Fix:** `execute_ai_query` now returns `totals` computed in Postgres over the FULL result set (before the 500-row cap); the edge function injects them as an AUTHORITATIVE TOTALS block and the answer system prompt forbids arithmetic outright.
    2. **The prompt showed 20 rows but stated the true row count.** `reportData.slice(0, 20)` + `Results: N rows` + "use specific numbers" guarantees a wrong total for any result over 20 rows. **Fix:** the sample is now explicitly labelled a sample ("never add these up") and totals come from the DB.
    3. **The UI's own correct total was suppressed by a label collision.** `ReportViewer` computed `$8,531.87` correctly and then discarded it: `{index === 0 ? 'Total' : formattedTotals[field.key]}` overwrote the value with the literal string `'Total'` because the currency column was index 0 — which is the normal shape of an expenses-by-payee result. Every other column was text, so the whole footer rendered blank. **Fix:** logic extracted to [reportTotals.ts](src/utils/reportTotals.ts); the label now lands only in a cell that has no total of its own. **Do not reintroduce an index-based label.**
    4. **Half the question was silently dropped.** The generated SQL was a single `ILIKE '%chris radcliff%'`, which cannot match "Christopher L Radcliff" (no contiguous substring) — 62 rows never queried. Guidance against exactly this existed at index.ts:514 **and was deployed** (v79); it was ignored, partly because index.ts:372 said the opposite ("Don't over-engineer name queries"). **Fix:** contradiction removed, an explicit "cover every person the user named" rule added, and SQL generation moved to `gpt-4o`. **Prompt-only fixes have now failed once on this class — treat a prompt tweak alone as insufficient evidence of a fix.**
    5. **GROUP BY errors were the ONE class with no retry.** The follow-up "what is the sum total of all the payments" died with `column "e.expense_date" must appear in the GROUP BY clause` shown raw to the user. `parseQueryError` required an error to contain both `column` AND `does not exist` to be retryable; the grouping error contains only the former, so it fell to `canRetry: false`. Aggregate misuse is the most common way an LLM writes bad SQL and it was the only failure never repaired. The root enabler was in Postgres: `execute_ai_query`'s `WHEN OTHERS THEN RAISE EXCEPTION 'Query execution failed: %', SQLERRM` **destroyed the SQLSTATE** (`42803`), forcing the edge function to guess from substrings. **Fix:** a bare `RAISE;` preserves the original error, and [queryErrors.ts](supabase/functions/ai-report-assistant/queryErrors.ts) classifies on SQLSTATE — the whole `42xxx` class is "malformed statement", which is exactly the set a repair can fix, so new failure modes are retryable by default.

    **Two more found in passing, fixed in the same pass:** `execute_ai_query` regexed off any trailing `LIMIT n` (to avoid a double-LIMIT syntax error), silently breaking every "top N" question — the CTE wrapper makes an inner LIMIT legal, so the strip is gone. And the retry prompt told the model to "use only the main table (reporting.project_financials)" and that it "might answer a related but simpler question" — making GROUP BY retryable without fixing that would have traded a loud error for a silent wrong answer. The retry now **repairs** against the original question and is named `repairFailedQuery`.

    **The unifying lesson:** every failure mode in this pipeline was silent, and the only loud one was harmless. Wrong totals read as authoritative; dropped query terms read as complete answers; a 20-row sample was narrated as the whole set; zero rows got a rationalisation instead of an error (Gotcha #68). **Rule for future work: an LLM must never be the thing that computes a number this business acts on. If a figure reaches a user, a deterministic layer produced it.** When adding any new AI surface that reports figures, ask where the number came from — if the answer is "the model added it up", that is a bug regardless of whether the arithmetic happens to be right today.

    **Diagnostic:** if a user reports a suspicious figure, do NOT start with the prompt. Re-run the displayed SQL directly and compare. If the SQL's total disagrees with the prose, it is this class. If the SQL itself covers less than the question asked, it is cause 4.
```

- [ ] **Step 3: Add the voice note to Gotcha #71**

Append:

```markdown
    **Voice (same pass):** `transcribe-audio` (v142) called `whisper-1` with only `file` + `model` — no `prompt` (domain-vocabulary biasing), no `language`, no `temperature`. Voice IS wired into the Reports chat ([AIReportChat.tsx:79](src/components/reports/AIReportChat.tsx:79)), so a mistranscribed "Radcliffe" would miss the ILIKE and land in Gotcha #68's rationalise-the-empty-result path. It did NOT cause the incident above (that query was typed), and severity is bounded because the transcript lands in the input for review rather than auto-sending ([AIReportChat.tsx:160](src/components/reports/AIReportChat.tsx:160)) — the risk is a *plausible* mistranscription passing review. **Fix:** `DOMAIN_PROMPT` (names, project-number format, trade vocabulary), `language: 'en'`, `temperature: 0`. When a new name is mistranscribed, add it to `DOMAIN_PROMPT` and redeploy — that is the maintenance path, not a code change. Keep the prompt under ~224 tokens; Whisper silently truncates beyond that.
```

- [ ] **Step 4: Add the maintenance checklist item**

Under "After Each Major Feature", add:

```markdown
- [ ] If the change lets an AI state a figure, confirm a deterministic layer computed it (Gotcha #71)
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Gotcha #71 — fabricated AI totals, SQLSTATE loss, and the four broken safety nets"
```

---

## Task 13: Open the PR

- [ ] **Step 1: Push and open**

```bash
git push -u origin fix/ai-reporting-accuracy
gh pr create --title "fix(ai-reports): stop the AI inventing financial totals; make SQL failures self-repair" --body "$(cat <<'EOF'
## Summary

The Reports AI stated **\$6,161.87** for a set of expenses totalling **\$8,531.87** — a \$2,370 fabrication, presented as fact. Investigation found the wrong total was only the visible symptom: four separate mechanisms that should have caught it were each independently broken.

- **The model was doing the arithmetic.** No aggregate was computed anywhere; the answer prompt handed `gpt-4o-mini` a JSON row dump and asked it to "use specific numbers". `execute_ai_query` now computes per-column totals in Postgres over the full result set and the answer prompt forbids arithmetic.
- **The UI's correct total was suppressed.** `ReportViewer` computed \$8,531.87 and overwrote it with the literal string `'Total'` because the currency column was index 0. Fixed and unit-tested.
- **Half the question was dropped.** `ILIKE '%chris radcliff%'` cannot match "Christopher L Radcliff"; 62 rows were never queried. The prompt contradicted itself on name matching; SQL generation moves to `gpt-4o`.
- **GROUP BY errors were the only unretryable error class.** `execute_ai_query` destroyed the SQLSTATE, forcing substring-based classification that routed `42803` to `canRetry: false`. Now classified on error code — the whole `42xxx` class is retryable.
- **The retry answered a different question.** It told the model to "simplify" onto `project_financials` and that it "might answer a related but simpler question". Now repairs against the original question.

Also fixed in passing: `execute_ai_query` stripped the model's trailing `LIMIT` (breaking every "top N" question), `row_count` was capped at 501, field-type inference trusted row 0 only, and `whisper-1` was called with no domain biasing.

## Verification

Reproduced the original transcript verbatim: prose now states \$8,531.87, the footer shows \$8,531.87, the SQL covers both names, and the follow-up returns a total instead of raw Postgres. 23 new unit tests. RPC verified against production for totals, LIMIT, row_count, SQLSTATE and the security guards.

Full diagnosis and plan: `docs/AI_REPORTING_ACCURACY_PLAN.md`. Documented as CLAUDE.md Gotcha #71.

## Deploy notes

- `ai-report-assistant` v79 → v80 and `transcribe-audio` v142 → v143 via CLI (too large for MCP).
- Migration applied via MCP; local file is a placeholder per the Critical Migration Rules.
- **Frontend requires a manual Lovable Publish** — until then production still renders the blank footer.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage** — every issue from the diagnosis maps to a task: fabricated totals (3, 6), blank footer (1, 2), dropped conjunct (7, 8), GROUP BY no-retry (3, 4), retry-answers-wrong-question (5), >20 truncation (3, 6), LIMIT stripping (3), row_count 501 cap (3), field inference (9), Whisper (10), docs (12).

**Placeholder scan** — clean. No TBDs, no "similar to Task N", no "add error handling"; every code step carries the actual code.

**Type consistency** — `ColumnTotals` (Task 1) is imported by Task 2 and matches the `Record<string, number>` shape the edge function returns in Task 6 and the RPC produces in Task 3. `QueryErrorInfo` (Task 4) preserves `category` / `message` / `suggestion` / `canRetry`, the exact fields the existing call site reads, so Task 5's swap is drop-in. `classifyQueryError` is synchronous where `parseQueryError` was `async` — Task 5 Step 6 calls this out explicitly.

**Known limitation** — Task 11's browser steps need an admin session; Reports is admin/manager only, so a field-worker login cannot verify them. Steps 5 and 6 provide MCP-based equivalents that prove the same behaviour without the UI.
