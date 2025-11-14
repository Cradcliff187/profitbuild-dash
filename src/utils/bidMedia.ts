import { supabase } from '@/integrations/supabase/client';
import type { BidMedia } from '@/types/bid';

/**
 * Update bid media metadata (caption, description)
 */
export async function updateBidMediaMetadata(
  mediaId: string,
  updates: {
    caption?: string;
    description?: string;
  }
): Promise<{ data: BidMedia | null; error: Error | null }> {
  try {
    console.log('[updateBidMediaMetadata] Updating media:', mediaId, updates);
    
    // First, update the media
    const { data: updatedMedia, error: updateError } = await supabase
      .from('bid_media')
      .update(updates)
      .eq('id', mediaId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[updateBidMediaMetadata] Database error:', updateError);
      return {
        data: null,
        error: updateError,
      };
    }

    // Then fetch the profile separately if uploaded_by exists
    if (updatedMedia.uploaded_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', updatedMedia.uploaded_by)
        .single();
      
      if (profile) {
        (updatedMedia as any).profiles = profile;
      }
    }

    console.log('[updateBidMediaMetadata] Update successful:', updatedMedia);
    return {
      data: updatedMedia as BidMedia,
      error: null,
    };
  } catch (error) {
    console.error('[updateBidMediaMetadata] Caught error:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Delete bid media
 */
export async function deleteBidMedia(
  mediaId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // First get the media to find the file URL
    const { data: media, error: fetchError } = await supabase
      .from('bid_media')
      .select('file_url, file_type')
      .eq('id', mediaId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError };
    }

    // Delete from storage
    const bucket = media.file_type === 'document' ? 'bid-documents' : 'bid-media';
    const path = media.file_url.split(`${bucket}/`)[1];
    
    if (path) {
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('bid_media')
      .delete()
      .eq('id', mediaId);

    if (dbError) {
      return { success: false, error: dbError };
    }

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

