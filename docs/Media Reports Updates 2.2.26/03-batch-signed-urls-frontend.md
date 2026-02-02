# 03 — Batch Signed URLs (Frontend)

## Priority: Third (Highest Performance ROI)
## Risk Level: Low — same function signature, same return type, faster internals
## Estimated Time: 20 minutes
## Depends On: 01 (dead code removal), both HOTFIXes should be applied first (hooks order + documents signed URLs)

---

## Global Rules

1. Follow `.cursorrules` in repo root for all project conventions
2. Use Supabase MCP for any database migrations or edge function deployments (NOT CLI commands)
3. Edge function imports must be pinned with explicit versions (not applicable to this phase)

---

## Context

`getProjectMediaList()` in `src/utils/projectMedia.ts` generates signed URLs one at a time using `createSignedUrl()` (singular). Supabase JS client provides `createSignedUrls()` (plural) which batches all paths into a single network request.

Current: 50 photos = 50+ individual API calls (plus additional calls for video thumbnails).
After: 50 photos = 1 batch call for photos + 1 batch call for video thumbnails = 2 total.

**Note:** The Documents Timeline hotfix (`HOTFIX-Documents-SignedURLs.md`) already uses the batch `createSignedUrls()` pattern inline in `ProjectDocumentsTimeline.tsx`. That is a separate code path — this phase optimizes the Field Media / `useProjectMedia` path. Both should exist independently; they serve different pages.

## File to Modify

### `src/utils/projectMedia.ts`

### Change 1: Replace N+1 in `getProjectMediaList()`

**Current code (the `Promise.all` block inside `getProjectMediaList`):**
```typescript
// Generate signed URLs for all media (7 days expiry)
const mediaWithUrls = await Promise.all(
  (data || []).map(async (media) => {
    const { data: signedUrlData } = await supabase.storage
      .from('project-media')
      .createSignedUrl(media.file_url, 604800);

    // Get signed URL for thumbnail if it exists
    let thumbnailUrl = media.thumbnail_url;
    if (thumbnailUrl && media.file_type === 'video') {
      const { data: thumbSignedUrl } = await supabase.storage
        .from('project-media-thumbnails')
        .createSignedUrl(`thumbnails/${media.id}.jpg`, 604800);
      thumbnailUrl = thumbSignedUrl?.signedUrl || thumbnailUrl;
    }

    return {
      ...media,
      file_url: signedUrlData?.signedUrl || media.file_url,
      thumbnail_url: thumbnailUrl,
    } as ProjectMedia;
  })
);
```

**Replace with:**
```typescript
// Batch generate signed URLs for all media (7 days expiry)
// Filter to only paths that need signing (skip nulls and already-full URLs)
const mediaWithPaths = (data || []).filter(
  (media) => media.file_url && !media.file_url.startsWith('http')
);
const mediaPaths = mediaWithPaths.map((media) => media.file_url);

const { data: signedUrls, error: signedUrlError } = mediaPaths.length > 0
  ? await supabase.storage
      .from('project-media')
      .createSignedUrls(mediaPaths, 604800)
  : { data: null, error: null };

if (signedUrlError) {
  console.error('Failed to batch generate signed URLs:', signedUrlError);
}

// Build a map from path → signedUrl for O(1) lookup
const signedUrlMap = new Map<string, string>();
if (signedUrls) {
  signedUrls.forEach((item) => {
    if (item.signedUrl && item.path) {
      signedUrlMap.set(item.path, item.signedUrl);
    }
  });
}

// Batch generate thumbnail signed URLs for videos
const videoMedia = (data || []).filter(
  (media) => media.file_type === 'video' && media.thumbnail_url
);
const thumbnailPaths = videoMedia.map((media) => `thumbnails/${media.id}.jpg`);

const thumbnailUrlMap = new Map<string, string>();
if (thumbnailPaths.length > 0) {
  const { data: thumbSignedUrls } = await supabase.storage
    .from('project-media-thumbnails')
    .createSignedUrls(thumbnailPaths, 604800);

  if (thumbSignedUrls) {
    thumbSignedUrls.forEach((item) => {
      if (item.signedUrl && item.path) {
        thumbnailUrlMap.set(item.path, item.signedUrl);
      }
    });
  }
}

// Map signed URLs back to media items
const mediaWithUrls = (data || []).map((media) => {
  // If file_url is already a full URL, use it as-is
  const signedUrl = media.file_url?.startsWith('http')
    ? media.file_url
    : signedUrlMap.get(media.file_url) || media.file_url;
  let thumbnailUrl = media.thumbnail_url;

  if (media.file_type === 'video' && media.thumbnail_url) {
    const thumbKey = `thumbnails/${media.id}.jpg`;
    thumbnailUrl = thumbnailUrlMap.get(thumbKey) || thumbnailUrl;
  }

  return {
    ...media,
    file_url: signedUrl || media.file_url,
    thumbnail_url: thumbnailUrl,
  } as ProjectMedia;
});
```

### Important Notes on `createSignedUrls` API

- The method is `createSignedUrls` (plural, with an 's') — it takes an array of paths
- Return type is `{ data: { signedUrl: string; path: string; error: string | null }[] | null; error: Error | null }`
- Each item in the returned array has `path` and `signedUrl` properties
- If a path doesn't exist, its entry will have a null signedUrl and an error string — it won't crash the whole batch
- The paths must be relative storage paths (same format stored in `file_url` column), NOT full URLs

### What NOT to Change in This File

- `uploadProjectMedia()` — still generates a single signed URL for the just-uploaded file. This is correct (it's always exactly 1 file).
- `updateMediaMetadata()` — generates a single signed URL after update. This is correct (always 1 file).
- `refreshMediaSignedUrl()` — generates URLs for a single media item being refreshed. This is correct (always 1 file, called on image load error).
- `deleteProjectMedia()` — no signed URL involved.
- The function signature of `getProjectMediaList()` — must remain identical. Same params in, same `ProjectMedia[]` out.

## Validation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Navigate to a project with 10+ photos
- [ ] **Field Media page:** Gallery loads and all photos display correctly
- [ ] Open browser DevTools → Network tab → filter by `sign`
- [ ] Confirm you see 1 batch request (or 2 if videos exist) instead of N individual requests
- [ ] Video thumbnails still display in gallery
- [ ] Click a photo to open detail view — photo displays correctly
- [ ] Image refresh on error still works (the `handleImageError` path in the gallery uses `refreshMediaSignedUrl` which is unchanged)
- [ ] Report generation still works (it uses the edge function's own signed URL generation, unrelated)
- [ ] **Documents → All tab:** Photo thumbnails still display (uses timeline hotfix, separate path — confirm no regression)
- [ ] **Documents → Photos & Videos tab:** Gallery still loads correctly (this tab uses `ProjectMediaGallery` → `useProjectMedia` → `getProjectMediaList` — the path you just changed)

## Performance Impact

| Scenario | Before | After |
|----------|--------|-------|
| 10 photos, 0 videos | 10 network calls | 1 network call |
| 30 photos, 5 videos | 35 network calls | 2 network calls |
| 50 photos, 10 videos | 60 network calls | 2 network calls |

This is the single highest-ROI performance improvement in the media system.
