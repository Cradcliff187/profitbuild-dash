# Project Category System Implementation Plan

## Overview

This implementation adds a `category` column to the `projects` table to replace hardcoded project number filtering throughout the application. This makes it easy to add new overhead projects (like `002-GA` for General Admin) without any code changes.

## Categories

| Category | Description | Examples | Visibility |
|----------|-------------|----------|------------|
| `construction` | Real job projects | 225-001, 225-042 | Everywhere |
| `system` | Internal system projects | SYS-000, 000-UNASSIGNED | Completely hidden |
| `overhead` | Overhead cost buckets | 001-GAS, 002-GA | Expenses & receipts only |

## Entity Visibility Matrix

| Entity | Construction | Overhead | System |
|--------|--------------|----------|--------|
| Dashboard stats | ✅ | ❌ | ❌ |
| Projects page | ✅ | ❌ | ❌ |
| Time tracker | ✅ | ❌ | ❌ |
| Expense entry | ✅ | ✅ | ❌ |
| Receipt upload | ✅ | ✅ | ❌ (except unassigned option) |
| Financial reports | ✅ | Optional | ❌ |

## Implementation Phases

### Phase 1: Database Migration
- Add `project_category` enum type
- Add `category` column to projects table
- Update existing special projects
- Update reporting views

### Phase 2: TypeScript Types
- Add `ProjectCategory` type
- Add category-based helper functions
- Update `Project` interface
- Keep backward compatibility with existing helpers

### Phase 3: Component Updates (18 locations)
See `02-COMPONENT-UPDATES.md` for complete list

### Phase 4: Add New Overhead Project
- Create 002-GA with `category = 'overhead'`
- No code changes needed - it automatically gets correct behavior

## File Structure

```
docs/project-category/
├── 00-IMPLEMENTATION-PLAN.md      (this file)
├── 01-DATABASE-MIGRATIONS.md       (SQL migrations)
├── 02-COMPONENT-UPDATES.md         (all component changes)
├── 03-TYPESCRIPT-TYPES.md          (type definitions)
├── migrations/
│   ├── 001_add_project_category.sql
│   ├── 002_update_reporting_views.sql
│   └── 003_add_general_admin_project.sql
└── prompts/
    ├── prompt-01-types.md
    ├── prompt-02-dashboard.md
    ├── prompt-03-projects-page.md
    ├── prompt-04-time-tracker.md
    ├── prompt-05-field-selector.md
    ├── prompt-06-receipt-modals.md
    ├── prompt-07-expense-validation.md
    └── prompt-08-expenses-list.md
```

## Execution Order

1. Run database migrations (Phase 1)
2. Update TypeScript types (Phase 2)
3. Update components one at a time (Phase 3)
4. Test each component after update
5. Add new overhead project (Phase 4)

## Rollback Plan

If anything breaks, run:
```sql
ALTER TABLE projects DROP COLUMN IF EXISTS category;
DROP TYPE IF EXISTS project_category;
```

All existing queries continue working since we maintain backward compatibility.

## Success Criteria

- [ ] All existing functionality works identically
- [ ] Dashboard shows only construction projects
- [ ] Projects page shows only construction projects  
- [ ] Time tracker shows only construction projects
- [ ] Expense entry shows construction + overhead projects
- [ ] Receipt upload shows construction + overhead projects
- [ ] Adding 002-GA requires only a database INSERT, no code changes
