import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectStatusBadge } from '@/components/ui/status-badge';
import type { BranchBidProjectLink } from '@/types/bid';
import { cn } from '@/lib/utils';

interface LinkedJobsCardProps {
  links: BranchBidProjectLink[];
  canEdit: boolean;
  onLinkJob: () => void;
  onUnlink: (linkId: string) => void;
  isUnlinking?: boolean;
  /** Render without the Card chrome (inside a mobile drill-down). */
  bare?: boolean;
}

/**
 * The jobs a lead is LINKED to. This is the ONLY home of "Link to job" on the
 * lead page (Rule 42: a lead never takes a number — the job does). One verb,
 * one place; the header kebab no longer duplicates it.
 */
export function LinkedJobsCard({ links, canEdit, onLinkJob, onUnlink, isUnlinking, bare = false }: LinkedJobsCardProps) {
  const navigate = useNavigate();
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LinkIcon className="h-4 w-4 text-primary" aria-hidden />
          Linked jobs
          {links.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{links.length}</Badge>
          )}
        </div>
        {canEdit && (
          <Button size="sm" variant={links.length === 0 ? 'default' : 'outline'} onClick={onLinkJob} className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Link to job
          </Button>
        )}
      </div>
      {links.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No job yet. When the job folder is created and the job exists, link it here — the lead keeps
          its history, the job keeps the number.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {links.map((l) => (
            <li
              key={l.id}
              className={cn('flex items-center gap-1 rounded-lg border bg-background pl-1 pr-1', isUnlinking && 'opacity-60')}
            >
              <button
                type="button"
                onClick={() => navigate(`/projects/${l.project_id}`)}
                className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={l.projects ? `${l.projects.project_number} ${l.projects.project_name}` : l.project_id}
              >
                <span className="shrink-0 font-mono text-xs font-semibold">{l.projects?.project_number ?? '—'}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{l.projects?.project_name ?? 'Project'}</span>
                {l.projects?.status && <ProjectStatusBadge status={l.projects.status} size="sm" />}
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onUnlink(l.id)}
                  disabled={isUnlinking}
                  aria-label={`Unlink ${l.projects?.project_number ?? 'job'}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
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
