import { format } from 'date-fns';
import { Building2, Inbox, Mail, MessageSquare, Navigation, Pencil, Phone, Ruler, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectAddressLocator } from '@/components/projects/ProjectAddressLocator';
import { LeadStageControl } from '@/components/bids/LeadStageControl';
import { formatLeadSizeBand, formatLeadSource } from '@/utils/leadLabels';
import { mapsHref, smsHref, telHref } from '@/utils/leadLinks';
import type { BranchBid } from '@/types/bid';
import { cn } from '@/lib/utils';

const PROJECT_TYPE_LABELS: Record<string, string> = {
  construction_project: 'Construction project',
  work_order: 'Work order',
};


interface LeadFactsCardProps {
  bid: BranchBid;
  hasLinkedJobs: boolean;
  canEdit: boolean;
  onEdit: () => void;
  /** Mobile hero: adds the Call · Text · Directions row and drops the long facts list. */
  compact?: boolean;
  className?: string;
}

/**
 * The lead's facts: the PERSON first (a lead is a conversation with someone),
 * then stage, source, client, type, size band, address. One pencil edits all
 * of it (LeadEditSheet); stage changes stay on the pill. On mobile this is the
 * hub hero and carries tap-to-call / text / directions.
 */
export function LeadFactsCard({ bid, hasLinkedJobs, canEdit, onEdit, compact = false, className }: LeadFactsCardProps) {
  const person = bid.contacts ?? null;
  const phone = person?.phone?.trim() || bid.clients?.phone?.trim() || null;
  const email = person?.email?.trim() || bid.clients?.email?.trim() || null;
  const typeLabel = bid.project_type ? PROJECT_TYPE_LABELS[bid.project_type] ?? bid.project_type : null;
  const sizeLabel = formatLeadSizeBand(bid.size_band);

  return (
    <Card className={cn(compact && 'border-primary/40', className)}>
      <CardContent className={cn('space-y-4', compact ? 'p-4' : 'p-4 sm:p-5')}>
        {/* Stage + source + edit */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <LeadStageControl
            bidId={bid.id}
            stage={bid.stage}
            closedReason={bid.closed_reason}
            hasLinkedJobs={hasLinkedJobs}
            disabled={!canEdit}
          />
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Inbox className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate" title={bid.source_detail ?? undefined}>
              {formatLeadSource(bid.source)}
              {bid.source_detail ? ` · ${bid.source_detail}` : ''}
            </span>
          </span>
          {bid.stage === 'closed' && bid.closed_at && (
            <span className="text-xs text-muted-foreground">Closed {format(new Date(bid.closed_at), 'MMM d, yyyy')}</span>
          )}
          {canEdit && (
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={onEdit} aria-label="Edit lead details">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* The person */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            {person ? (
              <>
                <div className="truncate text-base font-semibold">{person.name}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {[person.title, bid.clients?.client_name ?? bid.clients?.company_name].filter(Boolean).join(' · ') || 'No company yet'}
                </div>
              </>
            ) : bid.clients ? (
              <>
                <div className="truncate text-base font-semibold">{bid.clients.client_name}</div>
                <div className="text-sm text-muted-foreground">
                  {bid.clients.company_name ? `${bid.clients.company_name} · ` : ''}
                  {canEdit ? (
                    <button type="button" className="text-primary hover:underline" onClick={onEdit}>Add the person you're talking to</button>
                  ) : 'No person on file'}
                </div>
              </>
            ) : (
              <>
                <div className="text-base font-semibold text-muted-foreground">No person yet</div>
                {canEdit && (
                  <button type="button" className="text-sm text-primary hover:underline" onClick={onEdit}>
                    Add who you're talking to
                  </button>
                )}
              </>
            )}
            {!compact && (phone || email) && (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {phone && (
                  <a href={telHref(phone)} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" aria-hidden />{phone}
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="inline-flex min-w-0 items-center gap-1.5 text-primary hover:underline">
                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{email}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: the three things you do with a lead from a phone */}
        {compact && (
          <div className="grid grid-cols-3 gap-2">
            <ActionTile href={phone ? telHref(phone) : undefined} icon={Phone} label="Call" missing="No phone" onMissing={canEdit ? onEdit : undefined} />
            <ActionTile href={phone ? smsHref(phone) : undefined} icon={MessageSquare} label="Text" missing="No phone" onMissing={canEdit ? onEdit : undefined} />
            <ActionTile href={bid.address ? mapsHref(bid.address) : undefined} icon={Navigation} label="Directions" missing="No address" external onMissing={canEdit ? onEdit : undefined} />
          </div>
        )}

        {/* Facts */}
        <dl className={cn('grid gap-x-6 gap-y-3 text-sm', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
          {!compact && (
            <Fact label="Client" icon={Building2}>
              {bid.clients ? (
                <span className="truncate">
                  {bid.clients.client_name}
                  {bid.clients.company_name && <span className="text-muted-foreground"> ({bid.clients.company_name})</span>}
                </span>
              ) : (
                <span className="text-muted-foreground">Prospect — no client record yet</span>
              )}
            </Fact>
          )}
          <Fact label="Type">
            {typeLabel ? (
              <>
                {typeLabel}
                {bid.job_type && <span className="text-muted-foreground"> · {bid.job_type}</span>}
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Fact>
          <Fact label="Rough size" icon={Ruler}>
            {sizeLabel ?? <span className="text-muted-foreground">—</span>}
          </Fact>
          <div className={cn('min-w-0', !compact && 'sm:col-span-2')}>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Address</dt>
            <dd className="mt-0.5">
              <ProjectAddressLocator address={bid.address} variant="header-inline" onAddAddress={canEdit ? onEdit : undefined} />
            </dd>
          </div>
          {!compact && bid.description && (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Scope</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm">{bid.description}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function Fact({ label, icon: Icon, children }: { label: string; icon?: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        {children}
      </dd>
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  label,
  missing,
  external,
  onMissing,
}: {
  href?: string;
  icon: typeof Phone;
  label: string;
  missing: string;
  external?: boolean;
  onMissing?: () => void;
}) {
  const cls = 'flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium transition-colors';
  if (!href) {
    return (
      <button
        type="button"
        onClick={onMissing}
        disabled={!onMissing}
        className={cn(cls, 'border-dashed text-muted-foreground', onMissing && 'hover:bg-accent/50')}
      >
        <Icon className="h-5 w-5" aria-hidden />
        <span>{label}</span>
        <span className="text-[10px] font-normal">{missing}</span>
      </button>
    );
  }
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cn(cls, 'border-primary/20 bg-background text-foreground hover:bg-primary/5 active:bg-primary/10')}
    >
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <span>{label}</span>
    </a>
  );
}
