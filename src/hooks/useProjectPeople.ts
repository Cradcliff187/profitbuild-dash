import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { refreshProjectDependentData } from '@/lib/queryClient';
import { buildProjectPeoplePatch, type ProjectPeopleValues } from '@/utils/projectSource';

export interface ProjectPersonSummary {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
}

export interface ProjectLinkedLead {
  id: string;
  name: string;
}

/**
 * The people + lead behind a project's Contact / Source rows (Rule 45).
 * Admin/manager only — `contacts` and `branch_bids` are admin/manager by RLS,
 * so callers pass `enabled: false` for field workers and nothing is fetched.
 * Plain queries, no realtime (Gotchas #53/#55).
 */
export function useProjectPeople(
  projectId: string | undefined,
  contactIds: Array<string | null | undefined>,
  enabled: boolean,
) {
  const ids = Array.from(new Set(contactIds.filter(Boolean) as string[])).sort();

  const peopleQuery = useQuery({
    queryKey: ['contacts', 'by-id', ids],
    enabled: enabled && ids.length > 0,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ProjectPersonSummary[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, title, phone, email')
        .in('id', ids);
      if (error) throw error;
      return (data ?? []) as ProjectPersonSummary[];
    },
  });

  const leadsQuery = useQuery({
    queryKey: ['project-linked-leads', projectId],
    enabled: enabled && !!projectId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ProjectLinkedLead[]> => {
      const { data, error } = await supabase
        .from('branch_bid_projects')
        .select('created_at, branch_bids:branch_bid_id (id, name, deleted_at)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as Array<{ branch_bids: { id: string; name: string; deleted_at: string | null } | null }>)
        .map((row) => row.branch_bids)
        .filter((b): b is { id: string; name: string; deleted_at: string | null } => !!b && !b.deleted_at)
        .map((b) => ({ id: b.id, name: b.name }));
    },
  });

  const byId = new Map((peopleQuery.data ?? []).map((p) => [p.id, p]));
  return {
    personById: (id: string | null | undefined) => (id ? byId.get(id) ?? null : null),
    linkedLeads: leadsQuery.data ?? [],
    isLoading: peopleQuery.isLoading,
  };
}

/** Save the contact + source on one project, or the source on many (bulk). */
export function useSaveProjectPeople() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { projectIds: string[]; values: Partial<ProjectPeopleValues> }) => {
      if (input.projectIds.length === 0) return 0;
      const full = buildProjectPeoplePatch({
        primary_contact_id: input.values.primary_contact_id ?? null,
        source: input.values.source ?? null,
        source_contact_id: input.values.source_contact_id ?? null,
        source_detail: input.values.source_detail ?? null,
      });
      // Only write the keys the caller passed — a bulk "set source" must not
      // wipe each project's contact.
      const patch: Partial<ProjectPeopleValues> = {};
      (Object.keys(input.values) as Array<keyof ProjectPeopleValues>).forEach((k) => {
        patch[k] = full[k];
      });
      const { error } = await supabase.from('projects').update(patch).in('id', input.projectIds);
      if (error) throw error;
      return input.projectIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['project-data'] });
      refreshProjectDependentData();
      if (count > 0) toast.success('Saved');
    },
    onError: (error: Error) => {
      console.error('Saving project contact/source failed:', error);
      toast.error('Could not save', { description: error.message });
    },
  });
}
