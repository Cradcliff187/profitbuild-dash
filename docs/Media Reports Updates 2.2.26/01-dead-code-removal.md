# 01 — Dead Code Removal

## Priority: First (Zero Risk)
## Risk Level: None
## Estimated Time: 5 minutes

---

## Context

Two client-side files exist that duplicate functionality now handled by the `generate-media-report` edge function. They are no longer imported or used anywhere. Additionally, the edge function maintains a `generateDetailedFormat()` function that is never called — the modal hardcodes `format: 'story'`.

## Files to DELETE

### 1. `src/utils/htmlReportTemplate.ts`

**Why it's dead:** The `MediaReportBuilderModal` calls `supabase.functions.invoke('generate-media-report')` to get HTML. This client-side template (`generateMediaReportHTML()`) is never imported anywhere.

**Verification before deleting:**
```bash
# Run from project root — must return zero results
grep -r "htmlReportTemplate" src/ --include="*.ts" --include="*.tsx"
grep -r "generateMediaReportHTML" src/ --include="*.ts" --include="*.tsx"
```

If either grep returns results, DO NOT DELETE — investigate the import first.

### 2. `src/utils/mediaReportPdfGenerator.ts`

**Why it's dead:** This was the original jsPDF-based report generator (direct canvas drawing, not HTML-based). It was replaced by the edge function + html2pdf approach. The `MediaReportOptions` interface and `generateMediaReport` function are not imported anywhere.

**Verification before deleting:**
```bash
# Run from project root — must return zero results
grep -r "mediaReportPdfGenerator" src/ --include="*.ts" --include="*.tsx"
grep -r "MediaReportOptions" src/ --include="*.ts" --include="*.tsx"
```

**Exception:** If `MediaReportOptions` IS imported somewhere but only for its type, check if that consumer can use a local type instead. Only delete if truly unused.

## Code to REMOVE (not file deletion)

### 3. `supabase/functions/generate-media-report/index.ts` — Remove `generateDetailedFormat()`

The modal hardcodes:
```typescript
format: 'story', // Always use story timeline format
```

The `generateDetailedFormat()` function (~40 lines) in the edge function is never reached. However, **do NOT remove it in this phase.** We will address this in file `06-report-generation-overhaul.md` when we rewrite the edge function. Removing it now would create a merge conflict later.

## Validation Checklist

- [ ] `grep` confirms zero imports of deleted files
- [ ] `npm run build` (or `npx tsc --noEmit`) completes without errors
- [ ] Application loads in browser without console errors
- [ ] Media gallery still loads and displays photos
- [ ] Report generation still works (select photos → Generate Report → PDF downloads)

## What NOT to Touch

- `src/components/MediaReportBuilderModal.tsx` — still active, uses edge function
- `supabase/functions/generate-media-report/index.ts` — still active, will be rewritten in Phase 4
- Any file in `src/utils/` other than the two being deleted
