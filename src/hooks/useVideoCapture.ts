import { useState } from 'react';
import { toast } from 'sonner';

interface Photo {
  dataUrl?: string;
  webPath?: string;
  format: string;
  saved: boolean;
}

interface UseVideoCaptureResult {
  startRecording: () => Promise<Photo | null>;
  isRecording: boolean;
}

/**
 * Hook for capturing videos using browser's camera API
 * Works on all modern mobile browsers (iOS Safari, Android Chrome)
 * Returns Photo object with video data for compatibility
 */
export function useVideoCapture(): UseVideoCaptureResult {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async (): Promise<Photo | null> => {
    setIsRecording(true);
    
    try {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.capture = 'environment'; // Request rear camera
        input.style.display = 'none';
        
        const handleFileSelect = (event: Event) => {
          const target = event.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const webPath = reader.result as string;
              const video: Photo = {
                webPath,
                dataUrl: webPath,
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
      console.error('Error capturing video:', error);
      toast.error('Failed to capture video');
      return null;
    } finally {
      setIsRecording(false);
    }
  };

  return {
    startRecording,
    isRecording,
  };
}
