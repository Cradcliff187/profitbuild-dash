# Field Media Deep-Dive Audit — 2026-07-23

Full functionality + UI audit of the Field Media area, triggered by report-generation
failures ("two errors when I try to generate one"). Every surface was read end-to-end:
`/field-media` + capture pages, both galleries, both lightboxes, comments, the report
pipeline (modal → edge function → PDF → save/email), the four media edge functions,
storage buckets, RLS, and live production data/logs.

**Scope of this branch**: root-cause fix for report generation (deployed to production as
`generate-media-report` v123) + 15 client-side fixes. Everything found but NOT fixed is
listed under "Open findings" with priority.

---

## 1. The report failure ("two FA errors") — root cause and fix

**Symptom**: generating a media report failed with `FunctionsHttpError: Edge Function
returned a non-2xx status code`. Edge request logs show three `POST | 546` responses on
`generate-media-report` v121 on 2026-07-23 (execution 1.3–3.2 s).

**HTTP 546 = WORKER_LIMIT**: the platform killed the isolate for exceeding its CPU/memory
caps. Nothing in the function's own logs — the code never finished.

**Root cause**: the function base64-embedded every selected image into the report HTML
using a byte-by-byte string build:

```ts
const base64 = btoa(uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), ''));
```

One `String.fromCharCode` call **per byte**. Production media averages **2.9 MB per photo
(max 8 MB, 393 MB total across 132 items)** — a 13-photo selection pushes ~40 MB through
that loop in parallel batches of 5, and the isolate dies on CPU before responding. This
worked when photos were smaller/fewer and degraded into a hard failure as real field
photos accumulated.

**Fix (deployed as v122, comment-parity redeploy v123 — repo and production verified
byte-identical)**:

1. **Linear encoding** — `encodeBase64` from Deno std replaces the quadratic loop.
2. **Resized images via Storage transforms** — the function probes
   `/render/image/public/project-media/...?width=1200&quality=75` once at runtime; if the
   transform feature is enabled, every embed uses a ~100–300 KB resized variant instead of
   the 3–8 MB original. Silent fallback to originals if the endpoint isn't available.
3. **Hard embed budget** — max 12 MB per file, 48 MB total raw bytes. Items past the
   budget keep their remote URL; the `project-media` bucket is public with CORS, so both
   the preview iframe and html2canvas still render them. The isolate can no longer be
   OOM'd regardless of selection size.
4. **Video placeholder** — videos without a generated thumbnail previously rendered
   `<img src={video-file-url}>` = broken image in every report. Now a styled placeholder
   block (duration + "view in project portal").
5. **Durable email thumbnails** — the email's 3 preview images used 1-hour signed URLs
   (broken images for any client opening the email later). Now stable public URLs;
   videos without thumbnails are skipped from the preview row.

**Client side**: the modal now surfaces the real error (specifically "Report too large to
generate — try selecting fewer items." on a 546) instead of the generic
`FunctionsHttpError` message.

**CLAUDE.md drift corrected**: the pinned version table said v115; production was on v121
(deployed 2026-06-12, byte-identical to repo). Now pinned at **v123**.

---

## 2. Fixed in this branch (client)

| # | Fix | Files |
|---|-----|-------|
| 1 | **Phantom cache key** — `useProjectMedia`'s key was `['project-media', id, undefined]` but optimistic writes targeted `['project-media', id]`; `setQueryData` is exact-match, so the broken-image **Retry was fully non-functional** and batch-delete optimistic removal was a no-op. New exported `projectMediaQueryKey()` is the single source of the key. | `useProjectMedia.ts`, `ProjectMediaGallery.tsx` |
| 2 | **Banned realtime removed** (3 channels) — media list channel (re-subscribed on *every render* due to an unstable dep), project comment-counts channel, per-media comments channel. All mounted on field-worker paths (Gotchas #53/#55). Replaced with mutation-side invalidation + focus refetch. | `useProjectMedia.ts`, `ProjectMediaGallery.tsx`, `MediaCommentsList.tsx` |
| 3 | **Comments never appeared after submit** — the list was `useState` + mount-fetch; the realtime handler invalidated a query key that no query ever registered. List is now a real `useQuery(['media-comments', mediaId])`; the form invalidates it + the count badges on submit/delete. | `MediaCommentsList.tsx`, `MediaCommentForm.tsx` |
| 4 | **Comment badges vanished on projects with note media** — the counts query passed `note:<uuid>` ids into `.in('media_id', ...)`; `media_comments.media_id` is uuid-typed, so one malformed id 400s the entire query (9 note-attached media exist in prod). Note ids now excluded; counts are a proper query with invalidation. | `ProjectMediaGallery.tsx` |
| 5 | **Note-sourced media leaked into report selections** — `note:` ids were sent to the edge function, which silently dropped them: report showed fewer items than the count promised. Note items no longer render selection checkboxes and are excluded from Select All. | `ProjectMediaGallery.tsx` |
| 6 | **Batch delete had no trigger** — the confirmation dialog + handler existed but nothing ever opened it (lost in a refactor); multi-select's only action was Generate Report. Restored as a Delete button in the selection bar, admin/manager-gated. Dead `handleBatchDownload` + unused imports removed. | `ProjectMediaGallery.tsx` |
| 7 | **Delete order caused permanently broken tiles** — `deleteProjectMedia` removed the storage object FIRST, then the DB row; an RLS-blocked row delete reports **no error** (0 rows), leaving a DB row pointing at nothing (2 such rows live, one from Jul 20). Now DB-first with `.select('id')` row-count verification, storage cleanup best-effort. | `utils/projectMedia.ts` |
| 8 | **Lightbox deletes never refreshed the UI** — both lightboxes relied on the (removed) realtime channel. They now invalidate `project-media` + `project-media-count` on success, so grids and the schedule-hub badge stay honest. | `PhotoLightbox.tsx`, `VideoLightbox.tsx` |
| 9 | **VideoLightbox missing `source:'note'` guards** — note-sourced videos showed Delete, caption Edit, and a comment thread (all writing against `project_media`/`media_comments` with a `note:` id → errors). Now guarded exactly like PhotoLightbox, with the "shared in a project note" notice. | `VideoLightbox.tsx` |
| 10 | **Capture pages toasted success on failed uploads and discarded the capture** — `upload()` returns `null` on failure (it toasts its own error), but the pages never checked, so users saw "Upload failed" + "Photo uploaded" together and lost the photo/recording. All three handlers now keep the preview on failure. | `FieldPhotoCapture.tsx`, `FieldVideoCapture.tsx` |
| 11 | **Uploads now invalidate media caches** — new captures previously appeared only via the deleted realtime channel; schedule-hub count badges stayed stale. | `useProjectMediaUpload.ts` |
| 12 | **Capture FABs overlapped the v2 FieldTabBar** — `fixed bottom-6 z-40` inside the tab-bar band at the same z-index for field-worker-v2 users. FABs now lift above the bar when the field shell is active (same clearance pattern as ProjectDetailView). | `FieldMedia.tsx` |
| 13 | **Badge collision** — the comment badge and category badge both rendered at `absolute bottom-2 left-2 z-10`, stacking on identical coordinates. Now share one positioned flex row. | `ProjectMediaGallery.tsx`, `MediaCommentBadge.tsx` unchanged (wrapper handles position) |
| 14 | **Eager image loading + fixed grid** — gallery `<img>`s had no `loading="lazy"` (every thumbnail loaded at once); `FieldMediaGallery` was locked to 2 columns at every width (field-only users get it on iPad/desktop too → giant tiles). Lazy loading added; grid now `2 / sm:3 / lg:4`. | `ProjectMediaGallery.tsx`, `FieldMediaGallery.tsx` |
| 15 | **Gotcha #63 auth calls** — `supabase.auth.getUser()` (network round-trip holding the auth lock) removed from the comment form/list (→ `useAuth()`), the report-save util and `uploadProjectMedia` (→ `getSession()`), and deleted entirely from `refreshMediaSignedUrl` (it fetched the user and never used it — pure waste on every image error). | `MediaCommentForm.tsx`, `MediaCommentsList.tsx`, `reportStorageUtils.ts`, `utils/projectMedia.ts` |
| 16 | **Report save now invalidates document caches** — saving a report inserts a `project_documents` row; the Docs tab/timeline/count never heard about it. | `MediaReportBuilderModal.tsx` |

`npm run pre-deploy` (lint + type-check) passes; remaining lint warnings in touched files
are pre-existing exhaustive-deps patterns shared with the rest of the codebase.

---

## 3. Open findings — needs a decision or a follow-up session

### P1 — Video thumbnails have never worked (pipeline is dead-on-arrival)

`generate-video-thumbnail` spawns `ffmpeg` via `Deno.Command` — the hosted Supabase edge
runtime has **no ffmpeg binary and does not permit subprocess spawn**. The
`project-media-thumbnails` bucket has **0 objects ever**; the single video in
`project_media` has `thumbnail_url NULL`. Every video upload fire-and-forget invokes a
function that can only fail (harmless but pointless).

**Recommended fix shape** (follow-up, not this branch): generate the thumbnail
client-side at capture — draw a frame to `<canvas>` (`video.currentTime = 1` →
`canvas.toBlob`), upload alongside the video, store the **path** (not a signed URL — the
current function stores a 1-year signed URL, which is an expiring value in a permanent
column). Then delete the edge function. Until then: video tiles show a generic play
placeholder (gallery) and the new placeholder block (reports) — degraded but honest.

### P1 — Broken media rows in production (cleanup SQL, needs your go-ahead)

Two `project_media` rows point at storage objects that no longer exist (the delete-order
bug, §2.7) — they render as broken tiles forever. Five storage objects have no DB row
(upload-rollback leftovers, incl. two Apr-21 test files). I did **not** delete production
data without your sign-off. To clean up:

```sql
-- 1) The two broken DB rows (verified: no storage object behind them)
DELETE FROM project_media WHERE id IN (
  '59cc57be-24e2-4c2a-a041-a5fa3625296a',  -- 2025-11-09
  '685aaeb8-cbdb-4983-acb3-a0933b599e49'   -- 2026-07-20 (img_8617.jpeg)
);
```

The 5 orphaned storage objects (~10 MB) can be removed from the `project-media` bucket via
dashboard or storage API; exact paths are in the session notes — harmless to leave.

### P2 — Report modal & pipeline polish

- **iPad layout**: `MediaReportBuilderModal` drives its whole bottom-sheet vs dialog
  split off `useIsMobile()` (768px) — iPads get the desktop dialog. House rule for field
  surfaces is Tailwind breakpoints (Rule 35). Same one-off in `FieldMedia.tsx`'s FAB
  gate and `BidMediaGallery`.
- **Fake progress** — the progress indicator jumps 30% → 100% (no real signal). Cosmetic.
- **Stale thumbnails in the modal strip** — uses the gallery's 7-day signed URLs; fine in
  practice, but a report generated from a very stale tab could show broken thumbs.
- **html2pdf ceiling** — the client-side PDF render (html2canvas at scale 2) will get slow
  past ~50 items even with resized images. The 50-item warning already exists; a
  server-side PDF (or print-to-PDF-only path) is the eventual answer if large reports
  become routine.

### P2 — Data quality: the classification features have zero adoption

130/132 media have **no caption**; 132/132 have **no category** (the May-2026 8-value
taxonomy + filter pills, Rule 29). The filter pills row literally never renders in
production. Either drive adoption (e.g., prompt for category in the capture flow /
`MediaDetailsSheet` nudge) or accept the pills as admin-only tooling. Reports are also
visibly thinner when every card says "No caption" — worth a field-habit conversation
independent of code.

### P3 — Scale guards (not a problem at 132 rows, will be at 1,000)

- `getProjectMediaList` main + note queries and the comment-counts query are unbounded →
  PostgREST's 1,000-row cap truncates silently (Gotcha #23 class). Largest project today:
  20 items.
- No windowing in any gallery (contrast `ReceiptsList`'s PAGE_SIZE=24 IntersectionObserver
  pattern). `loading="lazy"` (added) covers the near term.

### P3 — Cross-cutting consistency (cataloged, low urgency)

- **`VideoLightbox` is shared with `BidMediaGallery`** via `as any` + fake
  `project_id: bidId` — its Delete/comments write to `project_media`/`media_comments`
  with a *bid* media id. Bid-scope bug; needs an `entityType` prop or a bid-specific
  lightbox.
- Loading states: `BrandedLoader` vs plain text vs `Skeleton` across the four media
  surfaces; grid density and `object-cover/contain` conventions differ per gallery
  (inventoried in the session, harmonize opportunistically).
- `mediaMetadata.ts` carries placeholder dead code (`extractExifMetadata` returns
  all-nulls, `getDeviceInfo` likewise) and a third duplicate `formatFileSize`.
- Media delete confirmations use raw `AlertDialog` rather than the canonical
  `useConfirmDialog` (Gotcha #73) — works fine, stylistically inconsistent.

### Security posture (advisors, unchanged by this branch)

- `project_media` UPDATE policy is `USING (true)` for any authenticated user (any signed-in
  user can edit any caption/category). Consistent with the app's "RLS rows, UX gates"
  posture, but flagged by the linter.
- `project-media` bucket is **public** and allows listing. CLAUDE.md previously claimed it
  was signed-URL-only (corrected). The signed-URL flow in the app still works — but the
  privacy guarantee people may assume from "signed URLs" doesn't exist. If field photos
  are ever sensitive, this needs a deliberate decision (private bucket + the app already
  signs everything, so flipping is mostly risk-free — except note-media and email/report
  URLs which now rely on public access).
- `enhance-caption` calls OpenAI model `gpt-5-mini-2025-08-07` — no recent invocations in
  logs to confirm the model id is still valid; worth one live test from the caption flow.

---

## 4. How to verify (after Lovable Publish)

1. **Report generation**: Field Media → select the biggest project (225-088, 20 items ≈
   49 MB of originals) → Select All → Generate Report. Preview should appear in seconds;
   edge logs should show `POST | 200` and a `transforms ON/OFF` console line. Download PDF
   and Email both work from the preview.
2. **Comments**: open a photo → add a comment → it appears in the thread immediately, and
   the grid badge count updates without a reload.
3. **Delete**: delete a photo from the lightbox → grid updates without F5; schedule-hub
   media count updates on next focus. Batch: select several → Delete (admin only).
4. **Capture failure path**: airplane-mode mid-upload → the preview stays (no false
   success), retry works; offline queue path unchanged.
5. **v2 field worker**: `/field-media` on a phone — the camera FABs sit above the bottom
   tab bar instead of overlapping Notes.
