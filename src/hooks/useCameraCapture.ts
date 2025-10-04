import { useState } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { toast } from 'sonner';

interface CameraPermissions {
  camera: boolean;
  photos: boolean;
}

interface UseCameraCaptureResult {
  capturePhoto: (source?: CameraSource) => Promise<Photo | null>;
  isCapturing: boolean;
  permissionsGranted: CameraPermissions | null;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for capturing photos with Capacitor Camera API
 */
export function useCameraCapture(): UseCameraCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState<CameraPermissions | null>(null);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const permissions = await Camera.requestPermissions({
        permissions: ['camera', 'photos'],
      });

      const granted = {
        camera: permissions.camera === 'granted',
        photos: permissions.photos === 'granted',
      };

      setPermissionsGranted(granted);

      if (!granted.camera || !granted.photos) {
        toast.error('Camera permissions required', {
          description: 'Please enable camera and photo permissions in settings',
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      toast.error('Failed to request permissions');
      return false;
    }
  };

  const capturePhoto = async (
    source: CameraSource = CameraSource.Camera
  ): Promise<Photo | null> => {
    setIsCapturing(true);

    try {
      // Check permissions first
      if (!permissionsGranted) {
        const granted = await requestPermissions();
        if (!granted) {
          return null;
        }
      }

      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source,
        quality: 90,
        allowEditing: false,
        saveToGallery: source === CameraSource.Camera,
        correctOrientation: true,
      });

      return photo;
    } catch (error) {
      const err = error as Error;
      if (err.message !== 'User cancelled photos app') {
        console.error('Error capturing photo:', error);
        toast.error('Failed to capture photo', {
          description: err.message,
        });
      }
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    capturePhoto,
    isCapturing,
    permissionsGranted,
    requestPermissions,
  };
}
