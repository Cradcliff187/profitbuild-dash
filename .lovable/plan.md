
# Fix Contract Placeholder Replacement + Build Errors

## Issue Summary

**Placeholder Problem:** The generated contract shows `{{SUBCONTRACT_NUMBER}}` and `{{PROJECT_LOCATION}}` as raw text instead of the actual values. The edge function logs confirm the values ARE being passed correctly:
- `"{{SUBCONTRACT_NUMBER}}": "UH225001-22"`
- `"{{PROJECT_LOCATION}}": "68 Cavalier Blvd.\t\nFlorence, KY 41042"`

**Root Cause:** Word saves `.docx` files as XML. When you type `{{SUBCONTRACT_NUMBER}}` in Word, it may split this across multiple XML "runs" like:
```xml
<w:t>{{SUBCONTRACT_</w:t></w:r><w:r><w:rPr>...</w:rPr><w:t>NUMBER}}</w:t>
```

The current normalization function only handles simple splits, missing cases with formatting tags in between.

**Build Errors:** 6 TypeScript errors need fixing (type casting and status comparison issues).

---

## Fix Plan

### 1. Improve Placeholder Normalization (Edge Function)

Update `normalizePlaceholderRuns()` to handle more split patterns by:
- Stripping XML tags from inside any `{{...}}` pattern
- Using an iterative approach to merge fragments

**File:** `supabase/functions/generate-contract/index.ts`

```typescript
function normalizePlaceholderRuns(xml: string): string {
  // Strip any XML tags found INSIDE placeholder markers
  // This handles cases where Word splits {{PLACEHOLDER}} across runs
  return xml.replace(
    /\{\{([^{}]*(?:<[^>]*>[^{}]*)*)\}\}/g,
    (match) => {
      // Remove all XML tags from inside the placeholder
      const cleaned = match.replace(/<[^>]*>/g, '');
      return cleaned;
    }
  );
}
```

### 2. Fix Build Errors

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `EstimateStatusActions.tsx` | 102 | Comparing against `'approved'` which isn't in the type union | Check the actual fresh status type and fix comparison logic |
| `ContractGenerationModal.tsx` | 143 | `useFieldArray` name typed incorrectly | Cast the name parameter properly |
| `ContractsListView.tsx` | 50 | Mapped rows missing Contract properties | Add proper type assertion with `as unknown as Contract[]` |
| `QuoteViewRoute.tsx` | 38 | `field_values` is `Json` but needs to be `ContractFieldValues` | Cast via `unknown` |
| `Quotes.tsx` | 86, 931 | Same `field_values` type mismatch | Cast via `unknown` |

---

## Files to Modify

1. `supabase/functions/generate-contract/index.ts` - Better placeholder normalization
2. `src/components/EstimateStatusActions.tsx` - Fix status comparison
3. `src/components/contracts/ContractGenerationModal.tsx` - Fix useFieldArray typing
4. `src/components/contracts/ContractsListView.tsx` - Fix type casting
5. `src/components/project-routes/QuoteViewRoute.tsx` - Fix field_values cast
6. `src/pages/Quotes.tsx` - Fix field_values casts (2 locations)

---

## Expected Result

After these changes:
- All placeholders will be replaced correctly in generated contracts
- All 6 build errors will be resolved
- Contract generation will work end-to-end
