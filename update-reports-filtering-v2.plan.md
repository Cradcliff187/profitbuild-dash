# Fix Report Filters - Simplify Boolean and Add Category Filter

## Problem
- Boolean filters (Has Internal Labor, etc.) show confusing true/false dropdown that breaks when selected
- Missing category filter for line item composition on projects
- User needs simple, intuitive filter UI

## Solution
1. Replace boolean enum dropdowns with Yes/No/Any radio buttons
2. Add category multi-select filter to Custom Filters for projects
3. Update field metadata to properly handle boolean fields
4. Update database query to handle "Any" selection (no filter applied)

## Implementation Steps

### Step 1: Update Field Metadata in SimpleReportBuilder.tsx
- Change boolean fields from enumValues to a new field type 'boolean'
- Add category field to projects with proper enum values
- Remove 'equals' operator constraint for boolean fields

File: `src/components/reports/SimpleReportBuilder.tsx`
- Line 50-51: Change `has_labor_internal` and `only_labor_internal` from `type: 'text'` with `enumValues: ['true', 'false']` to `type: 'boolean'`
- Line 48-52: Add similar changes for all boolean composition fields
- Add new field in projects array: `{ key: 'category', label: 'Primary Category', type: 'text', group: 'composition', enumValues: ['labor_internal', 'subcontractors', 'materials', 'equipment', 'permits', 'management', 'other'], allowedOperators: ['equals', 'in'], helpText: 'Primary line item category for project' }`

### Step 2: Update SimpleFilterPanel.tsx - Add Radio Button Component
- Create `renderBooleanRadioFilter` function for Yes/No/Any selection
- Update `renderSimpleMultiSelect` to detect boolean type and use radio filter
- Handle "Any" selection by removing the filter entirely

File: `src/components/reports/SimpleFilterPanel.tsx`
- After line 588: Add new function `renderBooleanRadioFilter(field: FieldMetadata, filter: ReportFilter | null)`
- Line 591-609: Update `renderSimpleMultiSelect` to check for `field.type === 'boolean'` and call `renderBooleanRadioFilter`

### Step 3: Update Category Handling in customFields
- Add category to projects composition group
- Ensure category displays in Custom Filters section

File: `src/components/reports/SimpleFilterPanel.tsx`
- Line 73: Ensure composition group includes category field

### Step 4: Update Database Query for Boolean Filters
- Modify execute_simple_report to handle boolean filters without requiring 'true'/'false' strings
- When filter value is null or empty (Any), skip the filter condition entirely

File: Create new migration `supabase/migrations/[timestamp]_simplify_boolean_filters.sql`
- Update the boolean field handling in execute_simple_report function
- Remove the text string conversion, use direct boolean comparison
- Handle null/empty filter values as "no filter" (Any option)

### Step 5: Clean Up Advanced Filters
- Already done - boolean fields excluded from Advanced Filters dropdown

### Step 6: Testing
- Test each boolean filter with Yes, No, and Any options
- Test category multi-select filter
- Verify "Any" removes filter and shows all results
- Test combination of filters

