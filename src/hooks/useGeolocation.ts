import { useState } from 'react';
import { toast } from 'sonner';

interface Coordinates {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  timestamp: number;
}

interface UseGeolocationResult {
  getLocation: () => Promise<Coordinates | null>;
  coordinates: Coordinates | null;
  isLoading: boolean;
  permissionDenied: boolean;
}

/**
 * Hook for getting device GPS location using browser Geolocation API
 * Works on all modern mobile browsers (iOS Safari, Android Chrome)
 */
export function useGeolocation(): UseGeolocationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const getLocation = async (): Promise<Coordinates | null> => {
    setIsLoading(true);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: Coordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            };

            setCoordinates(coords);
            setPermissionDenied(false);
            resolve(coords);
          },
          (error) => {
            console.error('Browser geolocation error:', error);
            
            if (error.code === error.PERMISSION_DENIED) {
              setPermissionDenied(true);
              toast.error('Location access denied', {
                description: 'Enable location services to add GPS data',
              });
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              toast.error('Location unavailable', {
                description: 'Unable to determine your position',
              });
            } else if (error.code === error.TIMEOUT) {
              toast.error('Location request timed out', {
                description: 'Please try again',
              });
            } else {
              toast.error('Failed to get location');
            }
            
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error getting location:', error);
      toast.error('Failed to get location', {
        description: err.message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getLocation,
    coordinates,
    isLoading,
    permissionDenied,
  };
}
