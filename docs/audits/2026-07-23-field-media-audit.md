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

## 2b. Round 2 (same day) — report redesign + PDF reliability + video thumbnails

Implemented after Chris's direction: comments will rarely exist, the report should read as
a photo-first overview (CompanyCam-style), and PDF generation felt like a coin flip.
Deployed as `generate-media-report` **v124** (byte-verified against this branch).

| # | Change | Where |
|---|--------|-------|
| 1 | **Photo Grid layout (new default)** — CompanyCam-style photo-first tiles grouped by date; caption/time render in a slim strip under a photo only when they exist; "No caption" filler removed everywhere; GPS pill only when there's no location name. `imageSize` now maps to grid density (Small=3-across, Medium=2, Large=full-width). The old side-by-side card survives as the "Detailed Cards" option for caption-heavy projects. Visible "Report Style" toggle in the modal (not buried in collapsed options). | edge fn + `MediaReportBuilderModal` |
| 2 | **PDF "wonkiness" root cause fixed** — html2pdf renders the entire report into ONE canvas; Chrome caps a canvas dimension at 32,767px and **Safari caps total area at ~16.7M px² (≈5 pages at scale 2)** — beyond that the canvas fails SILENTLY and the PDF comes out blank or truncated. `generatePdfBlob` now measures the real preview height and scales the render down to fit both caps. Also: dropped the `'avoid-all'` pagebreak mode and `.date-group`'s `page-break-inside: avoid` (a 30-photo day must be allowed to span pages — forcing it whole created the giant gaps). | `MediaReportBuilderModal`, edge fn CSS |
| 3 | **Video thumbnails now work** — generated client-side at upload (`captureVideoThumbnail` in `videoUtils.ts`: canvas frame-grab at ~1s, 640px JPEG), uploaded to `project-media-thumbnails` at `thumbnails/{id}.jpg`, PATH stored in `thumbnail_url` (readers sign by convention; the report fn signs path-based thumbnails for 30 days). The dead ffmpeg edge-function invoke is removed; `deleteProjectMedia` also cleans the thumbnail. Storage policies already permitted authenticated upload — no migration needed. | `videoUtils.ts`, `projectMedia.ts`, edge fn |
| 4 | **Honest progress** — the fake 30%→100% indicator replaced with an indeterminate spinner + item count. | `MediaReportBuilderModal` |
| 5 | **Data cleanup executed** (authorized) — the 2 broken `project_media` rows deleted with a re-verification guard (`photo-1762703330931.jpg`, `IMG_8617.jpeg`). The 5 orphaned storage objects (~10 MB, incl. two test files) left in place — harmless. | production DB |
| 6 | **Dead code removed** — `mediaMetadata.ts` placeholder helpers (stub EXIF/device-info, duplicate `formatFileSize`, unused coordinate/mime helpers); `MediaDetailsSheet` now uses the shared `formatFileSize`; `getProjectMediaList` warns loudly if a project ever hits the 1,000-row cap. | utils |

The pre-existing single video (uploaded before this fix) has no thumbnail and can't get
one retroactively without re-upload — it renders the honest placeholder.

## 2c. Round 3 (same day) — multi-recipient email + adversarial review pass

Per Chris's follow-up ("do another review… and why can't we send multiple email
recipients?"). Deployed as `generate-media-report` **v126** (byte-verified against this
branch).

| # | Change | Where |
|---|--------|-------|
| 1 | **Multi-recipient report email** — the request now takes `recipientEmails: string[]` (legacy `recipientEmail` still honored). `resolveRecipients()` trims, validates, dedupes case-insensitively, caps at 20; Resend receives the whole array in one send; `email_messages` logs one row per recipient. The modal accepts comma/semicolon/newline-separated addresses with live "N valid / N invalid" feedback, blocks send while any address is invalid, and the Email button shows the recipient count. Both email inputs switched to `type="text" inputMode="email"` — a `type="email"` field strips commas on some browsers. | edge fn + `MediaReportBuilderModal` |
| 2 | **Video thumbnails embed in reports** — `convertMediaToBase64` now includes videos with a `thumbnail_url` in the embed pass (was images-only), so emailed/printed reports show the video still instead of relying on a signed URL that may expire. | edge fn |
| 3 | **PDF aspect-ratio fix** — html2canvas 1.4.1 does not implement CSS `aspect-ratio`; tiles using it render fine in the preview but collapse to zero height in the PDF canvas. Swapped to the `padding-bottom: 75%` + absolutely-positioned img technique. Verified by re-rendering all four sample reports — pixel-identical heights before/after. | edge fn CSS |
| 4 | **XSS hardening** — comment-avatar initials are now `escapeHtml`ed (they come from profile names). | edge fn |
| 5 | **iOS video-thumbnail hardening** — `captureVideoThumbnail` gained a pixel-sampling black-frame detector (an undecoded all-black frame resolves null → honest placeholder, never a black thumbnail) and a 3s `loadeddata` fallback capture for platforms that never fire `seeked`. | `videoUtils.ts` |
| 6 | **Mobile preview fit-to-width** — the preview iframe applies `body.style.zoom = frameWidth/816` on narrow screens so phones see the whole page width; `naturalHeightRef` keeps the unzoomed height for the PDF scale math (measuring the zoomed body would corrupt the canvas-cap calculation). | `MediaReportBuilderModal` |

**Review verdicts (fresh-eyes pass over the full branch diff):** mobile + desktop layouts,
button wiring, cache-key fanout, delete order, note-media guards, and the upload/queue
paths all verified good by code review + build + rendered-screenshot inspection
(Playwright at 900px and 390px-with-zoom; no horizontal overflow in any layout/size
combination). Items P3/P4/C1/C2 from the review were judged working-as-designed and left
alone. Caveat stated honestly: no live authenticated click-through was possible from this
environment — Chris's on-device smoke test after Lovable Publish is the final gate.

## 2d. Round 4 (Jul 31) — field-reported timestamp + photo-appearance bugs

Chris's on-device testing surfaced two real bugs. Deployed as `generate-media-report`
**v128** (byte-verified). Full trace by two parallel investigation agents; live DB checks
confirmed the mechanisms.

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 1 | Photo times +4h ("might be UTC") | The edge isolate runs UTC; all six `toLocale*` sites had no `timeZone` option. Stored instants were CORRECT — pure display leak. Also mis-grouped: photos after 8pm EDT filed under the next day's header. | `ReportOptions.timeZone` (IANA, validated, default America/New_York), sent by the modal from the browser, threaded to all six sites. |
| 2 | Photos "look manipulated" | Report tiles are 4:3 boxes with `object-fit: cover` — portrait phone photos lost ~44% of the frame to center-crop (heads/floors gone). Same bug Rule 21 fixed in TimelineStoryView, never applied to the report. | `cover` → `contain` in both layouts; the existing box background letterboxes. Full frame always visible. |
| 3 | (Found during #1) `taken_at` = upload time, not capture time | No EXIF parsing existed anywhere — gallery uploads of older photos stamped the upload moment, so report day-grouping lied. | `uploadProjectMedia` parses EXIF `DateTimeOriginal` via `exifr` (sanity window 2000..now+1d), falls back to upload time. Camera captures unchanged (times coincide). |

Not fixed (deliberate): `_shared/brandedTemplate.ts` footer date still UTC (needs the
4-function coordinated redeploy; only visible within ~4h of midnight); EXIF *orientation*
baking at upload (transforms are ON so embedded report images auto-rotate — the raw-original
fallback path can still rotate PDFs; queued as the durable follow-up); no `taken_at`
backfill for historical gallery uploads (storage originals retain EXIF, so a one-shot
backfill job is possible if ever needed).

## 3. Open findings — needs a decision or a follow-up session

### P2 — Report modal & pipeline polish

- **iPad layout**: `MediaReportBuilderModal` drives its bottom-sheet vs dialog split off
  `useIsMobile()` (768px) — iPads get the desktop dialog, which is acceptable UX, but the
  house rule for field surfaces is Tailwind breakpoints (Rule 35). Same one-off in
  `BidMediaGallery`.
- **Stale thumbnails in the modal strip** — uses the gallery's 7-day signed URLs; fine in
  practice, but a report generated from a very stale tab could show broken thumbs.
- **html2pdf ceiling** — the dynamic-scale fix makes large reports *reliable*, but a
  50+ item report trades resolution for fitting the canvas caps. If big reports become
  routine, the eventual answer is server-side PDF rendering (or a print-to-PDF-only
  path, which is vector and has no canvas limits).

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
   and Email both work from the preview — for Email, enter two addresses
   comma-separated and confirm both arrive (`email_messages` gets a row per recipient).
2. **Comments**: open a photo → add a comment → it appears in the thread immediately, and
   the grid badge count updates without a reload.
3. **Delete**: delete a photo from the lightbox → grid updates without F5; schedule-hub
   media count updates on next focus. Batch: select several → Delete (admin only).
4. **Capture failure path**: airplane-mode mid-upload → the preview stays (no false
   success), retry works; offline queue path unchanged.
5. **v2 field worker**: `/field-media` on a phone — the camera FABs sit above the bottom
   tab bar instead of overlapping Notes.
