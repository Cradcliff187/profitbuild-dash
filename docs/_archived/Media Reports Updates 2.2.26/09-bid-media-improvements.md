# 09 — Bid Media Improvements

## Priority: Ninth
## Risk Level: Medium — changes storage strategy for bid media + adds offline support
## Estimated Time: 60-90 minutes
## Depends On: 03 (batch signed URL pattern established)

---

## Context

Two issues with bid media:

1. **Public URLs instead of signed URLs** — bid media stores full public URLs in `file_url`, meaning anyone with the URL can access the file permanently. Project media uses signed URLs with 7-day expiry.

2. **No offline queue** — project media has full IndexedDB-based offline queueing via `syncQueue.ts` + `backgroundSync.ts`. Bid media has zero offline support — uploads just fail if the network drops.

## Part A: Migrate Bid Media to Signed URLs

### Why This Matters

Bid photos often contain sensitive information (competitor site photos, pricing notes, property details). Public URLs with no expiration are a security gap.

### File 1: `src/hooks/useBidMediaUpload.ts`

**Current approach (public URL):**
```typescript
// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from(bucket)
  .getPublicUrl(uploadData.path);
// ...
file_url: publicUrl,
```

**Change to (relative path, like project media):**
```typescript
// Store the relative path (signed URLs generated on read)
// ...
file_url: uploadData.path,
```

The full change in context — find this block in the `upload` function:

```typescript
setProgress(70);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from(bucket)
  .getPublicUrl(uploadData.path);

setProgress(80);

// Create database record with all metadata
const { data: mediaData, error: dbError } = await supabase
  .from('bid_media')
  .insert({
    // ...
    file_url: publicUrl,
    // ...
```

**Replace with:**
```typescript
setProgress(70);

// Store relative path — signed URLs generated on read
// This matches the project media pattern for consistent security
const relativePath = uploadData.path;

setProgress(80);

// Create database record with all metadata
const { data: mediaData, error: dbError } = await supabase
  .from('bid_media')
  .insert({
    // ...
    file_url: relativePath,
    // ...
```

### File 2: `src/hooks/useBidMedia.ts`

This hook fetches bid media for display. It currently returns the data as-is (since `file_url` contains a full public URL). It now needs to generate signed URLs, matching the project media pattern.

**Find the query and add signed URL generation after it:**

```typescript
// After the Supabase query returns data, generate signed URLs
const mediaItems = data || [];

// Batch generate signed URLs
const imagePaths = mediaItems
  .filter((m) => !m.file_url?.startsWith('http'))  // Only process relative paths
  .map((m) => m.file_url);

const signedUrlMap = new Map<string, string>();

if (imagePaths.length > 0) {
  // Determine bucket based on file type
  // Bid media uses two buckets: 'bid-media' for images/videos, 'bid-documents' for documents
  const mediaPaths = mediaItems
    .filter((m) => !m.file_url?.startsWith('http') && m.file_type !== 'document')
    .map((m) => m.file_url);
  const docPaths = mediaItems
    .filter((m) => !m.file_url?.startsWith('http') && m.file_type === 'document')
    .map((m) => m.file_url);

  if (mediaPaths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from('bid-media')
      .createSignedUrls(mediaPaths, 604800); // 7 days
    signedUrls?.forEach((item) => {
      if (item.signedUrl && item.path) {
        signedUrlMap.set(item.path, item.signedUrl);
      }
    });
  }

  if (docPaths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from('bid-documents')
      .createSignedUrls(docPaths, 604800); // 7 days
    signedUrls?.forEach((item) => {
      if (item.signedUrl && item.path) {
        signedUrlMap.set(item.path, item.signedUrl);
      }
    });
  }
}

// Map signed URLs to media items (preserving existing full URLs for backward compat)
const mediaWithUrls = mediaItems.map((media) => ({
  ...media,
  file_url: signedUrlMap.get(media.file_url) || media.file_url,
}));
```

### Backward Compatibility

Existing bid media records have full public URLs stored in `file_url`. The code above handles this with the `!m.file_url?.startsWith('http')` check — if it's already a full URL, it's used as-is. New records will store relative paths and get signed URLs on read.

This means old and new records coexist seamlessly. No data migration required.

## Part B: Add Offline Queue for Bid Media

### File 3: `src/utils/syncQueue.ts`

Add a new operation type for bid media:

**Find the `QueuedOperation` type (or the type that defines valid `type` values):**

Add `'bid_media_upload'` to the union:
```typescript
type: 'clock_out' | 'edit_entry' | 'delete_entry' | 'media_upload' | 'bid_media_upload';
```

**Add a new queue function (after the existing `addMediaToQueue`):**

```typescript
export const addBidMediaToQueue = async (
  file: File,
  metadata: {
    bidId: string;
    caption?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
    locationName?: string;
    takenAt?: string;
    deviceModel?: string;
    uploadSource?: string;
    duration?: number;
  }
): Promise<string> => {
  const base64 = await fileToBase64(file);

  const operation: Omit<QueuedOperation, 'id' | 'retryCount' | 'status'> = {
    type: 'bid_media_upload',
    timestamp: Date.now(),
    payload: {
      fileData: base64,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      ...metadata,
    },
  };

  await addToQueue(operation);
  const queue = await getQueue();
  const queuedOp = queue.find(
    (op) => op.timestamp === operation.timestamp && op.type === 'bid_media_upload'
  );
  return queuedOp?.id || crypto.randomUUID();
};
```

### File 4: `src/utils/backgroundSync.ts`

**Add a handler for `bid_media_upload` in the `processQueue` switch:**

After the existing `case 'media_upload':` block, add:

```typescript
case 'bid_media_upload':
  await syncBidMediaUpload(operation);
  break;
```

**Add the sync function (after the existing `syncMediaUpload`):**

```typescript
const syncBidMediaUpload = async (operation: QueuedOperation) => {
  const { payload } = operation;

  try {
    const file = await base64ToFile(
      payload.fileData,
      payload.fileName,
      payload.fileType
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Compress images
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      const { compressImage } = await import('@/utils/imageCompression');
      fileToUpload = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        targetSizeKB: 500,
      });
    }

    const fileType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'document';
    const bucket = fileType === 'document' ? 'bid-documents' : 'bid-media';

    // Generate storage path
    const { generateStoragePath } = await import('@/utils/mediaMetadata');
    const storagePath = generateStoragePath(user.id, payload.bidId, fileToUpload.name);

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileToUpload, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    // Create database record with relative path
    const { error: dbError } = await supabase
      .from('bid_media')
      .insert({
        bid_id: payload.bidId,
        file_url: uploadData.path,
        file_name: fileToUpload.name,
        mime_type: fileToUpload.type,
        file_type: fileType,
        file_size: fileToUpload.size,
        caption: payload.caption || null,
        description: payload.description || null,
        duration: payload.duration || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        altitude: payload.altitude || null,
        location_name: payload.locationName || null,
        taken_at: payload.takenAt || null,
        device_model: payload.deviceModel || null,
        upload_source: payload.uploadSource || 'web',
        uploaded_by: user.id,
      });

    if (dbError) {
      // Rollback storage
      await supabase.storage.from(bucket).remove([uploadData.path]);
      throw dbError;
    }

    console.log('📸 Bid media synced');
  } catch (error) {
    console.error('Failed to sync bid media:', error);
    throw error;
  }
};
```

### File 5: `src/hooks/useBidMediaUpload.ts`

Add offline detection (matching the project media pattern):

**At the beginning of the `upload` function, after auth check and file compression, add:**

```typescript
// Check if online
if (!navigator.onLine) {
  console.log('📴 Offline - queueing bid media upload');

  const { addBidMediaToQueue } = await import('@/utils/syncQueue');
  await addBidMediaToQueue(fileToUpload, {
    bidId: params.bid_id,
    caption: params.caption,
    description: params.description,
    latitude: params.latitude,
    longitude: params.longitude,
    altitude: params.altitude,
    locationName: params.location_name,
    takenAt: params.taken_at,
    deviceModel: params.device_model,
    uploadSource: params.upload_source,
    duration: params.duration,
  });

  toast.info('Queued for upload', {
    description: 'Media will upload automatically when connection is restored',
  });

  setIsUploading(false);
  setProgress(0);
  return null;  // Return null like the project media hook does for offline
}
```

## Validation Checklist

### Part A: Signed URLs
- [ ] Navigate to a bid → Media tab
- [ ] Upload a new photo
- [ ] Check Supabase `bid_media` table: `file_url` should be a relative path (like `userId/bidId/timestamp-photo.jpg`), NOT a full `https://` URL
- [ ] Photo displays correctly in the bid media gallery (signed URL generated on read)
- [ ] Existing bid media with full public URLs still displays (backward compat)
- [ ] Upload a document → check it uses `bid-documents` bucket correctly

### Part B: Offline Queue
- [ ] Enable airplane mode / disable network
- [ ] Navigate to bid → capture photo
- [ ] Upload → should show "Queued for upload" toast instead of error
- [ ] Re-enable network
- [ ] Check that queued media uploads automatically (check console logs for "Bid media synced")
- [ ] Check Supabase `bid_media` table: record exists with correct metadata

## What NOT to Change

- Project media upload flow — completely separate, already works
- Existing bid media records — they keep their public URLs, displayed via backward compat check
- The `bid_media` database schema — no column changes needed
- Storage bucket policies — public read may still be enabled on bid-media bucket; that's fine for backward compat
