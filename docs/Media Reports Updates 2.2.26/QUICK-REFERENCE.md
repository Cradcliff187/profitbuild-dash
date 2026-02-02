# Quick Reference — Field Media Improvements

## At a Glance

| # | Phase | Risk | Time | Key Files |
|---|-------|------|------|-----------|
| 01 | Dead Code Removal | None | 5 min | DELETE 2 util files |
| 02 | Missing Metadata | Very Low | 10 min | 2 capture pages (add params) |
| 03 | Batch Signed URLs | Low | 20 min | projectMedia.ts |
| 04 | Comment Badge | Low-Med | 30 min | MediaCommentBadge + Gallery |
| 05 | Shared Template | Very Low | 30 min | NEW _shared/brandedTemplate.ts |
| 06 | Report Overhaul | Medium | 60 min | Edge function rewrite |
| 07 | Report Delivery | Medium | 45 min | Edge function + Modal |
| 08 | Capture Consolidation | Med-High | 90 min | NEW hooks + 4 capture pages |
| 09 | Bid Media | Medium | 60 min | Upload hook + sync queue |
| 10 | Portal Fix | Low | 15 min | Gallery + FieldMedia page |

## Stop/Check Points

After each file, run:
```bash
npx tsc --noEmit  # Type check
npm run build      # Full build
```

Then manually test the affected feature in the browser.

## Critical Rules

1. ONE phase at a time — verify before moving on
2. Database schema is NOT changing — all improvements are code-only
3. Function signatures stay the same — internal implementation changes only
4. If a grep check in a guide returns unexpected results, STOP and investigate
5. Edge functions require deployment after changes: `supabase functions deploy <name> --project-ref clsjdxwbsjbhjibvlqbz`

## File Tree of Changes

```
DELETE:
  src/utils/htmlReportTemplate.ts
  src/utils/mediaReportPdfGenerator.ts

CREATE:
  supabase/functions/_shared/brandedTemplate.ts
  src/hooks/useCaptureMetadata.ts
  src/hooks/useCaptionFlow.ts

MODIFY:
  src/pages/FieldPhotoCapture.tsx
  src/pages/FieldVideoCapture.tsx
  src/pages/BidPhotoCapture.tsx
  src/pages/BidVideoCapture.tsx
  src/utils/projectMedia.ts
  src/utils/syncQueue.ts
  src/utils/backgroundSync.ts
  src/hooks/useBidMediaUpload.ts
  src/hooks/useBidMedia.ts (if exists, for signed URL read)
  src/components/MediaCommentBadge.tsx
  src/components/ProjectMediaGallery.tsx
  src/components/MediaReportBuilderModal.tsx
  src/pages/FieldMedia.tsx
  supabase/functions/generate-media-report/index.ts
```
