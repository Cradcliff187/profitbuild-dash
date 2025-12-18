# Add Category Composition Filter for Projects

## Goal
Allow users to filter projects by line item category composition with flexible matching logic (any/only/all).

## Implementation Steps

### Step 1: Update project_financials view to include category_list
- Add `category_list` column - array of distinct categories in project's line items
- Migration file: `supabase/migrations/[timestamp]_add_category_list_to_project_financials.sql`

### Step 2: Add category_composition field to Projects metadata
- Add new field with special handling for composition matching
- Field type: 'text' with enumValues from expense_category enum
- Add matchMode property to support 'any', 'only', 'all' logic

### Step 3: Create special category composition filter UI component
- New `renderCategoryCompositionFilter` in SimpleFilterPanel.tsx
- Multi-select checkboxes for categories
- Radio buttons for match mode (Any/Only/All)
- Display selected categories with badges

### Step 4: Update database function for array matching
- Add logic in `execute_simple_report` to handle category_list array matching
- Support three modes:
  - 'contains_any': category_list && ARRAY[selected] (overlap)
  - 'contains_only': category_list = ARRAY[selected] (exact match)
  - 'contains_all': category_list @> ARRAY[selected] (contains all)

### Step 5: Update filter handling in frontend
- Store matchMode with filter value
- Pass to backend as part of filter object

## Technical Details

### Database View Column:
```sql
ARRAY(
  SELECT DISTINCT eli.category::text
  FROM estimate_line_items eli
  JOIN estimates e ON e.id = eli.estimate_id
  WHERE e.project_id = p.id 
    AND e.status = 'approved'
  ORDER BY eli.category::text
) as category_list
```

### Filter Object Structure:
```javascript
{
  field: 'category_composition',
  operator: 'contains_any', // or 'contains_only', 'contains_all'
  value: ['labor_internal', 'management']
}
```

