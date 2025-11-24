# Master Execution Guide

## Overview

This guide walks through implementing the project category system step by step. Follow the phases in order.

---

## Pre-Flight Checklist

Before starting:

- [ ] Create a Git branch: `git checkout -b feature/project-category-system`
- [ ] Ensure local development environment is running
- [ ] Have Supabase Studio access ready
- [ ] Read through `00-IMPLEMENTATION-PLAN.md` for context

---

## Phase 1: Database Migrations

### Step 1.1: Add Project Category Column

1. Create new migration file in `supabase/migrations/` with current timestamp
2. Copy contents from `migrations/001_add_project_category.sql`
3. Apply migration: `supabase db push` or run via Supabase Studio

**Verify:**
```sql
SELECT project_number, project_name, category 
FROM projects 
WHERE category != 'construction'
ORDER BY category, project_number;
```

Expected results:
- SYS-000 → system
- 000-UNASSIGNED → system  
- 001-GAS → overhead

### Step 1.2: Update Reporting Views

1. Create new migration file with current timestamp
2. Copy contents from `migrations/002_update_reporting_views.sql`
3. Apply migration

**Verify:**
```sql
SELECT COUNT(*) FROM reporting.project_financials;
-- Should equal count of construction projects only
```

### Step 1.3: Add General & Admin Project (Optional - can do later)

1. Create new migration file with current timestamp
2. Copy contents from `migrations/003_add_general_admin_project.sql`
3. Apply migration

**Verify:**
```sql
SELECT * FROM projects WHERE project_number = '002-GA';
-- Should show category = 'overhead'
```

---

## Phase 2: TypeScript Types

### Step 2.1: Update Project Types

1. Open Cursor
2. Open file: `src/types/project.ts`
3. Reference: `prompts/prompt-01-types.md`
4. Apply changes as specified

**Verify:**
- No TypeScript errors in the file
- Run: `npm run type-check` (if available)

---

## Phase 3: Component Updates

Execute each prompt in order. After each one, verify the component works before moving to the next.

### Step 3.1: Dashboard
- File: `src/pages/Dashboard.tsx`
- Prompt: `prompts/prompt-02-dashboard.md`
- Verify: Dashboard loads, stats show construction projects only

### Step 3.2: Projects Page
- File: `src/pages/Projects.tsx`
- Prompt: `prompts/prompt-03-projects-page.md`
- Verify: Projects list shows construction projects only

### Step 3.3: Time Tracker
- File: `src/components/time-tracker/MobileTimeTracker.tsx`
- Prompt: `prompts/prompt-04-time-tracker.md`
- Verify: Timer project dropdown shows construction projects only

### Step 3.4: Field Project Selector
- File: `src/components/FieldProjectSelector.tsx`
- Prompt: `prompts/prompt-05-field-selector.md`
- Verify: Media capture project selector shows construction projects only

### Step 3.5: Receipt Modals
- Files: 
  - `src/components/time-tracker/AddReceiptModal.tsx`
  - `src/components/time-tracker/EditReceiptModal.tsx`
- Prompt: `prompts/prompt-06-receipt-modals.md`
- Verify: Receipt modals show construction AND overhead projects

### Step 3.6: Expense Validation
- File: `src/utils/expenseValidation.ts`
- Prompt: `prompts/prompt-07-expense-validation.md`
- Verify: Validation logic correctly handles all project categories

### Step 3.7: Expenses List
- File: `src/components/ExpensesList.tsx`
- Prompt: `prompts/prompt-08-expenses-list.md`
- Verify: Expense list correctly identifies placeholder projects

---

## Phase 4: Final Testing

### Smoke Tests

- [ ] Dashboard loads without errors
- [ ] Dashboard stats only count construction projects
- [ ] Projects page shows only construction projects
- [ ] Time tracker shows only construction projects
- [ ] Field photo capture shows only construction projects
- [ ] Receipt upload shows construction + overhead projects
- [ ] Receipt upload shows 001-GAS at top of list
- [ ] Expense entry works correctly
- [ ] Expense list shows correct allocation status

### New Project Test

If you added 002-GA:
- [ ] 002-GA appears in expense entry dropdowns
- [ ] 002-GA appears in receipt upload dropdowns
- [ ] 002-GA does NOT appear in time tracker
- [ ] 002-GA does NOT appear in dashboard stats
- [ ] 002-GA does NOT appear in projects list

---

## Rollback Plan

If something breaks:

### Quick Rollback (Component Level)
Revert individual files with Git:
```bash
git checkout -- src/pages/Dashboard.tsx
```

### Full Rollback (Database Level)
```sql
ALTER TABLE projects DROP COLUMN IF EXISTS category;
DROP TYPE IF EXISTS project_category;
```

Then revert all component changes:
```bash
git checkout -- src/
```

---

## Post-Implementation

After successful implementation:

1. Commit all changes:
```bash
git add -A
git commit -m "feat: implement project category system for scalable filtering"
```

2. Create PR for review

3. Update documentation if needed

4. Future overhead projects can be added with just a database INSERT:
```sql
INSERT INTO projects (project_number, project_name, category, ...)
VALUES ('003-VEHICLE', 'Vehicle Expenses', 'overhead', ...);
```

No code changes needed!
