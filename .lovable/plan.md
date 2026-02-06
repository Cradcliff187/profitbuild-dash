
# Fix Import History Tab Button

## Problem Identified

The "Import History" tab button doesn't work because the `handleTabChange` function is missing the `"import-history"` case.

### Current Code (Line 437-441)
```typescript
const handleTabChange = (value: string) => {
  if (value === "overview" || value === "list" || value === "invoices") {
    setViewMode(value as ViewMode);
  }
};
```

When clicking "Import History", the value `"import-history"` is passed but doesn't match any condition, so `setViewMode` is never called and the view doesn't change.

---

## Fix

Add `"import-history"` to the condition in `handleTabChange`:

**File:** `src/pages/Expenses.tsx`  
**Line:** 438

```typescript
const handleTabChange = (value: string) => {
  if (value === "overview" || value === "list" || value === "invoices" || value === "import-history") {
    setViewMode(value as ViewMode);
  }
};
```

---

## Technical Details

| Item | Value |
|------|-------|
| File | `src/pages/Expenses.tsx` |
| Line | 438 |
| Change | Add `\|\| value === "import-history"` to the condition |
| Risk | None - simple string comparison addition |

The `TabsContent value="import-history"` already exists (line 569) and renders `<ImportHistory />`, so once the tab switch works, the component will display correctly.
