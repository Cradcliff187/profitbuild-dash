import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProjectMediaList } from '@/utils/projectMedia';
import type { ProjectMedia } from '@/types/project';

interface UseProjectMediaOptions {
  fileType?: 'image' | 'video';
  limit?: number;
  offset?: number;
}

interface UseProjectMediaResult {
  media: ProjectMedia[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching and subscribing to project media
 */
export function useProjectMedia(
  projectId: string,
  options?: UseProjectMediaOptions
): UseProjectMediaResult {
  const queryClient = useQueryClient();

  const queryKey = ['project-media', projectId, options];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getProjectMediaList(projectId, options);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!projectId,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-media-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_media',
          filter: `project_id=eq.${projectId}`,
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
  }, [projectId, queryClient, queryKey]);

  return {
    media: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
