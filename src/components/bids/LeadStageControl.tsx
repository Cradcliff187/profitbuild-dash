import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LEAD_CLOSED_REASONS,
  LEAD_CLOSED_REASON_LABELS,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  type LeadClosedReason,
  type LeadStage,
} from '@/types/bid';
import { buildStageUpdate, formatLeadStage, leadStageBadgeClass } from '@/utils/leadLabels';
import { cn } from '@/lib/utils';

interface LeadStageControlProps {
  bidId: string;
  stage: LeadStage;
  closedReason?: LeadClosedReason | null;
  /** Pre-selects "Linked to a job" as the close reason when the lead has links. */
  hasLinkedJobs?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * Stage pill + dropdown (the QuoteStatusSelector pattern). Picking "Closed"
 * opens a small dialog that REQUIRES a reason — the DB CHECK enforces the same
 * invariant, this just makes the UI honest about it. Picking any open stage
 * clears closed_reason / closed_at / closed_by (buildStageUpdate).
 */
export function LeadStageControl({
  bidId,
  stage,
  closedReason,
  hasLinkedJobs = false,
  disabled = false,
  size = 'default',
  className,
}: LeadStageControlProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [closeOpen, setCloseOpen] = useState(false);
  const [reason, setReason] = useState<LeadClosedReason | ''>('');

  const mutation = useMutation({
    mutationFn: async (next: { stage: LeadStage; closedReason?: LeadClosedReason }) => {
      const payload = buildStageUpdate(next.stage, {
        closedReason: next.closedReason ?? null,
        userId: user?.id ?? null,
      });
      const { error } = await supabase.from('branch_bids').update(payload).eq('id', bidId);
      if (error) throw error;
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['branch-bid', bidId] });
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
      toast.success(
        payload.stage === 'closed'
          ? `Lead closed · ${LEAD_CLOSED_REASON_LABELS[payload.closed_reason!]}`
          : `Stage set to ${formatLeadStage(payload.stage)}`,
      );
      setCloseOpen(false);
      setReason('');
    },
    onError: (error: Error) => {
      toast.error('Could not update the stage', { description: error.message });
    },
  });

  const pick = (next: LeadStage) => {
    if (next === stage) return;
    if (next === 'closed') {
      setReason(hasLinkedJobs ? 'linked_to_job' : '');
      setCloseOpen(true);
      return;
    }
    mutation.mutate({ stage: next });
  };

  const pill = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border font-medium',
        size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-7 px-2.5 text-xs',
        leadStageBadgeClass(stage),
      )}
    >
      {formatLeadStage(stage)}
      {stage === 'closed' && closedReason ? (
        <span className="font-normal opacity-80">· {LEAD_CLOSED_REASON_LABELS[closedReason]}</span>
      ) : null}
      {!disabled && <ChevronDown className="h-3 w-3 opacity-70" />}
    </Badge>
  );

  if (disabled) return <span className={className}>{pill}</span>;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn('rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
            aria-label={`Stage: ${formatLeadStage(stage)}. Change stage`}
            disabled={mutation.isPending}
          >
            {pill}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {LEAD_STAGES.filter((s) => s !== 'closed').map((s) => (
            <DropdownMenuItem key={s} onClick={() => pick(s)} className="min-h-[40px] gap-2">
              <span className={cn('h-2 w-2 rounded-full border', leadStageBadgeClass(s))} />
              {LEAD_STAGE_LABELS[s]}
              {s === stage && <Check className="ml-auto h-3.5 w-3.5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => pick('closed')} className="min-h-[40px] gap-2">
            <span className={cn('h-2 w-2 rounded-full border', leadStageBadgeClass('closed'))} />
            {stage === 'closed' ? 'Change close reason…' : 'Close lead…'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={closeOpen} onOpenChange={(o) => !mutation.isPending && setCloseOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close this lead</DialogTitle>
            <DialogDescription>
              A reason is required. Closed leads are hidden from the list by default; you can
              reopen one any time by picking another stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="lead-close-reason">Why is it closed? *</Label>
            <Select value={reason || undefined} onValueChange={(v) => setReason(v as LeadClosedReason)}>
              <SelectTrigger id="lead-close-reason">
                <SelectValue placeholder="Pick a reason" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_CLOSED_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {LEAD_CLOSED_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCloseOpen(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => reason && mutation.mutate({ stage: 'closed', closedReason: reason })}
              disabled={!reason || mutation.isPending}
            >
              {mutation.isPending ? 'Closing…' : 'Close lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
