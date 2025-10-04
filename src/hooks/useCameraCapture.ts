import { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { toast } from 'sonner';
import { isWebPlatform } from '@/utils/platform';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      // Try Capacitor Camera API first (native platforms)
      if (!isWebPlatform()) {
        try {
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
        } catch (capacitorError) {
          console.warn('Capacitor Camera failed, trying web fallback:', capacitorError);
        }
      }

      // Web fallback using file input
      return new Promise((resolve) => {
        // Create hidden file input if it doesn't exist
        if (!fileInputRef.current) {
          fileInputRef.current = document.createElement('input');
          fileInputRef.current.type = 'file';
          fileInputRef.current.accept = 'image/*';
          fileInputRef.current.capture = 'environment';
        }

        const handleFileSelect = (event: Event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const webPath = reader.result as string;
              const photo: Photo = {
                webPath,
                format: file.type.split('/')[1] || 'jpeg',
                saved: false,
              };
              resolve(photo);
            };
            reader.onerror = () => {
              toast.error('Failed to read image file');
              resolve(null);
            };
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
          
          // Clean up
          fileInputRef.current!.removeEventListener('change', handleFileSelect);
          fileInputRef.current!.value = '';
        };

        fileInputRef.current.addEventListener('change', handleFileSelect);
        fileInputRef.current.click();
      });
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
