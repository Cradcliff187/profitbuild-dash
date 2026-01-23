# Reverse Geocoding Implementation Specification

## Overview

Convert GPS coordinates to human-readable addresses using OpenStreetMap Nominatim (free, no API key required). This replaces the current behavior where `location_name` is set to raw coordinates like `"39.123456, -84.567890"`.

**Goal**: Field workers see friendly addresses like `"123 Main St, Covington, KY"` instead of GPS coordinates.

---

## Current State Analysis

### How `location_name` is Currently Set

| File | Current Behavior |
|------|------------------|
| `src/pages/FieldPhotoCapture.tsx` | Line ~47: `setLocationName(\`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}\`)` |
| `src/pages/BidPhotoCapture.tsx` | Line ~47: `setLocationName(\`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}\`)` |
| `src/pages/BidVideoCapture.tsx` | Line ~95: `const locationName = coordinates ? \`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}\` : undefined` |
| `src/pages/FieldVideoCapture.tsx` | Does NOT set `location_name` at all - **BUG** |

### Upload Flow

1. Capture flows call `useGeolocation().getLocation()` to get coordinates
2. `location_name` is set to raw coordinate string
3. Upload hooks pass `locationName` to `uploadProjectMedia()`
4. Database stores in `project_media.location_name` column (TEXT)

---

## Implementation Plan

### Phase 1: Create Reverse Geocoding Hook

**New File**: `src/hooks/useReverseGeocode.ts`

```typescript
import { useState, useCallback, useRef } from 'react';

interface ReverseGeocodeResult {
  displayName: string;      // Full address: "123 Main St, Covington, Kenton County, Kentucky, 41011, USA"
  shortName: string;        // Short: "123 Main St, Covington, KY"
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface UseReverseGeocodeResult {
  reverseGeocode: (lat: number, lng: number) => Promise<ReverseGeocodeResult | null>;
  isLoading: boolean;
  error: string | null;
  lastResult: ReverseGeocodeResult | null;
}

// Simple in-memory cache to avoid redundant API calls
const geocodeCache = new Map<string, ReverseGeocodeResult>();

// Rate limiting: Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

/**
 * Hook for reverse geocoding GPS coordinates to human-readable addresses
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * 
 * Rate limit: 1 request per second (enforced by this hook)
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */
export function useReverseGeocode(): UseReverseGeocodeResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ReverseGeocodeResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reverseGeocode = useCallback(async (
    lat: number,
    lng: number
  ): Promise<ReverseGeocodeResult | null> => {
    // Validate coordinates
    if (!isValidCoordinate(lat, lng)) {
      console.warn('[ReverseGeocode] Invalid coordinates:', { lat, lng });
      return null;
    }

    // Round to 6 decimal places for cache key (about 0.1m precision)
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

    // Check cache first
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey)!;
      setLastResult(cached);
      return cached;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Enforce rate limit
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }
      lastRequestTime = Date.now();

      // Call Nominatim API
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('lat', lat.toString());
      url.searchParams.set('lon', lng.toString());
      url.searchParams.set('format', 'json');
      url.searchParams.set('addressdetails', '1');

      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
        headers: {
          // Required by Nominatim usage policy
          'User-Agent': 'RCGWork/1.0 (construction-management-app)',
        },
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const result = parseNominatimResponse(data);
      
      // Cache the result
      geocodeCache.set(cacheKey, result);
      setLastResult(result);
      
      return result;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, not an error
        return null;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Geocoding failed';
      console.error('[ReverseGeocode] Error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    reverseGeocode,
    isLoading,
    error,
    lastResult,
  };
}

/**
 * Parse Nominatim response into our standardized format
 */
function parseNominatimResponse(data: any): ReverseGeocodeResult {
  const address = data.address || {};
  
  // Extract components
  const houseNumber = address.house_number || '';
  const road = address.road || address.street || '';
  const city = address.city || address.town || address.village || address.municipality || '';
  const state = address.state || '';
  const stateAbbrev = getStateAbbreviation(state);
  const postalCode = address.postcode || '';
  const country = address.country || '';

  // Build street address
  const streetParts = [houseNumber, road].filter(Boolean);
  const street = streetParts.join(' ');

  // Build short name: "123 Main St, Covington, KY"
  const shortParts = [street, city, stateAbbrev].filter(Boolean);
  const shortName = shortParts.join(', ');

  // Full display name from API or build our own
  const displayName = data.display_name || [street, city, state, postalCode, country].filter(Boolean).join(', ');

  return {
    displayName,
    shortName: shortName || displayName,
    street: street || undefined,
    city: city || undefined,
    state: state || undefined,
    postalCode: postalCode || undefined,
    country: country || undefined,
  };
}

/**
 * Convert full state name to abbreviation (US states only)
 */
function getStateAbbreviation(state: string): string {
  const stateMap: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
  };
  return stateMap[state] || state;
}

/**
 * Validate latitude and longitude
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clear the geocode cache (useful for testing)
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
```

---

### Phase 2: Update Capture Flows

#### 2.1 FieldPhotoCapture.tsx

**Location**: `src/pages/FieldPhotoCapture.tsx`

**Changes**:

1. Import the new hook:
```typescript
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
```

2. Add hook to component:
```typescript
const { reverseGeocode, isLoading: isGeocoding } = useReverseGeocode();
```

3. Replace the `useEffect` that sets `locationName` (around line 45-48):

**BEFORE**:
```typescript
useEffect(() => {
  if (coordinates) {
    setLocationName(`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`);
    setGpsAge(Date.now() - coordinates.timestamp);
  }
}, [coordinates]);
```

**AFTER**:
```typescript
useEffect(() => {
  if (coordinates) {
    setGpsAge(Date.now() - coordinates.timestamp);
    
    // Reverse geocode to get human-readable address
    reverseGeocode(coordinates.latitude, coordinates.longitude).then((result) => {
      if (result) {
        setLocationName(result.shortName);
      } else {
        // Fallback to coordinates if geocoding fails
        setLocationName(`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`);
      }
    });
  }
}, [coordinates, reverseGeocode]);
```

4. Update GPS display in the UI to show geocoding state (optional enhancement):

Find the GPS display section and update to show loading state:
```typescript
{isLoadingLocation ? (
  <span>Getting location...</span>
) : isGeocoding ? (
  <span>Getting address...</span>
) : coordinates ? (
  <span className="truncate max-w-[200px]">
    {locationName || `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`}
  </span>
) : (
  <span className="text-warning">GPS unavailable</span>
)}
```

---

#### 2.2 BidPhotoCapture.tsx

**Location**: `src/pages/BidPhotoCapture.tsx`

**Changes**: Same pattern as FieldPhotoCapture.tsx

1. Import the hook
2. Add hook to component
3. Replace the `useEffect` with geocoding version
4. Optionally update UI to show geocoding state

---

#### 2.3 FieldVideoCapture.tsx

**Location**: `src/pages/FieldVideoCapture.tsx`

**Changes**:

1. Import the hook:
```typescript
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
```

2. Add hook and state:
```typescript
const { reverseGeocode } = useReverseGeocode();
const [locationName, setLocationName] = useState<string>('');
```

3. Add `useEffect` to geocode when coordinates change:
```typescript
useEffect(() => {
  if (coordinates) {
    reverseGeocode(coordinates.latitude, coordinates.longitude).then((result) => {
      if (result) {
        setLocationName(result.shortName);
      } else {
        setLocationName(`${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`);
      }
    });
  }
}, [coordinates, reverseGeocode]);
```

4. Update `handleUploadAndContinue` to use `locationName`:

**Find the upload call and ensure it passes locationName**:
```typescript
await upload({
  file,
  caption: videoCaption,
  latitude: coordinates?.latitude,
  longitude: coordinates?.longitude,
  altitude: coordinates?.altitude,
  locationName: locationName || undefined,  // ADD THIS LINE
  uploadSource: 'camera',
  duration,
});
```

---

#### 2.4 BidVideoCapture.tsx

**Location**: `src/pages/BidVideoCapture.tsx`

**Changes**:

1. Import the hook
2. Add state for `locationName`
3. Add `useEffect` to geocode coordinates
4. Replace inline coordinate string with `locationName` state in upload call:

**BEFORE** (around line 95):
```typescript
const locationName = coordinates
  ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
  : undefined;
```

**AFTER**: Remove this line entirely, use the state variable instead.

---

### Phase 3: Update Display Components (Optional Enhancement)

#### 3.1 PhotoLightbox.tsx

**Location**: `src/components/PhotoLightbox.tsx`

Currently shows raw coordinates. Update to prefer `location_name`:

**Find** (around line with MapPin):
```typescript
{currentPhoto.latitude && currentPhoto.longitude && (
  <div className="flex items-center gap-1.5">
    <MapPin className="h-3.5 w-3.5" />
    <span>
      {currentPhoto.latitude.toFixed(6)}, {currentPhoto.longitude.toFixed(6)}
    </span>
  </div>
)}
```

**Replace with**:
```typescript
{(currentPhoto.location_name || (currentPhoto.latitude && currentPhoto.longitude)) && (
  <div className="flex items-center gap-1.5">
    <MapPin className="h-3.5 w-3.5" />
    <span className="truncate max-w-[200px]">
      {currentPhoto.location_name || 
        `${currentPhoto.latitude?.toFixed(6)}, ${currentPhoto.longitude?.toFixed(6)}`}
    </span>
  </div>
)}
```

#### 3.2 VideoLightbox.tsx

**Location**: `src/components/VideoLightbox.tsx`

Same pattern - prefer `location_name` over raw coordinates while keeping the Google Maps link functional:

```typescript
{currentVideo.latitude && currentVideo.longitude && (
  <div className="flex items-center gap-2">
    <MapPin className="h-4 w-4 text-white/60" />
    <div>
      <div className="text-white/60 text-xs">Location</div>
      <a
        href={`https://www.google.com/maps?q=${currentVideo.latitude},${currentVideo.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline truncate max-w-[200px] block"
      >
        {currentVideo.location_name || 
          `${currentVideo.latitude.toFixed(6)}, ${currentVideo.longitude.toFixed(6)}`}
      </a>
    </div>
  </div>
)}
```

---

## Testing Checklist

### Unit Tests
- [ ] `useReverseGeocode` returns valid address for known coordinates
- [ ] `useReverseGeocode` handles API errors gracefully
- [ ] `useReverseGeocode` respects rate limiting
- [ ] `useReverseGeocode` uses cache for repeated coordinates
- [ ] State abbreviation conversion works correctly

### Integration Tests
- [ ] FieldPhotoCapture shows human-readable address after GPS lock
- [ ] BidPhotoCapture shows human-readable address after GPS lock
- [ ] FieldVideoCapture passes locationName to upload
- [ ] BidVideoCapture passes locationName to upload
- [ ] Uploaded media has correct `location_name` in database
- [ ] Lightbox displays `location_name` when available
- [ ] Google Maps link still works in VideoLightbox

### Edge Cases
- [ ] Handles coordinates with no address (middle of ocean)
- [ ] Handles rate limit gracefully (rapid captures)
- [ ] Falls back to coordinates if API unavailable
- [ ] Works offline (shows coordinates, not error)
- [ ] Non-US addresses format correctly

---

## API Reference

### OpenStreetMap Nominatim

**Endpoint**: `https://nominatim.openstreetmap.org/reverse`

**Parameters**:
- `lat`: Latitude
- `lon`: Longitude  
- `format`: `json`
- `addressdetails`: `1` (include address breakdown)

**Rate Limit**: 1 request per second (enforced in hook)

**Usage Policy**: https://operations.osmfoundation.org/policies/nominatim/

**Required Header**: `User-Agent` identifying your application

**Example Response**:
```json
{
  "display_name": "123 Main Street, Covington, Kenton County, Kentucky, 41011, United States",
  "address": {
    "house_number": "123",
    "road": "Main Street",
    "city": "Covington",
    "county": "Kenton County",
    "state": "Kentucky",
    "postcode": "41011",
    "country": "United States",
    "country_code": "us"
  }
}
```

---

## Files to Create/Modify

| Action | File Path |
|--------|-----------|
| **CREATE** | `src/hooks/useReverseGeocode.ts` |
| Modify | `src/pages/FieldPhotoCapture.tsx` |
| Modify | `src/pages/BidPhotoCapture.tsx` |
| Modify | `src/pages/FieldVideoCapture.tsx` |
| Modify | `src/pages/BidVideoCapture.tsx` |
| Modify (optional) | `src/components/PhotoLightbox.tsx` |
| Modify (optional) | `src/components/VideoLightbox.tsx` |

---

## Rollback Plan

If issues arise, the changes are minimal and reversible:

1. Remove `useReverseGeocode` import from capture pages
2. Restore original `useEffect` that sets `locationName` to coordinates
3. The `useReverseGeocode.ts` hook can remain (unused) or be deleted

Existing data with coordinate strings in `location_name` will continue to work.

---

## Future Enhancements

1. **Project Address Integration**: For photos taken at project sites, could compare GPS to project address and use project address if within ~100m
2. **Offline Caching**: Use IndexedDB to cache geocode results for offline viewing
3. **Batch Geocoding**: For existing media without addresses, run a background migration
4. **Address Validation**: Warn if GPS location doesn't match expected project location
