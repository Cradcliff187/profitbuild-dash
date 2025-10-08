import { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { toast } from 'sonner';
import { isWebPlatform, isIOSDevice } from '@/utils/platform';

interface CameraPermissions {
  camera: boolean;
  photos: boolean;
}

interface UseVideoCaptureResult {
  startRecording: (source?: CameraSource) => Promise<Photo | null>;
  isRecording: boolean;
  permissionsGranted: CameraPermissions | null;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for capturing videos with Capacitor Camera API
 * Note: Capacitor Camera API doesn't support duration tracking during recording.
 * Duration tracking must be handled in the UI component using timers.
 */
export function useVideoCapture(): UseVideoCaptureResult {
  const [isRecording, setIsRecording] = useState(false);
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

  const startRecording = async (
    source: CameraSource = CameraSource.Camera
  ): Promise<Photo | null> => {
    setIsRecording(true);

    try {
      // Try Capacitor Camera API first (native platforms)
      if (!isWebPlatform()) {
        try {
          if (!permissionsGranted) {
            const granted = await requestPermissions();
            if (!granted) {
              setIsRecording(false);
              return null;
            }
          }

          // Note: Capacitor Camera getPhoto with Video doesn't return until recording is complete
          // The recording UI (stop button, duration) must be handled by the native camera app
          const video = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source,
            quality: 80, // Medium quality for file size management
            allowEditing: false,
            saveToGallery: true,
            correctOrientation: true,
            // @ts-ignore - Video mode exists but isn't in types
            mediaType: 'video',
          });

          return video;
        } catch (capacitorError) {
          console.warn('Capacitor Camera failed, trying web fallback:', capacitorError);
        }
      }

      // Web fallback using file input (iOS/Chrome compatible)
      return new Promise((resolve) => {
        // Create new file input each time for iOS compatibility
        const input = document.createElement('input');
        input.type = 'file';
        // Use audio-only on iOS for reliable transcription, video elsewhere
        input.accept = isIOSDevice() ? 'audio/*' : 'video/*';
        input.style.display = 'none';
        
        // Show toast notification for iOS users
        if (isIOSDevice()) {
          toast.info('iOS detected - Using audio-only mode', {
            description: 'Audio provides more reliable transcription on iOS devices'
          });
        }
        
        // Don't set capture attribute for iOS - let browser decide
        
        const handleFileSelect = (event: Event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const webPath = reader.result as string;
              const video: Photo = {
                webPath,
                format: file.type.split('/')[1] || 'mp4',
                saved: false,
              };
              resolve(video);
            };
            reader.onerror = () => {
              toast.error('Failed to read video file');
              resolve(null);
            };
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
          
          // Clean up
          input.remove();
        };

        const handleCancel = () => {
          setTimeout(() => {
            if (!input.files?.length) {
              resolve(null);
              input.remove();
            }
          }, 300);
        };

        input.addEventListener('change', handleFileSelect);
        input.addEventListener('cancel', handleCancel);
        
        // CRITICAL: Append to body before clicking (iOS requirement)
        document.body.appendChild(input);
        input.click();
      });
    } catch (error) {
      const err = error as Error;
      if (err.message !== 'User cancelled photos app') {
        console.error('Error capturing video:', error);
        toast.error('Failed to capture video', {
          description: err.message,
        });
      }
      return null;
    } finally {
      setIsRecording(false);
    }
  };

  return {
    startRecording,
    isRecording,
    permissionsGranted,
    requestPermissions,
  };
}
