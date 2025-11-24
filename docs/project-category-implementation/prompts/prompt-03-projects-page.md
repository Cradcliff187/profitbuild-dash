# Prompt 03: Update Projects Page

## Context
We are implementing a project category system to replace hardcoded project_number filtering. The Projects page should only show construction projects.

## Reference Document
Read `/docs/project-category-implementation/02-COMPONENT-UPDATES.md` for full context.

## Task
Update `src/pages/Projects.tsx` to use category-based project filtering.

## Changes Required

### 1. Update `loadProjects()` function (around line 65)

Find the projects query in the Promise.all:
```typescript
const [projectsRes, estimatesRes, quotesRes, expensesRes, changeOrdersRes] = await Promise.all([
  supabase.from('projects').select('*').neq('project_number', 'SYS-000').neq('project_number', '000-UNASSIGNED').neq('project_number', '001-GAS').order('created_at', { ascending: false }),
  supabase.from('estimates').select('*'),
  // ... rest of queries
]);
```

Replace the projects query with:
```typescript
const [projectsRes, estimatesRes, quotesRes, expensesRes, changeOrdersRes] = await Promise.all([
  supabase.from('projects').select('*').eq('category', 'construction').order('created_at', { ascending: false }),
  supabase.from('estimates').select('*'),
  // ... rest of queries (unchanged)
]);
```

## Notes

- The `.select('*')` will automatically include the `category` field from the database
- All other queries (estimates, quotes, expenses, change orders) remain unchanged
- The filtering, sorting, and display logic in the rest of the component remains unchanged

## Validation

After making changes:
1. No TypeScript errors
2. Projects page loads without errors
3. Only construction projects appear in the list
4. System projects (SYS-000, 000-UNASSIGNED) are not shown
5. Overhead projects (001-GAS) are not shown
6. All CRUD operations still work correctly

## Do Not

- Change the estimates, quotes, expenses, or change orders queries
- Modify the filtering or sorting logic
- Change any UI components
- Add new imports
