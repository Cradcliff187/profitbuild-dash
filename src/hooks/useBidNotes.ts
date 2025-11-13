import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BidNote } from '@/types/bid';

interface UseBidNotesResult {
  notes: BidNote[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching and subscribing to bid notes
 */
export function useBidNotes(bidId: string): UseBidNotesResult {
  const queryClient = useQueryClient();

  const queryKey = ['bid-notes', bidId];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: notes, error } = await supabase
        .from('bid_notes')
        .select('*')
        .eq('bid_id', bidId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!notes || notes.length === 0) return [];

      // Fetch user profiles separately
      const userIds = [...new Set(notes.map(note => note.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Map profiles to notes
      return notes.map(note => ({
        ...note,
        profiles: profiles?.find(p => p.id === note.user_id)
      })) as BidNote[];
    },
    enabled: !!bidId,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    if (!bidId) return;

    const channel = supabase
      .channel(`bid-notes-${bidId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_notes',
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
    notes: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

