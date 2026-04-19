# 08 — Capture Component Consolidation

## Priority: Eighth (Maintenance Improvement)
## Risk Level: Medium-High — refactoring 4 active pages into shared component
## Estimated Time: 90-120 minutes
## Depends On: 02 (metadata fields are correct before extracting)

---

## Context

Four capture pages share ~85-90% identical code:
- `src/pages/FieldPhotoCapture.tsx` — project photo capture
- `src/pages/BidPhotoCapture.tsx` — bid photo capture
- `src/pages/FieldVideoCapture.tsx` — project video capture
- `src/pages/BidVideoCapture.tsx` — bid video capture

Shared logic includes: GPS capture, reverse geocoding, caption prompt system, voice caption modal, skip tracking, file size warnings, upload-and-continue flow.

The differences are:
1. Upload hook used (`useProjectMediaUpload` vs `useBidMediaUpload`)
2. Upload parameter shape (camelCase vs snake_case — project uses `locationName`, bid uses `location_name`)
3. Navigation targets after upload
4. `BidVideoCapture` has audio transcription (auto-caption from video audio)
5. Context ID source (`projectId` from route params vs `bidId` from route params)

## Strategy: Extract Shared Hooks, Not a Shared Page Component

A full shared page component would be brittle — too many conditional branches for photo vs video and project vs bid. Instead, extract the **shared behaviors** as custom hooks that each page can compose:

1. `useCaptureMetadata` — GPS, reverse geocoding, timestamps, device model
2. `useCaptionFlow` — caption prompts, skip tracking, voice/type modals, preferences

Each page remains its own file but becomes much shorter — importing shared hooks instead of reimplementing the logic.

## Files to CREATE

### File 1: `src/hooks/useCaptureMetadata.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';

interface CaptureMetadata {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  locationName: string | null;
  takenAt: string;
  deviceModel: string;
  uploadSource: 'camera' | 'gallery' | 'web';
  isLoadingLocation: boolean;
  isGeocoding: boolean;
  gpsAge: number | null;
  coordinates: { latitude: number; longitude: number; altitude?: number } | null;
  /** Call this immediately when capture starts to get GPS + geocode in parallel */
  startLocationCapture: () => void;
  /** Returns a fresh metadata snapshot for the upload call */
  getMetadataForUpload: () => {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    locationName?: string;
    takenAt: string;
    deviceModel: string;
    uploadSource: 'camera';
  };
}

/**
 * Shared hook for capture metadata: GPS, reverse geocoding, timestamps, device info.
 * Used by both photo and video capture pages (project and bid).
 */
export function useCaptureMetadata(): CaptureMetadata {
  const { getLocation, coordinates, isLoading: isLoadingLocation } = useGeolocation();
  const { reverseGeocode } = useReverseGeocode();
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [gpsAge, setGpsAge] = useState<number | null>(null);
  const [gpsTimestamp, setGpsTimestamp] = useState<number | null>(null);

  // Track GPS freshness
  useEffect(() => {
    if (coordinates) {
      setGpsTimestamp(Date.now());
    }
  }, [coordinates]);

  useEffect(() => {
    if (!gpsTimestamp) {
      setGpsAge(null);
      return;
    }
    const interval = setInterval(() => {
      setGpsAge(Date.now() - gpsTimestamp);
    }, 1000);
    return () => clearInterval(interval);
  }, [gpsTimestamp]);

  const startLocationCapture = useCallback(async () => {
    try {
      const coords = await getLocation();
      if (coords?.latitude && coords?.longitude) {
        setIsGeocoding(true);
        try {
          const address = await reverseGeocode(coords.latitude, coords.longitude);
          if (address) {
            setLocationName(address);
          }
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
        } finally {
          setIsGeocoding(false);
        }
      }
    } catch (error) {
      console.warn('Location capture failed:', error);
    }
  }, [getLocation, reverseGeocode]);

  const getMetadataForUpload = useCallback(() => ({
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    altitude: coordinates?.altitude,
    locationName: locationName || undefined,
    takenAt: new Date().toISOString(),
    deviceModel: navigator.userAgent || 'unknown',
    uploadSource: 'camera' as const,
  }), [coordinates, locationName]);

  return {
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    altitude: coordinates?.altitude,
    locationName,
    takenAt: new Date().toISOString(),
    deviceModel: navigator.userAgent || 'unknown',
    uploadSource: 'camera',
    isLoadingLocation,
    isGeocoding,
    gpsAge,
    coordinates,
    startLocationCapture,
    getMetadataForUpload,
  };
}
```

### File 2: `src/hooks/useCaptionFlow.ts`

```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { showCaptionPrompt, CAPTION_PROMPTS } from '@/components/CaptionPromptToast';
import { getCaptionPreferences } from '@/utils/userPreferences';

interface CaptionFlowState {
  pendingCaption: string;
  setPendingCaption: (caption: string) => void;
  showCaptionModal: boolean;
  setShowCaptionModal: (show: boolean) => void;
  showVoiceCaptionModal: boolean;
  setShowVoiceCaptionModal: (show: boolean) => void;
  skipCount: number;
  captureCount: number;
  /** Call after successful capture to trigger caption prompt logic */
  onCaptureSuccess: (hasGps: boolean) => void;
  /** Call when user saves a caption (resets skip count) */
  onCaptionSaved: (caption: string) => void;
  /** Call when user skips caption (increments skip counter) */
  onCaptionSkipped: () => void;
  /** Call when voice caption is ready */
  onVoiceCaptionReady: (caption: string) => void;
}

/**
 * Shared hook for the caption prompt flow.
 * Handles progressive prompting, skip tracking, voice/type modal coordination.
 */
export function useCaptionFlow(): CaptionFlowState {
  const [pendingCaption, setPendingCaption] = useState('');
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showVoiceCaptionModal, setShowVoiceCaptionModal] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [captureCount, setCaptureCount] = useState(0);

  const onCaptureSuccess = useCallback(
    (hasGps: boolean) => {
      const newCaptureCount = captureCount + 1;
      setCaptureCount(newCaptureCount);

      const prefs = getCaptionPreferences();

      // Show caption prompt for first 3 captures, then back off
      const shouldPrompt = newCaptureCount <= 3 || prefs.alwaysPrompt;
      if (shouldPrompt && hasGps) {
        // Delay prompt to avoid overlapping with camera UI
        setTimeout(() => {
          const message =
            newCaptureCount === 1
              ? CAPTION_PROMPTS.firstCapture
              : CAPTION_PROMPTS.gpsAvailable;

          showCaptionPrompt({
            onVoiceClick: () => setShowVoiceCaptionModal(true),
            onTypeClick: () => setShowCaptionModal(true),
            message,
            duration: 5000,
          });
        }, 3000);
      }
    },
    [captureCount]
  );

  const onCaptionSkipped = useCallback(() => {
    const newSkipCount = skipCount + 1;
    setSkipCount(newSkipCount);

    if (newSkipCount >= 3 && newSkipCount % 3 === 0) {
      toast.info(CAPTION_PROMPTS.multipleSkips, { duration: 4000 });
    }
  }, [skipCount]);

  const onCaptionSaved = useCallback((caption: string) => {
    setPendingCaption(caption);
    setShowCaptionModal(false);
    setSkipCount(0);
    const wordCount = caption.split(/\s+/).filter((w) => w.length > 0).length;
    toast.success(`Caption saved (${wordCount} word${wordCount !== 1 ? 's' : ''})`);
  }, []);

  const onVoiceCaptionReady = useCallback((caption: string) => {
    setPendingCaption(caption);
    setShowVoiceCaptionModal(false);
    setSkipCount(0);
    const wordCount = caption.split(/\s+/).filter((w) => w.length > 0).length;
    toast.success(
      `Voice caption added (${wordCount} word${wordCount !== 1 ? 's' : ''})`
    );
  }, []);

  return {
    pendingCaption,
    setPendingCaption,
    showCaptionModal,
    setShowCaptionModal,
    showVoiceCaptionModal,
    setShowVoiceCaptionModal,
    skipCount,
    captureCount,
    onCaptureSuccess,
    onCaptionSaved,
    onCaptionSkipped,
    onVoiceCaptionReady,
  };
}
```

## Files to MODIFY

### Refactoring the Capture Pages

Each capture page should be updated to use the new hooks. Here's the pattern for `FieldPhotoCapture.tsx` — the others follow the same approach.

**Before (in FieldPhotoCapture.tsx):** ~50 lines of GPS state management, ~40 lines of caption prompt logic, ~20 lines of skip tracking.

**After:** Import the hooks and delegate:

```typescript
import { useCaptureMetadata } from '@/hooks/useCaptureMetadata';
import { useCaptionFlow } from '@/hooks/useCaptionFlow';

export default function FieldPhotoCapture() {
  const { id: projectId } = useParams<{ id: string }>();
  const { capturePhoto, isCapturing } = useCameraCapture();
  const { upload, isUploading, progress } = useProjectMediaUpload(projectId!);
  const metadata = useCaptureMetadata();
  const captions = useCaptionFlow();
  // ... rest of component uses metadata.coordinates, metadata.locationName,
  //     captions.pendingCaption, captions.onCaptureSuccess(hasGps), etc.
}
```

### CRITICAL: Do NOT refactor all 4 pages at once

Refactor ONE page at a time in this order:

1. `FieldPhotoCapture.tsx` — simplest case, project photo only
2. `BidPhotoCapture.tsx` — same as above but with snake_case upload params
3. `FieldVideoCapture.tsx` — adds duration extraction
4. `BidVideoCapture.tsx` — adds audio transcription (most complex)

After each page, validate that capture still works end-to-end before moving to the next.

### Handling the Upload Parameter Shape Difference

Project uploads use camelCase (`locationName`, `takenAt`, `deviceModel`).
Bid uploads use snake_case (`location_name`, `taken_at`, `device_model`).

The `getMetadataForUpload()` method returns camelCase. For bid pages, map at the call site:

```typescript
// In BidPhotoCapture
const meta = metadata.getMetadataForUpload();
await upload({
  bid_id: bidId,
  file,
  caption: captions.pendingCaption || undefined,
  latitude: meta.latitude,
  longitude: meta.longitude,
  altitude: meta.altitude,
  location_name: meta.locationName,
  taken_at: meta.takenAt,
  device_model: meta.deviceModel,
  upload_source: meta.uploadSource,
});
```

This keeps the hooks generic and the param mapping explicit at the call site.

## Validation Checklist (per page)

### FieldPhotoCapture
- [ ] Navigate to project → Field Media → Photo
- [ ] GPS acquires and shows address
- [ ] Capture photo → caption prompt appears after 3 seconds
- [ ] Type caption → save → "Caption saved" toast
- [ ] Upload & Continue → photo uploads with all metadata
- [ ] Skip caption 3 times → gentle reminder appears
- [ ] Voice caption works → caption populates

### BidPhotoCapture
- [ ] Navigate to bid → Media → Photo
- [ ] Same GPS/caption/upload flow works
- [ ] Check Supabase `bid_media` table: `taken_at`, `device_model`, `upload_source` populated

### FieldVideoCapture
- [ ] Navigate to project → Field Media → Video
- [ ] Record video → caption flow works
- [ ] Upload includes duration, metadata
- [ ] Both "Upload & Continue" and "Upload & Review" paths work

### BidVideoCapture
- [ ] Navigate to bid → Media → Video
- [ ] Record video → auto-transcription runs (if enabled)
- [ ] Caption from transcription appears
- [ ] Upload includes all metadata

## What NOT to Change

- The visual UI of any capture page — layout, buttons, styling remain identical
- The upload hooks (`useProjectMediaUpload`, `useBidMediaUpload`) — unchanged
- The camera capture hooks (`useCameraCapture`, `useVideoCapture`) — unchanged
- Route definitions — URLs stay the same
- The `CaptionPromptToast` component — unchanged
- The `QuickCaptionModal` and `VoiceCaptionModal` components — unchanged
