import { useState } from 'react';
import { toast } from 'sonner';

interface Photo {
  dataUrl?: string;
  webPath?: string;
  format: string;
  saved: boolean;
}

interface UseCameraCaptureResult {
  capturePhoto: () => Promise<Photo | null>;
  isCapturing: boolean;
}

/**
 * Hook for capturing photos using browser's camera API
 * Works on all modern mobile browsers (iOS Safari, Android Chrome)
 */
export function useCameraCapture(): UseCameraCaptureResult {
  const [isCapturing, setIsCapturing] = useState(false);

  const capturePhoto = async (): Promise<Photo | null> => {
    setIsCapturing(true);
    
    try {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Request rear camera
        input.style.display = 'none';
        
        const handleFileSelect = (event: Event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const webPath = reader.result as string;
              const photo: Photo = {
                webPath,
                dataUrl: webPath,
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
        
        document.body.appendChild(input);
        input.click();
      });
    } catch (error) {
      const err = error as Error;
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    capturePhoto,
    isCapturing,
  };
}
