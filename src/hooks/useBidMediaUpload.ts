import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BidMedia, UploadBidMediaParams } from '@/types/bid';
import { toast } from 'sonner';
import { compressImage } from '@/utils/imageCompression';

interface UseBidMediaUploadResult {
  upload: (params: UploadBidMediaParams) => Promise<BidMedia | null>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
}

/**
 * Hook for uploading bid media with progress tracking
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let fileToUpload = params.file;
      const fileType = params.file.type.startsWith('image/') ? 'image' 
        : params.file.type.startsWith('video/') ? 'video'
        : 'document';

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
      
      // Upload to storage
      const timestamp = Date.now();
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${params.bid_id}/${timestamp}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      setProgress(70);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);

      setProgress(80);

      // Create database record
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
          uploaded_by: user.id,
        })
        .select('*')
        .single();

      if (dbError) throw dbError;

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

