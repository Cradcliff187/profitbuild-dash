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

