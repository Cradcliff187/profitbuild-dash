# AI Reports System Usage Guide

## Overview

The KPI-driven AI Reports system provides natural language access to your construction project data through semantic understanding of business terms and automated query generation.

## How It Works

### 1. Semantic Layer
The AI understands business terms and translates them to database fields:

```
User says: "What's our profit this month?"
AI understands: Use actual_margin (total_invoiced - total_expenses)
AI generates: SELECT SUM(actual_margin) FROM reporting.project_financials...
```

### 2. Business Rules
Critical rules ensure accurate, secure queries:
- Always filter by `category = 'construction'` (unless asked otherwise)
- Never use `receipts` table for financial calculations
- Time entries are in `expenses` table with `expense_category = 'labor_internal'`
- Use `ILIKE` for fuzzy name matching

### 3. Validation
All KPI definitions are automatically validated before deployment:
```bash
npm run validate:kpis  # Run locally
# Or CI/CD runs it automatically
```

## Query Examples

### Financial Queries
```
"What's our profit this month?" → actual_margin (real profit)
"What's our expected margin?" → current_margin (contracted - expenses)
"How much have we billed?" → total_invoiced
"What's left to bill?" → revenue_variance
```

### Time & Labor Queries
```
"How many hours did John work last week?"
→ Calculates from start_time/end_time minus lunch

"Show me employee hours this month"
→ Aggregates all internal payee time entries
```

### Project Status Queries
```
"Show me projects over budget" → cost_variance > 0
"Which projects have low margins?" → margin_percentage < 15%
"Find projects with remaining contingency" → contingency_remaining > 0
```

### Comparison Queries
```
"Compare expected vs actual revenue"
→ contracted_amount vs total_invoiced

"How do estimates compare to actual costs?"
→ original_est_costs vs total_expenses
```

## Adding New KPIs

### 1. Choose the Right Domain File

| Domain | File | When to Use |
|--------|------|-------------|
| `project` | `src/lib/kpi-definitions/project-kpis.ts` | Core project-level financial metrics |
| `estimate` | `src/lib/kpi-definitions/estimate-kpis.ts` | Estimate and line item calculations |
| `expense` | `src/lib/kpi-definitions/expense-kpis.ts` | Expense tracking and time entries |
| `quote` | `src/lib/kpi-definitions/quote-kpis.ts` | Vendor quotes and bidding |
| `revenue` | `src/lib/kpi-definitions/revenue-kpis.ts` | Invoices and revenue tracking |
| `change_order` | `src/lib/kpi-definitions/change-order-kpis.ts` | Change order impacts |
| `work_order` | `src/lib/kpi-definitions/work-order-kpis.ts` | Work order specific metrics |

### 2. Add the KPI Definition

```typescript
{
  id: 'new_metric_name',  // snake_case, unique
  name: 'New Metric Name',  // Human readable
  source: 'database',  // 'database' | 'view' | 'frontend'
  field: 'table.column',  // Database field path
  formula: 'How it\'s calculated',  // Human-readable formula
  dataType: 'currency',  // 'currency' | 'percent' | 'number' | 'boolean' | 'text' | 'date'
  domain: 'project',  // Which domain this belongs to
  whereUsed: 'ComponentName, AnotherComponent',  // Where it's displayed
  notes: 'Additional context or caveats',
  aliases: ['alternative name', 'synonym'],  // Optional: AI matching
  relatedTo: ['related_kpi_id'],  // Optional: Connected metrics
}
```

### 3. Add Semantic Mapping (if needed)

If users might refer to this KPI by a business term, add to `semantic-mappings.ts`:

```typescript
{
  concept: 'business term',
  aliases: ['synonym1', 'synonym2'],
  description: 'What this term means',
  kpiIds: ['your_new_kpi_id'],
  defaultKpiId: 'your_new_kpi_id'
}
```

### 4. Run Validation

```bash
npm run validate:kpis
```

Fix any validation errors before committing.

## Updating Business Rules

### When Rules Change

1. Edit `src/lib/kpi-definitions/business-rules.ts`
2. Add new rule with required fields:
   - `id`: unique identifier
   - `category`: 'data_source' | 'calculation' | 'filtering' | 'terminology' | 'security'
   - `rule`: the rule text
   - `reason`: why this rule exists
   - `severity`: 'critical' | 'important' | 'advisory'
   - `correctExample`: SQL showing correct usage
   - `incorrectExample`: SQL showing wrong usage

### Example New Rule

```typescript
{
  id: 'new_data_requirement',
  category: 'data_source',
  rule: 'Always include project status when querying active projects',
  reason: 'Status filtering ensures only relevant projects are returned',
  correctExample: "SELECT * FROM reporting.project_financials WHERE status IN ('in_progress', 'approved')",
  incorrectExample: 'SELECT * FROM reporting.project_financials (missing status filter)',
  severity: 'important'
}
```

## Adding Few-Shot Examples

### When to Add Examples

Add examples when:
- New query patterns are discovered
- Common user questions aren't handled well
- Business logic changes require different SQL patterns

### Example Format

```typescript
{
  question: "User's natural language question",
  reasoning: "What the AI should think - maps question to KPIs and logic",
  sql: `SELECT ...`,  // The SQL query to generate
  kpisUsed: ['kpi_id1', 'kpi_id2'],  // Which KPIs are referenced
  category: 'aggregation'  // 'aggregation' | 'filtering' | 'comparison' | 'time_based' | 'lookup'
}
```

## Troubleshooting

### Common Issues

#### AI Returns Wrong Field
- Check semantic mappings in `semantic-mappings.ts`
- Verify the concept maps to the correct KPI
- Add aliases if users use different terms

#### Validation Fails
```bash
npm run validate:kpis
```
- **Duplicate IDs**: Rename one of the conflicting KPIs
- **Missing Fields**: Add required fields to KPI definition
- **Orphaned Mappings**: Either add the KPI or remove the mapping

#### SQL Errors in Edge Function
- Check that embedded KPI context in edge function matches definitions
- Redeploy: `supabase functions deploy ai-report-assistant`
- Verify few-shot examples use correct field names

### Debug Steps

1. **Check Validation**: `npm run validate:kpis`
2. **Test Locally**: Query the AI with test questions
3. **Check Logs**: Review edge function logs in Supabase dashboard
4. **Verify Schema**: Ensure database schema matches KPI field references

## File Structure Reference

```
src/lib/kpi-definitions/
├── types.ts                    # TypeScript interfaces
├── project-kpis.ts            # Project financial metrics
├── estimate-kpis.ts           # Estimate calculations
├── expense-kpis.ts            # Expense tracking
├── quote-kpis.ts              # Vendor quotes
├── revenue-kpis.ts            # Invoice tracking
├── change-order-kpis.ts       # Change order impacts
├── work-order-kpis.ts         # Work order metrics
├── deprecated-kpis.ts         # Legacy fields
├── semantic-mappings.ts       # Business term → KPI mapping
├── business-rules.ts          # Critical AI rules
├── few-shot-examples.ts       # Query examples
├── ai-context-generator.ts    # Builds AI prompts
├── validation.ts              # Validation logic
├── run-validation.ts          # CLI entry point
└── index.ts                   # Exports everything
```

## Maintenance Checklist

### Weekly
- [ ] Run `npm run validate:kpis`
- [ ] Check for new user query patterns
- [ ] Review AI response accuracy

### Monthly
- [ ] Audit semantic mappings for completeness
- [ ] Review business rules for relevance
- [ ] Update few-shot examples if needed

### When Adding Features
- [ ] Add new KPIs to appropriate domain file
- [ ] Update semantic mappings if needed
- [ ] Add business rules for new constraints
- [ ] Test AI responses with new queries
- [ ] Run validation before deploying