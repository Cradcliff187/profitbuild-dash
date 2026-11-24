import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { refreshProjectDependentData } from '@/lib/queryClient';
import type { BranchBidProjectLink } from '@/types/bid';
import type { CreateJobInput } from '@/components/bids/CreateJobDialog';

export const leadProjectLinksKey = (bidId: string) => ['branch-bid-projects', bidId] as const;

/**
 * Lead ↔ job links (branch_bid_projects). A lead is LINKED to jobs; the lead
 * itself never takes a number (CLAUDE.md Rule 42). Since Nov 24 2026 the
 * hand-off CAN mint one: `createJob` calls the `sales_create_job` RPC (Rule 46),
 * the single path the app and the sales chat share — next number, project row
 * at Estimating, link, stage → Estimate requested. Matt's tracker remains the
 * source of truth for the number. `branch_bids.project_id` mirrors the earliest
 * link via the `sync_branch_bid_primary_project` DB trigger, so after any write
 * we invalidate the lead + list queries too (Gotcha #27 fanout).
 */
export function useLeadProjectLinks(bidId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: leadProjectLinksKey(bidId ?? ''),
    enabled: !!bidId,
    queryFn: async (): Promise<BranchBidProjectLink[]> => {
      const { data, error } = await supabase
        .from('branch_bid_projects')
        .select('id, branch_bid_id, project_id, created_at, created_by, projects:project_id (id, project_number, project_name, client_name, status)')
        .eq('branch_bid_id', bidId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BranchBidProjectLink[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: leadProjectLinksKey(bidId ?? '') });
    queryClient.invalidateQueries({ queryKey: ['branch-bid', bidId] });
    queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
  };

  const linkMutation = useMutation({
    mutationFn: async (projectIds: string[]) => {
      if (!bidId) throw new Error('No lead id');
      if (projectIds.length === 0) return 0;
      const { error } = await supabase
        .from('branch_bid_projects')
        .upsert(
          projectIds.map((project_id) => ({
            branch_bid_id: bidId,
            project_id,
            created_by: user?.id ?? null,
          })),
          { onConflict: 'branch_bid_id,project_id', ignoreDuplicates: true },
        );
      if (error) throw error;
      return projectIds.length;
    },
    onSuccess: (count) => {
      invalidateAll();
      if (count > 0) toast.success(count === 1 ? 'Job linked' : `${count} jobs linked`);
    },
    onError: (error: Error) => {
      toast.error('Could not link the job', { description: error.message });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('branch_bid_projects').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Job unlinked');
    },
    onError: (error: Error) => {
      toast.error('Could not unlink the job', { description: error.message });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (input: CreateJobInput) => {
      if (!bidId) throw new Error('No lead id');
      const { data, error } = await supabase.rpc('sales_create_job', {
        p_lead_id: bidId,
        p_job_name: input.jobName,
        p_client_id: input.clientId,
        p_client_name: null,
        p_address: input.address,
        p_project_type: input.projectType,
        p_written_by: 'app',
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('No job came back');
      return row as { job_id: string; job_number: string };
    },
    onSuccess: (job) => {
      invalidateAll();
      // A new project row: every picker and list that reads projects (Gotcha #82).
      refreshProjectDependentData();
      toast.success(`Job ${job.job_number} created and linked`, {
        description: 'Starts at Estimating. Renumber it if Matt’s sheet says otherwise.',
      });
    },
    onError: (error: Error) => {
      toast.error('Could not create the job', { description: error.message });
    },
  });

  return {
    links: query.data ?? [],
    isLoading: query.isLoading,
    linkProjects: linkMutation.mutateAsync,
    isLinking: linkMutation.isPending,
    unlinkProject: unlinkMutation.mutate,
    isUnlinking: unlinkMutation.isPending,
    createJob: createJobMutation.mutateAsync,
    isCreatingJob: createJobMutation.isPending,
  };
}
