import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { BranchBidProjectLink } from '@/types/bid';
import { cn } from '@/lib/utils';

interface LeadEstimatesCardProps {
  links: BranchBidProjectLink[];
  bare?: boolean;
}

type EstimateRow = {
  id: string;
  project_id: string;
  estimate_number: string;
  status: string | null;
  total_amount: number | null;
  date_created: string | null;
  is_current_version: boolean | null;
};

const STATUS_CLASS: Record<string, string> = {
  approved: 'bg-success/15 text-success border-success/30',
  sent: 'bg-info/15 text-info border-info/30',
  draft: 'bg-muted text-muted-foreground border-border',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  expired: 'bg-warning/15 text-warning border-warning/30',
};

/**
 * Estimates on the lead's linked jobs — the number lives on the job, the
 * conversation lives here (Rule 42). Read-only; the estimate screens own edits.
 */
export function LeadEstimatesCard({ links, bare = false }: LeadEstimatesCardProps) {
  const navigate = useNavigate();
  const projectIds = links.map((l) => l.project_id);
  const byProject = new Map(links.map((l) => [l.project_id, l.projects?.project_number ?? '']));

  const { data: estimates = [] } = useQuery({
    queryKey: ['lead-estimates', projectIds.slice().sort().join(',')],
    enabled: projectIds.length > 0,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<EstimateRow[]> => {
      const { data, error } = await supabase
        .from('estimates')
        .select('id, project_id, estimate_number, status, total_amount, date_created, is_current_version')
        .in('project_id', projectIds)
        .eq('is_current_version', true)
        .order('date_created', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EstimateRow[];
    },
  });

  if (projectIds.length === 0) return null;

  const body = (
    <>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Calculator className="h-4 w-4 text-primary" aria-hidden />
        Estimates
        {estimates.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{estimates.length}</Badge>}
      </div>
      {estimates.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No estimate on the linked job yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {estimates.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => navigate(`/projects/${e.project_id}/estimates`)}
                className="flex min-h-[40px] w-full items-center gap-2 rounded-lg border bg-background px-2 text-left hover:bg-accent/50"
              >
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{byProject.get(e.project_id)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{e.estimate_number}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(e.total_amount ?? 0)}</span>
                <Badge variant="outline" className={cn('h-5 shrink-0 border px-1.5 text-[10px] capitalize', STATUS_CLASS[e.status ?? 'draft'])}>
                  {e.status ?? 'draft'}
                </Badge>
                {e.date_created && <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">{format(new Date(e.date_created), 'MMM d')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
  if (bare) return <div>{body}</div>;
  return (
    <Card>
      <CardContent className="p-4">{body}</CardContent>
    </Card>
  );
}
