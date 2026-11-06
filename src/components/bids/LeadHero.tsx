import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Building2, Link as LinkIcon, Plus, X, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import { ProjectAddressLocator } from '@/components/projects/ProjectAddressLocator';
import { LeadStageControl } from '@/components/bids/LeadStageControl';
import type { BranchBid, BranchBidProjectLink } from '@/types/bid';
import { formatLeadSource } from '@/utils/leadLabels';
import { cn } from '@/lib/utils';

interface LeadHeroProps {
  bid: BranchBid;
  links: BranchBidProjectLink[];
  canEdit: boolean;
  onLinkJob: () => void;
  onUnlink: (linkId: string) => void;
  onEdit: () => void;
  isUnlinking?: boolean;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  construction_project: 'Construction project',
  work_order: 'Work order',
};

/**
 * The lead at a glance — mirrors the QuoteViewHero / project-hub shape (Rules
 * 16, 37): identity, the stage pill (tappable), source in plain words, who/where,
 * and the linked jobs as chips with "Link to job" beside them. Everything that
 * used to be a disabled <Input> in the old "Lead Information" card is read
 * copy here; editing moved to LeadEditSheet.
 */
export function LeadHero({ bid, links, canEdit, onLinkJob, onUnlink, onEdit, isUnlinking }: LeadHeroProps) {
  const navigate = useNavigate();
  const hasClient = !!bid.clients;
  const typeLabel = bid.project_type ? PROJECT_TYPE_LABELS[bid.project_type] ?? bid.project_type : null;

  return (
    <Card>
      <CardContent className="space-y-5 p-4 sm:p-6">
        {/* Row 1 — stage + source */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <LeadStageControl
            bidId={bid.id}
            stage={bid.stage}
            closedReason={bid.closed_reason}
            hasLinkedJobs={links.length > 0}
            disabled={!canEdit}
          />
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <Inbox className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-medium">{formatLeadSource(bid.source)}</span>
            {bid.source_detail && (
              <span className="truncate text-muted-foreground" title={bid.source_detail}>
                · {bid.source_detail}
              </span>
            )}
          </div>
          {bid.stage === 'closed' && bid.closed_at && (
            <span className="text-xs text-muted-foreground">
              Closed {format(new Date(bid.closed_at), 'MMM d, yyyy')}
            </span>
          )}
        </div>

        {/* Row 2 — who / what / where */}
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Client</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              {hasClient ? (
                <span className="truncate">
                  {bid.clients!.client_name}
                  {bid.clients!.company_name && (
                    <span className="text-muted-foreground"> ({bid.clients!.company_name})</span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">No client yet</span>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Type</dt>
            <dd className="mt-0.5">
              {typeLabel ? (
                <>
                  {typeLabel}
                  {bid.job_type && <span className="text-muted-foreground"> · {bid.job_type}</span>}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Address</dt>
            <dd className="mt-0.5">
              <ProjectAddressLocator
                address={bid.address}
                variant="header-inline"
                onAddAddress={canEdit ? onEdit : undefined}
              />
            </dd>
          </div>
          {bid.description && (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Description</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm">{bid.description}</dd>
            </div>
          )}
        </dl>

        {/* Row 3 — linked jobs */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LinkIcon className="h-4 w-4 text-primary" aria-hidden />
              Linked jobs
              {links.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{links.length}</Badge>
              )}
            </div>
            {canEdit && (
              <Button size="sm" variant={links.length === 0 ? 'default' : 'outline'} onClick={onLinkJob} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Link to job
              </Button>
            )}
          </div>
          {links.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No job yet. A lead never gets its own project number — when the job folder is
              created, link the job here.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {links.map((l) => (
                <li
                  key={l.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-full border bg-background pl-1 pr-1 text-xs',
                    isUnlinking && 'opacity-60',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${l.project_id}`)}
                    className="flex min-h-[32px] items-center gap-1.5 rounded-full px-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={l.projects ? `${l.projects.project_number} ${l.projects.project_name}` : l.project_id}
                  >
                    <span className="font-mono font-semibold">{l.projects?.project_number ?? '—'}</span>
                    <span className="max-w-[180px] truncate">{l.projects?.project_name ?? 'Project'}</span>
                    {l.projects?.status && <ProjectStatusBadge status={l.projects.status} size="sm" />}
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onUnlink(l.id)}
                      disabled={isUnlinking}
                      aria-label={`Unlink ${l.projects?.project_number ?? 'job'}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
