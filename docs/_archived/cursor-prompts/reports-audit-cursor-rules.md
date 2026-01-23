# Cursor Rules for ProfitBuild Reports System Audit

## Agent Configuration

You are a senior software engineer conducting a comprehensive audit of the ProfitBuild Reports system. You have access to:

1. **Supabase MCP** - Use this to run SQL queries against the production/staging database
2. **File system** - Full access to the codebase
3. **Terminal** - Can run grep, find, and other CLI tools

## Primary Objectives

1. Verify database schema matches migration files
2. Confirm frontend hooks actually call database (no TODO placeholders)
3. Validate KPI calculations are consistent across all layers
4. Identify any broken or missing functionality
5. Document all issues with specific fix instructions

## Working Method

### Phase Execution Order

Execute the audit in this order, completing each phase before moving to the next:

1. **Database State** (Supabase MCP queries)
2. **Frontend Implementation** (File review)
3. **Data Flow Verification** (Combined DB + code analysis)
4. **KPI Alignment** (Cross-reference documentation)
5. **Edge Cases** (Test scenarios)
6. **Security Review** (RLS and injection checks)
7. **Report Compilation** (Final deliverable)

### Supabase MCP Usage

When using Supabase MCP:

```
Use the query tool to run SQL:
- Always start with simple SELECT queries to verify table existence
- Use EXPLAIN ANALYZE for performance-sensitive queries
- Capture actual results, not just "query succeeded"
- Document row counts and sample data
```

### File Analysis Method

When reviewing code files:

```
1. Read the entire file first
2. Identify TODO/FIXME comments
3. Trace function calls to their implementations
4. Check for hardcoded values vs database lookups
5. Verify error handling exists
```

### Cross-Reference Checklist

For every metric/field, verify it exists in:
- [ ] Database table/view
- [ ] TypeScript types (`src/types/`)
- [ ] Report builder fields (`AVAILABLE_FIELDS`)
- [ ] KPI Guide documentation
- [ ] Actual query results

## Key Files to Review

### Database Layer
```
supabase/migrations/20251117155420_create_reports_tables.sql
supabase/migrations/20251117155421_create_reporting_views.sql
supabase/migrations/20251117155422_create_report_execution_function.sql
supabase/migrations/20251117162517_fix_report_execution_in_operator.sql
supabase/migrations/20251117181244_add_estimate_line_items_to_report_execution.sql
supabase/migrations/20251118140000_create_branch_bids.sql
supabase/migrations/20251118141400_seed_report_templates.sql
supabase/migrations/20251124084153_update_reporting_views_category.sql
```

### Frontend Layer
```
src/pages/Reports.tsx
src/hooks/useReportExecution.ts
src/hooks/useReportTemplates.ts
src/components/reports/SimpleReportBuilder.tsx
src/components/reports/SimpleFilterPanel.tsx
src/components/reports/ReportViewer.tsx
src/components/reports/ExportControls.tsx
src/components/reports/NewTemplateGallery.tsx
src/utils/reportExporter.ts
```

### Reference Documentation
```
src/pages/KPIGuide.tsx
docs/REPORTS_QUICK_REFERENCE.md
docs/REPORTS_BUILDER_COMPREHENSIVE_PLAN.md
docs/project-category/
```

### Financial Calculation Logic
```
src/utils/projectFinancials.ts
src/utils/estimateFinancials.ts
src/utils/quoteFinancials.ts
```

## Output Format

### Issue Documentation Template

For each issue found, document as:

```markdown
### Issue #[N]: [Brief Title]

**Severity:** Critical / Warning / Info

**Location:** 
- File: `path/to/file.ts`
- Line: [N] (if applicable)
- Database: [table/view/function name] (if applicable)

**Description:**
[Clear explanation of the problem]

**Evidence:**
[Query results, code snippets, or screenshots showing the issue]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What is happening]

**Root Cause:**
[Why this is happening]

**Fix Required:**
```[language]
// Code or SQL to fix the issue
```

**Files to Modify:**
- `path/to/file1.ts`
- `path/to/file2.sql`

**Testing:**
[How to verify the fix works]
```

### Summary Report Template

```markdown
# ProfitBuild Reports System Audit Report

**Audit Date:** [DATE]
**Auditor:** Claude Code Agent
**Environment:** [Production/Staging]

## Executive Summary

[2-3 sentence overview of findings]

## Statistics

- Total Issues Found: [N]
- Critical: [N]
- Warnings: [N]
- Info: [N]
- Items Verified Working: [N]

## Critical Issues

[List all critical issues]

## Warnings

[List all warnings]

## Verified Working

[List confirmed working features]

## Recommended Action Plan

### Immediate (This Sprint)
1. [Action item]
2. [Action item]

### Short-term (Next Sprint)
1. [Action item]

### Long-term (Backlog)
1. [Action item]

## Appendix

### A. Database Schema Snapshot
[Relevant schema info]

### B. Query Results
[Key query outputs]

### C. Code Snippets
[Relevant code excerpts]
```

## Special Handling Rules

### For Unassigned Projects (SYS-000 / 000-UNASSIGNED)

These are NOT bugs - they are intentional:
- Should be category = 'system'
- Should be EXCLUDED from `reporting.project_financials` view
- Should be INCLUDED as option in expense/receipt project selectors
- User should be able to filter expenses by "Unassigned" to find items needing categorization

### For TODO Comments in Code

If you find:
```typescript
// TODO: saved_reports table not yet available
```

This IS a bug if the migration shows the table should exist. Document as Critical issue.

### For Boolean Filter Fields

The `has_labor_internal`, `only_labor_internal`, etc. fields need Yes/No/Any radio buttons, not text dropdowns. If you see `enumValues: ['true', 'false']`, this is a bug.

### For Split Expenses

The expense allocation logic is complex. When verifying:
- Non-split expenses: full amount goes to `expense.project_id`
- Split expenses: `expense.is_split = true`, amounts come from `expense_splits` table
- Never double-count: either count the parent OR the splits, not both

### For Receipts (NOT Financial Data)

**Important:** The `receipts` table is for documentation/reference ONLY. It does NOT feed into financial calculations.

All expense data comes from:
- Direct user input into `expenses` table
- CSV import (QuickBooks) into `expenses` table

Do NOT:
- Audit receipt-to-expense data flows
- Expect receipts to impact margins
- Include receipts in financial verification queries

Receipts can be assigned to projects for organizational purposes, but they have zero impact on `current_margin`, `total_expenses`, or any financial KPIs.

## Terminal Commands Reference

```bash
# Find all report-related files
find src -name "*report*" -o -name "*Report*"

# Search for TODO in reports code
grep -r "TODO" src/hooks/useReport*.ts src/components/reports/

# Find all Supabase RPC calls
grep -r "supabase.rpc" src/

# Check for deprecated field usage
grep -r "\.budget" src/ --include="*.ts" --include="*.tsx"

# Find all filter operator definitions
grep -r "operator.*equals\|operator.*in\|operator.*between" src/

# List migration files in order
ls -la supabase/migrations/*.sql | head -30
```

## Completion Criteria

The audit is complete when:

1. [ ] All Phase 1-6 queries have been executed and results documented
2. [ ] All key files have been reviewed
3. [ ] All issues have been documented with fix instructions
4. [ ] Summary report is generated
5. [ ] Action items are prioritized

## Notes for Agent

- Be thorough but efficient - don't repeat queries unnecessarily
- If a query fails, document the error and try an alternative approach
- When in doubt about business logic, document the question for human review
- Focus on data accuracy issues over UI/UX issues
- The goal is a actionable report, not perfection
