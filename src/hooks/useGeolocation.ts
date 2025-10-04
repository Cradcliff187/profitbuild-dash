import { useState } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { toast } from 'sonner';

interface Coordinates {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
}

interface UseGeolocationResult {
  getLocation: () => Promise<Coordinates | null>;
  coordinates: Coordinates | null;
  isLoading: boolean;
  permissionDenied: boolean;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook for getting device GPS location with Capacitor Geolocation API
 */
export function useGeolocation(): UseGeolocationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const permission = await Geolocation.requestPermissions();
      
      if (permission.location === 'granted') {
        setPermissionDenied(false);
        return true;
      }

      setPermissionDenied(true);
      toast.error('Location permissions required', {
        description: 'Please enable location permissions in settings to add GPS data to photos',
      });
      return false;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      setPermissionDenied(true);
      return false;
    }
  };

  const getLocation = async (): Promise<Coordinates | null> => {
    setIsLoading(true);

    try {
      // Check permissions first
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          return null;
        }
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      const coords: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude,
        accuracy: position.coords.accuracy,
      };

      setCoordinates(coords);
      setPermissionDenied(false);
      return coords;
    } catch (error) {
      const err = error as Error;
      console.error('Error getting location:', error);
      
      if (err.message.includes('permission')) {
        setPermissionDenied(true);
        toast.error('Location access denied', {
          description: 'Enable location services to add GPS data to photos',
        });
      } else {
        toast.error('Failed to get location', {
          description: err.message,
        });
      }
      
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
    requestPermission,
  };
}
