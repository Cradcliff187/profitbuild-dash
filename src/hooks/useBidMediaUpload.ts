import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BidMedia, UploadBidMediaParams } from '@/types/bid';
import { toast } from 'sonner';
import { compressImage } from '@/utils/imageCompression';
import { validateMediaFile, generateStoragePath } from '@/utils/mediaMetadata';

interface UseBidMediaUploadResult {
  upload: (params: UploadBidMediaParams) => Promise<BidMedia | null>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
}

/**
 * Hook for uploading bid media with progress tracking, validation, and error rollback
 */
export function useBidMediaUpload(): UseBidMediaUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const upload = async (params: UploadBidMediaParams): Promise<BidMedia | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let fileToUpload = params.file;
      const fileType = params.file.type.startsWith('image/') ? 'image'
        : params.file.type.startsWith('video/') ? 'video'
        : 'document';

      // Validate file before processing
      const validation = validateMediaFile(params.file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid file');
      }

      // Compress images (not videos or documents)
      if (fileType === 'image') {
        setProgress(10);

        fileToUpload = await compressImage(params.file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          targetSizeKB: 500
        });

        setProgress(20);
      }

      setProgress(30);

      // Determine bucket based on file type
      const bucket = fileType === 'document' ? 'bid-documents' : 'bid-media';

      // Generate standardized storage path: {userId}/{bidId}/{timestamp}-{sanitizedFilename}
      const storagePath = generateStoragePath(user.id, params.bid_id, fileToUpload.name);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(70);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);

      setProgress(80);

      // Create database record with all metadata
      const { data: mediaData, error: dbError } = await supabase
        .from('bid_media')
        .insert({
          bid_id: params.bid_id,
          file_url: publicUrl,
          file_name: fileToUpload.name,
          mime_type: fileToUpload.type,
          file_type: fileType,
          file_size: fileToUpload.size,
          caption: params.caption || null,
          description: params.description || null,
          duration: params.duration || null,
          // GPS and location metadata
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          altitude: params.altitude || null,
          location_name: params.location_name || null,
          // Capture metadata
          taken_at: params.taken_at || null,
          device_model: params.device_model || null,
          upload_source: params.upload_source || 'web',
          uploaded_by: user.id,
        })
        .select('*')
        .single();

      if (dbError) {
        // Rollback: delete uploaded file from storage
        await supabase.storage.from(bucket).remove([uploadData.path]);
        throw dbError;
      }

      // Fetch user profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const mediaWithProfile = { ...mediaData, profiles: profile };

      setProgress(100);
      toast.success('Media uploaded successfully');

      return mediaWithProfile as BidMedia;
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

