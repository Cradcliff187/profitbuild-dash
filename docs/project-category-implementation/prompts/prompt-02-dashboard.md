# Prompt 02: Update Dashboard

## Context
We are implementing a project category system to replace hardcoded project_number filtering. The Dashboard should only show construction projects in its statistics.

## Reference Document
Read `/docs/project-category-implementation/02-COMPONENT-UPDATES.md` for full context.

## Task
Update `src/pages/Dashboard.tsx` to use category-based project filtering instead of hardcoded project numbers.

## Changes Required

### 1. Update `loadActiveProjectCount()` (around line 95)

Find:
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('id, status')
  .neq('project_number', 'SYS-000')
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', '001-GAS');
```

Replace with:
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('id, status, category')
  .eq('category', 'construction');
```

### 2. Update `loadProjectStatusCounts()` (around line 110)

Find:
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('status')
  .neq('project_number', 'SYS-000')
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', '001-GAS');
```

Replace with:
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('status, category')
  .eq('category', 'construction');
```

### 3. Update `loadFinancialMetrics()` (around line 180)

Find:
```typescript
const { data: activeProjects, error: activeError } = await supabase
  .from('projects')
  .select('contracted_amount, adjusted_est_costs, projected_margin, margin_percentage')
  .in('status', ['approved', 'in_progress'])
  .neq('project_number', 'SYS-000')
  .neq('project_number', '000-UNASSIGNED')
  .neq('project_number', '001-GAS');
```

Replace with:
```typescript
const { data: activeProjects, error: activeError } = await supabase
  .from('projects')
  .select('contracted_amount, adjusted_est_costs, projected_margin, margin_percentage, category')
  .in('status', ['approved', 'in_progress'])
  .eq('category', 'construction');
```

## Validation

After making changes:
1. No TypeScript errors
2. Dashboard loads without errors
3. Project counts match what was shown before (same construction projects)
4. System and overhead projects are excluded from all stats

## Do Not

- Change any other logic in these functions
- Modify the UI components
- Add any new imports (category filtering is handled by Supabase)
