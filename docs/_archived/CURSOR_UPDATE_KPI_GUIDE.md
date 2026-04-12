# AI Agent Instructions: Update KPIGuide.tsx for View KPIs

## Objective
Update the KPI Guide page to display the 21 new view KPIs (weekly_labor_hours, training_status) that were added in view-kpis.ts.

---

## File to Modify
`src/pages/KPIGuide.tsx`

---

## Task 1: Add viewKPIs Import

**Find this import block near the top of the file:**
```typescript
import {
  projectFinancialKPIs,
  estimateKPIs,
  expenseKPIs,
  quoteKPIs,
  revenueKPIs,
  changeOrderKPIs,
  workOrderKPIs,
  deprecatedKPIs,
  KPI_DEFINITIONS_VERSION,
  LAST_UPDATED,
  type KPIMeasure,
} from '@/lib/kpi-definitions';
```

**Replace with:**
```typescript
import {
  projectFinancialKPIs,
  estimateKPIs,
  expenseKPIs,
  quoteKPIs,
  revenueKPIs,
  changeOrderKPIs,
  workOrderKPIs,
  viewKPIs,
  deprecatedKPIs,
  KPI_DEFINITIONS_VERSION,
  LAST_UPDATED,
  type KPIMeasure,
} from '@/lib/kpi-definitions';
```

---

## Task 2: Add Database Icon Import

**Find the lucide-react import line:**
```typescript
import { BookOpen, Download, Building, Calculator, FileText, Receipt, DollarSign, RefreshCw, Clipboard, Archive } from 'lucide-react';
```

**Replace with:**
```typescript
import { BookOpen, Download, Building, Calculator, FileText, Receipt, DollarSign, RefreshCw, Clipboard, Archive, Database } from 'lucide-react';
```

---

## Task 3: Add Views Tab Option

**Find the tabOptions array:**
```typescript
const tabOptions = [
  { value: 'project', label: 'Project', icon: Building },
  { value: 'estimates', label: 'Estimates', icon: Calculator },
  { value: 'quotes', label: 'Quotes', icon: FileText },
  { value: 'expenses', label: 'Expenses', icon: Receipt },
  { value: 'revenue', label: 'Revenue', icon: DollarSign },
  { value: 'change-orders', label: 'Change Orders', icon: RefreshCw },
  { value: 'work-orders', label: 'Work Orders', icon: Clipboard },
  { value: 'reference', label: 'Reference', icon: BookOpen },
  { value: 'deprecated', label: 'Deprecated', icon: Archive },
];
```

**Replace with:**
```typescript
const tabOptions = [
  { value: 'project', label: 'Project', icon: Building },
  { value: 'estimates', label: 'Estimates', icon: Calculator },
  { value: 'quotes', label: 'Quotes', icon: FileText },
  { value: 'expenses', label: 'Expenses', icon: Receipt },
  { value: 'revenue', label: 'Revenue', icon: DollarSign },
  { value: 'change-orders', label: 'Change Orders', icon: RefreshCw },
  { value: 'work-orders', label: 'Work Orders', icon: Clipboard },
  { value: 'views', label: 'Views', icon: Database },
  { value: 'reference', label: 'Reference', icon: BookOpen },
  { value: 'deprecated', label: 'Deprecated', icon: Archive },
];
```

---

## Task 4: Update Total Measures Calculation

**Find this line:**
```typescript
const totalMeasures = projectFinancialKPIs.length + estimateKPIs.length + quoteKPIs.length + expenseKPIs.length + revenueKPIs.length + changeOrderKPIs.length + workOrderKPIs.length + deprecatedKPIs.length;
```

**Replace with:**
```typescript
const totalMeasures = projectFinancialKPIs.length + estimateKPIs.length + quoteKPIs.length + expenseKPIs.length + revenueKPIs.length + changeOrderKPIs.length + workOrderKPIs.length + viewKPIs.length + deprecatedKPIs.length;
```

---

## Task 5: Update dbMeasures Calculation

**Find this line:**
```typescript
const dbMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, revenueKPIs, changeOrderKPIs, workOrderKPIs].flat().filter(k => k.source === 'database' || k.source === 'view').length;
```

**Replace with:**
```typescript
const dbMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, revenueKPIs, changeOrderKPIs, workOrderKPIs, viewKPIs].flat().filter(k => k.source === 'database' || k.source === 'view').length;
```

---

## Task 6: Update frontendMeasures Calculation

**Find this line:**
```typescript
const frontendMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, revenueKPIs, changeOrderKPIs, workOrderKPIs].flat().filter(k => k.source === 'frontend').length;
```

**Replace with:**
```typescript
const frontendMeasures = [projectFinancialKPIs, estimateKPIs, quoteKPIs, expenseKPIs, revenueKPIs, changeOrderKPIs, workOrderKPIs, viewKPIs].flat().filter(k => k.source === 'frontend').length;
```

---

## Task 7: Add Views TabsContent

**Find the TabsContent for work-orders. It will look like this:**
```typescript
<TabsContent value="work-orders" className="mt-0 sm:mt-4">
  <Card>
    <CardHeader className="p-4">
      <CardTitle className="text-base">Work Order Measures ({workOrderKPIs.length})</CardTitle>
      <CardDescription className="text-sm">Work order specific fields and metrics</CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      {renderKPITable(workOrderKPIs)}
    </CardContent>
  </Card>
</TabsContent>
```

**Add this NEW TabsContent immediately AFTER the work-orders TabsContent and BEFORE the reference TabsContent:**

```typescript
<TabsContent value="views" className="mt-0 sm:mt-4">
  <Card>
    <CardHeader className="p-4">
      <CardTitle className="text-base">View Measures ({viewKPIs.length})</CardTitle>
      <CardDescription className="text-sm">Database view columns including weekly labor hours, training status, and aggregated metrics</CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      {renderKPITable(viewKPIs)}
    </CardContent>
  </Card>
</TabsContent>
```

---

## Task 8: Update Changelog (Optional but Recommended)

**Find the KPI_GUIDE_METADATA object near the top of the file:**
```typescript
const KPI_GUIDE_METADATA = {
  lastUpdated: LAST_UPDATED,
  version: KPI_DEFINITIONS_VERSION,
  changelog: [
    { date: '2026-01-23', version: '2.0', changes: 'Migrated to centralized KPI definitions library...' },
```

**Add a new entry at the BEGINNING of the changelog array:**
```typescript
const KPI_GUIDE_METADATA = {
  lastUpdated: LAST_UPDATED,
  version: KPI_DEFINITIONS_VERSION,
  changelog: [
    { date: '2026-01-29', version: '3.0', changes: 'Added View KPIs section (21 measures) for weekly_labor_hours and training_status views. Added 8 new expense KPIs for joined fields (worker_name, employee_number, hourly_rate, approval_status, description, project fields). Updated gross_hours to frontend-calculated.' },
    { date: '2026-01-23', version: '2.0', changes: 'Migrated to centralized KPI definitions library...' },
```

---

## Verification

After making all changes, run:

```bash
npm run typecheck
```

Then manually verify:
1. Navigate to KPI Guide page in the app
2. Confirm "Views" tab appears between "Work Orders" and "Reference"
3. Click Views tab - should show 21 KPIs
4. Verify total count increased (check Summary Cards at top)
5. Search for "weekly" - should find weekly_labor KPIs
6. Search for "training" - should find training_status KPIs

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Imports | Add `viewKPIs` to import |
| Imports | Add `Database` icon from lucide-react |
| tabOptions | Add `{ value: 'views', label: 'Views', icon: Database }` |
| totalMeasures | Add `+ viewKPIs.length` |
| dbMeasures | Add `viewKPIs` to array |
| frontendMeasures | Add `viewKPIs` to array |
| TabsContent | Add new Views tab content |
| Changelog | Add version 3.0 entry |

---

## Expected Result

After this update:
- KPI Guide will show **Views** tab with 21 measures
- Total Measures count will increase by 21
- Database Fields count will increase (most view KPIs have source: 'view')
- Users can search and find weekly_labor and training KPIs
- Changelog will document the addition
