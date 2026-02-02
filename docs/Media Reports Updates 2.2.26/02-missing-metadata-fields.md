# 02 — Missing Metadata Fields on Field Captures

## Priority: Second (Additive Only)
## Risk Level: Very Low — adding parameters that already exist in the upload function signature
## Estimated Time: 10 minutes
## Depends On: 01 (dead code removed)

---

## Context

The upload utility `uploadProjectMedia()` in `src/utils/projectMedia.ts` accepts `deviceModel`, `takenAt`, and `uploadSource` parameters. The bid capture pages pass all three. The field (project) capture pages do not, creating inconsistent metadata in the database.

This causes `taken_at` to be NULL for all project media captured from the field, which degrades timeline sorting in reports and the gallery (falls back to `created_at` which is the server insert time, not when the photo was actually taken).

## Current State (verified from code)

| Field | FieldPhotoCapture | FieldVideoCapture | BidPhotoCapture | BidVideoCapture |
|-------|:-:|:-:|:-:|:-:|
| caption | ✅ | ✅ | ✅ | ✅ |
| latitude/longitude/altitude | ✅ | ✅ | ✅ | ✅ |
| locationName | ✅ | ✅ | ✅ | ✅ |
| **takenAt** | ❌ | ❌ | ✅ | ✅ |
| **deviceModel** | ❌ | ❌ | ✅ | ✅ |
| **uploadSource** | ❌ | ✅ `'camera'` | ✅ `'camera'` | ✅ `'camera'` |
| duration | n/a | ✅ | n/a | ✅ |

## Changes Required

### File 1: `src/pages/FieldPhotoCapture.tsx`

**Location:** The `handleUploadAndContinue` function, inside the `await upload({...})` call.

**Current code:**
```typescript
await upload({
  file,
  caption: pendingCaption || '',
  description: '',
  locationName: locationName,
  latitude: coordinates?.latitude,
  longitude: coordinates?.longitude,
  altitude: coordinates?.altitude,
});
```

**Change to:**
```typescript
await upload({
  file,
  caption: pendingCaption || '',
  description: '',
  locationName: locationName,
  latitude: coordinates?.latitude,
  longitude: coordinates?.longitude,
  altitude: coordinates?.altitude,
  takenAt: new Date().toISOString(),
  deviceModel: navigator.userAgent || undefined,
  uploadSource: 'camera',
});
```

**Why this is safe:** The `upload` function is `useProjectMediaUpload.upload()` which accepts `Omit<UploadProjectMediaParams, 'projectId'>`. All three fields (`takenAt`, `deviceModel`, `uploadSource`) are already optional properties on `UploadProjectMediaParams`. We are only providing values that were previously `undefined`.

### File 2: `src/pages/FieldVideoCapture.tsx`

**Location:** There are TWO upload calls — `handleUploadAndContinue` and `handleUploadAndReview`. Both need the same change.

**Current code (both functions):**
```typescript
await upload({
  file,
  caption: videoCaption,
  latitude: coordinates?.latitude,
  longitude: coordinates?.longitude,
  altitude: coordinates?.altitude,
  locationName: locationName || undefined,
  uploadSource: 'camera',
  duration,
});
```

**Change to (both functions):**
```typescript
await upload({
  file,
  caption: videoCaption,
  latitude: coordinates?.latitude,
  longitude: coordinates?.longitude,
  altitude: coordinates?.altitude,
  locationName: locationName || undefined,
  takenAt: new Date().toISOString(),
  deviceModel: navigator.userAgent || undefined,
  uploadSource: 'camera',
  duration,
});
```

**Note:** `uploadSource` was already present on FieldVideoCapture. Only `takenAt` and `deviceModel` are new.

## What NOT to Change

- `src/utils/projectMedia.ts` — The `uploadProjectMedia()` function already handles all these fields. No changes needed.
- `src/hooks/useProjectMediaUpload.ts` — Already passes through all params. No changes needed.
- `src/pages/BidPhotoCapture.tsx` — Already correct.
- `src/pages/BidVideoCapture.tsx` — Already correct.
- Database schema — `project_media` table already has `taken_at`, `device_model`, `upload_source` columns.

## Validation Checklist

- [ ] `npx tsc --noEmit` passes with no type errors
- [ ] Navigate to a project → Field Media → Photo Capture
- [ ] Take a photo, upload it
- [ ] Check Supabase `project_media` table: new record should have `taken_at`, `device_model`, and `upload_source` populated (not NULL)
- [ ] Navigate to Field Media → Video Capture
- [ ] Record a video, upload via "Upload & Continue"
- [ ] Check Supabase: new record should have `taken_at` and `device_model` populated
- [ ] Existing media items are unaffected (their NULLs remain — this is expected)
- [ ] Gallery timeline sorting still works correctly

## Future Consideration

Existing project media records with NULL `taken_at` could be backfilled with their `created_at` values via a one-time migration:
```sql
UPDATE project_media
SET taken_at = created_at
WHERE taken_at IS NULL;
```
This is optional and can be done anytime. It would improve timeline accuracy for historical records.
