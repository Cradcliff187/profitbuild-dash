import { useState } from 'react';
import { uploadProjectMedia, type UploadProjectMediaParams } from '@/utils/projectMedia';
import type { ProjectMedia } from '@/types/project';
import { toast } from 'sonner';
import { compressImage } from '@/utils/imageCompression';
import { addMediaToQueue } from '@/utils/syncQueue';

interface UseProjectMediaUploadResult {
  upload: (params: Omit<UploadProjectMediaParams, 'projectId'>) => Promise<ProjectMedia | null>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
}

/**
 * Hook for uploading project media with progress tracking
 */
export function useProjectMediaUpload(projectId: string): UseProjectMediaUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const upload = async (
    params: Omit<UploadProjectMediaParams, 'projectId'>
  ): Promise<ProjectMedia | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      let fileToUpload = params.file;

      // Compress images (not videos)
      if (params.file.type.startsWith('image/')) {
        setProgress(10);
        
        fileToUpload = await compressImage(params.file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          targetSizeKB: 500
        });
        
        setProgress(20);
      }

      // Check if online
      if (!navigator.onLine) {
        console.log('📴 Offline - queueing media upload');
        
        const queueId = await addMediaToQueue(fileToUpload, {
          projectId,
          caption: params.caption,
          description: params.description,
          latitude: params.latitude,
          longitude: params.longitude,
          locationName: params.locationName,
          altitude: params.altitude,
          deviceModel: params.deviceModel,
          takenAt: params.takenAt,
          uploadSource: params.uploadSource,
          duration: params.duration,
        });
        
        toast.info('Queued for upload', {
          description: 'Media will upload automatically when connection is restored',
        });
        
        setIsUploading(false);
        setProgress(0);
        
        // Return a placeholder media object with queue ID
        return {
          id: queueId,
          project_id: projectId,
          file_url: 'pending',
          file_name: fileToUpload.name,
          file_type: params.file.type.startsWith('image/') ? 'image' : 'video',
          file_size: fileToUpload.size,
          mime_type: fileToUpload.type,
          caption: params.caption || null,
          description: params.description || null,
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          altitude: params.altitude || null,
          location_name: params.locationName || null,
          taken_at: params.takenAt || new Date().toISOString(),
          device_model: params.deviceModel || null,
          uploaded_by: null,
          upload_source: params.uploadSource || null,
          duration: params.duration || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as ProjectMedia;
      }

      // Online - proceed with normal upload
      setProgress(30);
      const result = await uploadProjectMedia({
        ...params,
        file: fileToUpload,
        projectId,
      });

      setProgress(100);

      if (result.error) {
        setError(result.error);
        toast.error('Upload failed', {
          description: result.error.message,
        });
        return null;
      }

      if (!result.data) {
        const error = new Error('Upload failed - no data returned');
        setError(error);
        toast.error('Upload failed', {
          description: 'The file was uploaded but database record creation failed. Please try again.',
        });
        return null;
      }

      toast.success('Media uploaded successfully');
      return result.data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error('Upload failed', {
        description: error.message,
      });
      return null;
    } finally {
      setIsUploading(false);
      // Reset progress after a delay
      setTimeout(() => setProgress(0), 500);
    }
  };

  return {
    upload,
    isUploading,
    progress,
    error,
  };
}
