import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BidMedia } from '@/types/bid';

interface UseBidMediaOptions {
  fileType?: 'image' | 'video' | 'document';
  limit?: number;
  offset?: number;
}

interface UseBidMediaResult {
  media: BidMedia[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching and subscribing to bid media
 */
export function useBidMedia(
  bidId: string,
  options?: UseBidMediaOptions
): UseBidMediaResult {
  const queryClient = useQueryClient();

  const queryKey = ['bid-media', bidId, options];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('bid_media')
        .select('*')
        .eq('bid_id', bidId)
        .order('created_at', { ascending: false });

      if (options?.fileType) {
        query = query.eq('file_type', options.fileType);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data: mediaItems, error } = await query;

      if (error) throw error;
      if (!mediaItems || mediaItems.length === 0) return [];

      // Fetch user profiles separately
      const userIds = [...new Set(mediaItems.map(item => item.uploaded_by).filter(Boolean))];
      if (userIds.length === 0) return mediaItems as BidMedia[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Map profiles to media items
      return mediaItems.map(item => ({
        ...item,
        profiles: item.uploaded_by ? profiles?.find(p => p.id === item.uploaded_by) : null
      })) as BidMedia[];
    },
    enabled: !!bidId,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    if (!bidId) return;

    const channel = supabase
      .channel(`bid-media-${bidId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_media',
          filter: `bid_id=eq.${bidId}`,
        },
        () => {
          // Invalidate query to refetch data
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bidId, queryClient, queryKey]);

  return {
    media: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

