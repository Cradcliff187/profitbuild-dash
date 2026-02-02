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
  coordinates: { latitude: number; longitude: number; altitude?: number | null; accuracy?: number; timestamp?: number } | null;
  /** Call this immediately when capture starts to get GPS + geocode in parallel */
  startLocationCapture: () => void;
  /** Returns a fresh metadata snapshot for the upload call */
  getMetadataForUpload: () => {
    latitude?: number;
    longitude?: number;
    altitude?: number | null;
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
          const result = await reverseGeocode(coords.latitude, coords.longitude);
          if (result) {
            setLocationName(result.shortName);
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
    altitude: coordinates?.altitude ?? undefined,
    locationName: locationName || undefined,
    takenAt: new Date().toISOString(),
    deviceModel: navigator.userAgent || 'unknown',
    uploadSource: 'camera' as const,
  }), [coordinates, locationName]);

  return {
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    altitude: coordinates?.altitude ?? undefined,
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
