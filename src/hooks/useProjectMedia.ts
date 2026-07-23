import { useQuery } from '@tanstack/react-query';
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
 * Build the cache key for a project's media list. Callers that write to the
 * cache (optimistic updates, invalidation) MUST use this same helper — the
 * bare-options key is `['project-media', projectId]`, NOT
 * `['project-media', projectId, undefined]`; the two hash differently and
 * setQueryData against the wrong one is a silent no-op.
 */
export function projectMediaQueryKey(
  projectId: string,
  options?: UseProjectMediaOptions
) {
  return options
    ? (['project-media', projectId, options] as const)
    : (['project-media', projectId] as const);
}

/**
 * Hook for fetching project media.
 *
 * No realtime subscription — field workers mount this on their landing
 * surfaces and realtime on those paths is banned (Gotcha #53/#55). Freshness
 * comes from mutation-side invalidation (upload/delete paths invalidate
 * 'project-media' + 'project-media-count') plus focus refetch.
 */
export function useProjectMedia(
  projectId: string,
  options?: UseProjectMediaOptions
): UseProjectMediaResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: projectMediaQueryKey(projectId, options),
    queryFn: async () => {
      const result = await getProjectMediaList(projectId, options);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    media: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
