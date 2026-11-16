import { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ArrowRight, FileText, Link as LinkIcon, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { TOUCH_KIND_ICONS } from '@/components/bids/touchKindIcons';
import { formatLeadClosedReason, formatLeadStage, formatTimelineKind } from '@/utils/leadLabels';
import { TOUCH_KINDS, type LeadTimelineEntry, type TouchKind } from '@/types/bid';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'touches' | 'email' | 'files' | 'system';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'touches', label: 'Notes & calls' },
  { id: 'email', label: 'Email' },
  { id: 'files', label: 'Photos & files' },
  { id: 'system', label: 'Changes' },
];

const inFilter = (e: LeadTimelineEntry, f: Filter): boolean => {
  switch (f) {
    case 'all':
      return true;
    case 'touches':
      return ['note', 'call', 'text', 'meeting', 'site_walk'].includes(e.kind);
    case 'email':
      return e.kind === 'email_in' || e.kind === 'email_out' || e.kind === 'draft';
    case 'files':
      return e.kind === 'file' || e.attachments.length > 0;
    case 'system':
      return e.kind === 'stage_change' || e.kind === 'link';
  }
};

const dayLabel = (d: Date) => {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return format(d, sameYear ? 'EEEE, MMM d' : 'MMMM d, yyyy');
};

interface LeadTimelineProps {
  entries: LeadTimelineEntry[];
  isLoading?: boolean;
  canDelete?: boolean;
  onDelete?: (entryId: string) => void;
  /** Hide the filter chips (the mobile Photos / Documents drill-downs pass a pre-filtered list). */
  hideFilters?: boolean;
  emptyHint?: string;
}

/**
 * One chronological story per lead: touches a person logged, stage changes
 * and job links the triggers logged, photos and files. Filter chips replace
 * the old Notes / Media / Docs tabs (docs/LEADS_CRM_PLAN.md §4.2).
 */
export function LeadTimeline({
  entries,
  isLoading,
  canDelete = false,
  onDelete,
  hideFilters = false,
  emptyHint = 'Nothing logged yet. Log the first call, note or site walk.',
}: LeadTimelineProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const { confirm, dialog } = useConfirmDialog();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, touches: 0, email: 0, files: 0, system: 0 };
    for (const e of entries) for (const f of FILTERS) if (inFilter(e, f.id)) c[f.id] += 1;
    return c;
  }, [entries]);

  const visible = useMemo(() => entries.filter((e) => inFilter(e, filter)), [entries, filter]);

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: LeadTimelineEntry[] }[] = [];
    for (const e of visible) {
      const d = new Date(e.occurred_at);
      const key = format(d, 'yyyy-MM-dd');
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(e);
      else out.push({ key, label: dayLabel(d), items: [e] });
    }
    return out;
  }, [visible]);

  const handleDelete = async (e: LeadTimelineEntry) => {
    const ok = await confirm({
      title: 'Remove this entry?',
      description: `${formatTimelineKind(e.kind)}${e.author_name ? ` by ${e.author_name}` : ''} · ${format(new Date(e.occurred_at), 'MMM d, h:mm a')}`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) onDelete?.(e.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hideFilters && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter the timeline">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                filter === f.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {f.label}
              {counts[f.id] > 0 && <span className="tabular-nums opacity-70">{counts[f.id]}</span>}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">{filter === 'all' ? emptyHint : 'Nothing here for this filter.'}</p>
        </Card>
      ) : (
        <ol className="space-y-5">
          {groups.map((g) => (
            <li key={g.key}>
              <div className="sticky top-0 z-10 -mx-1 mb-2 bg-background/95 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                {g.label}
              </div>
              <ol className="space-y-2">
                {g.items.map((e) => (
                  <TimelineRow key={e.id} entry={e} canDelete={canDelete && e.source === 'timeline'} onDelete={() => void handleDelete(e)} />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
      {dialog}
    </div>
  );
}

function TimelineRow({ entry, canDelete, onDelete }: { entry: LeadTimelineEntry; canDelete: boolean; onDelete: () => void }) {
  const time = format(new Date(entry.occurred_at), 'h:mm a');
  const isTouch = (TOUCH_KINDS as readonly string[]).includes(entry.kind);
  const Icon = isTouch ? TOUCH_KIND_ICONS[entry.kind as TouchKind] : entry.kind === 'link' ? LinkIcon : entry.kind === 'file' ? FileText : ArrowRight;
  const system = entry.kind === 'stage_change' || entry.kind === 'link';

  let headline: string = formatTimelineKind(entry.kind);
  if (entry.kind === 'stage_change') {
    const from = entry.metadata.from as string | null | undefined;
    const to = entry.metadata.to as string | undefined;
    const reason = formatLeadClosedReason(entry.metadata.closed_reason as string | null | undefined);
    headline = from ? `${formatLeadStage(from)} → ${formatLeadStage(to)}` : `Stage set to ${formatLeadStage(to)}`;
    if (to === 'closed' && reason) headline += ` · ${reason}`;
  } else if (entry.kind === 'link') {
    const action = entry.metadata.action === 'unlinked' ? 'Unlinked job' : 'Linked job';
    headline = `${action} ${(entry.metadata.project_number as string | undefined) ?? ''}`.trim();
  } else if (entry.kind === 'file') {
    headline = entry.attachments[0]?.file_type === 'image' ? 'Photo' : entry.attachments[0]?.file_type === 'video' ? 'Video' : 'File';
  }

  return (
    <li
      className={cn(
        'flex gap-3 rounded-lg border p-3',
        system ? 'border-dashed bg-muted/20' : 'bg-card',
      )}
    >
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', system ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className={cn('font-medium', system ? 'text-muted-foreground' : 'text-foreground')}>{headline}</span>
          {entry.author_name && <span>{entry.author_name}</span>}
          <span className="tabular-nums">{time}</span>
        </div>
        {entry.kind !== 'file' && entry.body && (
          <p className="whitespace-pre-wrap break-words text-sm">{entry.body}</p>
        )}
        {entry.kind === 'file' && (entry.summary || entry.body) && (
          <p className="whitespace-pre-wrap break-words text-sm">{entry.summary || entry.body}</p>
        )}
        {entry.attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {entry.attachments.map((a, i) => (
              <li key={a.media_id ?? `${a.file_name}-${i}`}>
                {a.file_type === 'image' && a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border" title={a.file_name}>
                    <img src={a.thumbnail_url || a.url} alt={a.file_name} className="h-24 w-24 object-cover sm:h-28 sm:w-28" loading="lazy" />
                  </a>
                ) : a.file_type === 'video' && a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="relative block h-24 w-24 overflow-hidden rounded-md border bg-muted sm:h-28 sm:w-28" title={a.file_name}>
                    {a.thumbnail_url ? <img src={a.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                    <Play className="absolute inset-0 m-auto h-8 w-8 text-foreground/70" aria-hidden />
                  </a>
                ) : (
                  <a
                    href={a.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-[240px] items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-accent"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{a.file_name}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Remove entry"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
}
