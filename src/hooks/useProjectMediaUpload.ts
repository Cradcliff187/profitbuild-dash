import { useState } from 'react';
import { uploadProjectMedia, type UploadProjectMediaParams } from '@/utils/projectMedia';
import type { ProjectMedia } from '@/types/project';
import { toast } from 'sonner';

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
      // Simulate progress (in production, you'd track actual upload progress)
      setProgress(30);

      const result = await uploadProjectMedia({
        ...params,
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
