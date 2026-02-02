# Field Media System Improvements — Master Index

## Execution Order & Dependency Graph

These files are numbered in the order they MUST be executed. Each phase builds on the prior one. Do NOT skip ahead.

```
Phase 1: Zero-Risk Cleanup
  01 → Dead Code Removal (removes unused files, zero breaking risk)

Phase 2: Additive Fixes (no existing behavior changes)
  02 → Missing Metadata Fields (adds params to upload calls)

Phase 3: Performance (same API surface, faster execution)
  03 → Batch Signed URLs — Frontend (projectMedia.ts)
  04 → Comment Badge Consolidation (MediaCommentBadge + Gallery)

Phase 4: Report Pipeline Foundation
  05 → Shared Branding Template (new shared utility, no changes to existing code yet)
  06 → Report Generation Overhaul (replaces html2pdf pipeline, depends on 05)
  07 → Report Delivery Options: Print/Save PDF, Download, Email (depends on 05 + 06)

Phase 5: Larger Refactors
  08 → Capture Component Consolidation (extracts shared component from 4 files)
  09 → Bid Media Improvements (signed URLs + offline queue)
  10 → Portal Pattern Fix (small reliability improvement)
```

## Dependency Rules

| File | Depends On | Can Run In Parallel With |
|------|-----------|------------------------|
| 01 | Nothing | Nothing (run first) |
| 02 | 01 | Nothing |
| 03 | 01 | 02 (if careful) |
| 04 | 03 | Nothing |
| 05 | 01 | 02, 03, 04 |
| 06 | 05 | Nothing |
| 07 | 05, 06 | Nothing |
| 08 | 02 | 05, 06, 07 |
| 09 | 03 | 08 |
| 10 | Nothing | Anything |

## Files Touched Per Phase

### Phase 1 (01)
- DELETE: `src/utils/htmlReportTemplate.ts`
- DELETE: `src/utils/mediaReportPdfGenerator.ts`

### Phase 2 (02)
- MODIFY: `src/pages/FieldPhotoCapture.tsx` (add 3 params to upload call)
- MODIFY: `src/pages/FieldVideoCapture.tsx` (add 2 params to upload call)

### Phase 3 (03-04)
- MODIFY: `src/utils/projectMedia.ts` (getProjectMediaList, refreshMediaSignedUrl)
- MODIFY: `src/components/MediaCommentBadge.tsx` (replace with props-based component)
- MODIFY: `src/components/ProjectMediaGallery.tsx` (add comment count fetching)

### Phase 4 (05-07)
- CREATE: `supabase/functions/_shared/brandedTemplate.ts`
- MODIFY: `supabase/functions/generate-media-report/index.ts`
- MODIFY: `src/components/MediaReportBuilderModal.tsx`
- MODIFY: `src/components/ProjectMediaGallery.tsx` (add email button)

### Phase 5 (08-10)
- CREATE: `src/components/MediaCaptureFlow.tsx`
- MODIFY: `src/pages/FieldPhotoCapture.tsx` (use shared component)
- MODIFY: `src/pages/BidPhotoCapture.tsx` (use shared component)
- MODIFY: `src/pages/FieldVideoCapture.tsx` (use shared component)
- MODIFY: `src/pages/BidVideoCapture.tsx` (use shared component)
- MODIFY: `src/hooks/useBidMediaUpload.ts` (switch to signed URLs)
- MODIFY: `src/utils/syncQueue.ts` (add bid media queue type)
- MODIFY: `src/utils/backgroundSync.ts` (add bid media sync handler)
- MODIFY: `src/components/ProjectMediaGallery.tsx` (replace portal with ref)

## Critical Rules for All Phases

1. **Follow `.cursorrules`** — Always read and follow the `.cursorrules` file in the repo root for project conventions
2. **Use Supabase MCP** — All database migrations and edge function deployments go through the Supabase MCP already configured in Cursor. Do NOT use CLI commands directly.
3. **Edge function imports must be pinned** — All `import` statements in edge functions must use explicit version numbers (e.g., `npm:@supabase/supabase-js@2` or `https://esm.sh/@supabase/supabase-js@2.57.4`). Check existing edge functions in the repo to match their import pattern. Each function with external dependencies should have its own `deno.json` with an `imports` map if that's the existing pattern.
4. **Test after each file** — Do not batch multiple phases without verification
5. **No import changes that remove used exports** — Check all consumers before removing
6. **Database schema is NOT changing** — All improvements are frontend/edge-function only
7. **Preserve all existing function signatures** — Changes are internal implementation only
8. **TypeScript strict mode** — Every change must type-check cleanly
9. **Mobile-first** — Any UI changes must work at 375px width minimum
10. **Do NOT modify existing email edge functions** — `send-auth-email`, `send-receipt-notification`, `send-training-notification` are completely untouched across all phases
