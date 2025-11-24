# Project Category System Implementation

## Quick Start

1. Copy this entire folder to your project's `docs/` directory
2. Follow `EXECUTION-GUIDE.md` step by step
3. Use the prompts in `prompts/` folder with Cursor AI

## What This Does

Adds a `category` column to the `projects` table to replace hardcoded project number filtering. This makes it easy to add new overhead projects without code changes.

### Categories

| Category | Examples | Where Visible |
|----------|----------|---------------|
| `construction` | 225-001, 225-042 | Everywhere (dashboard, projects, time tracker, expenses, receipts) |
| `system` | SYS-000, 000-UNASSIGNED | Nowhere (internal use only) |
| `overhead` | 001-GAS, 002-GA | Expenses and receipts only |

## File Structure

```
project-category-implementation/
├── README.md                    ← You are here
├── EXECUTION-GUIDE.md           ← Step-by-step implementation guide
├── 00-IMPLEMENTATION-PLAN.md    ← Overview and context
├── 01-DATABASE-MIGRATIONS.md    ← SQL migration documentation
├── 02-COMPONENT-UPDATES.md      ← Complete list of code changes
├── 03-TYPESCRIPT-TYPES.md       ← Type definition updates
├── migrations/
│   ├── 001_add_project_category.sql
│   ├── 002_update_reporting_views.sql
│   └── 003_add_general_admin_project.sql
└── prompts/
    ├── prompt-01-types.md           ← TypeScript types
    ├── prompt-02-dashboard.md       ← Dashboard page
    ├── prompt-03-projects-page.md   ← Projects page
    ├── prompt-04-time-tracker.md    ← Mobile time tracker
    ├── prompt-05-field-selector.md  ← Field project selector
    ├── prompt-06-receipt-modals.md  ← Add/Edit receipt modals
    ├── prompt-07-expense-validation.md ← Expense validation utils
    └── prompt-08-expenses-list.md   ← Expenses list component
```

## How to Use with Cursor

For each component update:

1. Open the target file in Cursor
2. Open the corresponding prompt file
3. Copy the prompt content into Cursor's AI chat
4. Review and apply the suggested changes
5. Test the component
6. Move to the next prompt

## Benefits After Implementation

- **Scalable**: Add new overhead projects with just a database INSERT
- **Consistent**: Single source of truth for project visibility
- **Maintainable**: No more hunting for hardcoded project numbers
- **Safe**: Backward compatible with existing code

## Adding Future Overhead Projects

After implementation, adding a new overhead project like `003-VEHICLE` requires only:

```sql
INSERT INTO projects (project_number, project_name, client_name, category, status, project_type)
VALUES ('003-VEHICLE', 'Vehicle Maintenance', 'Overhead', 'overhead', 'in_progress', 'work_order');
```

That's it! No code changes needed. The project will automatically:
- Appear in expense entry dropdowns ✓
- Appear in receipt upload dropdowns ✓
- Be hidden from dashboard stats ✓
- Be hidden from time tracker ✓
- Be excluded from project list ✓
