import { useEffect, useState } from 'react';
import { CalendarClock, Check, Pencil, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useMentionableUsers } from '@/hooks/useMentionableUsers';
import { useUpdateLead } from '@/hooks/useLeadTimeline';
import { attentionBadgeClass, describeDue, getLeadAttention, nextBusinessDay, toDueDateString } from '@/utils/leadAttention';
import type { BranchBid } from '@/types/bid';
import { cn } from '@/lib/utils';

interface NextStepCardProps {
  bid: BranchBid;
  canEdit: boolean;
  /** Opens the composer so "Done" flows straight into "log what happened". */
  onLogTouch?: () => void;
  className?: string;
}

/**
 * The one field that drives the follow-up list (sales design rule 3): what
 * happens next, when, and who owns it. "Done" clears it and hands off to the
 * composer, which asks for the next one. A person writes every value here —
 * nothing schedules itself.
 */
export function NextStepCard({ bid, canEdit, onLogTouch, className }: NextStepCardProps) {
  const update = useUpdateLead(bid.id);
  const { data: people = [] } = useMentionableUsers();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [owner, setOwner] = useState('');

  useEffect(() => {
    if (!editing) return;
    setText(bid.next_step ?? '');
    setDue(bid.next_step_due ?? '');
    setOwner(bid.owner_user_id ?? '');
  }, [editing, bid.next_step, bid.next_step_due, bid.owner_user_id]);

  const attention = getLeadAttention(bid);
  const dueLabel = describeDue(bid.next_step_due);
  const ownerName = bid.owner_name ?? people.find((p) => p.user_id === bid.owner_user_id)?.display_name ?? null;
  const hasStep = !!(bid.next_step || bid.next_step_due);

  const save = async () => {
    await update.mutateAsync({
      next_step: text.trim() || null,
      next_step_due: due || null,
      owner_user_id: owner || null,
    });
    setEditing(false);
  };

  const markDone = async () => {
    await update.mutateAsync({ next_step: null, next_step_due: null });
    toast.success('Done. Log what happened and set the next one.');
    onLogTouch?.();
  };

  return (
    <Card className={cn(hasStep && attention === 'overdue' && 'border-destructive/50', className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Next step
          </div>
          {canEdit && !editing && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)} aria-label="Edit next step">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="next-step-text">What happens next</Label>
              <Input id="next-step-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Send the proposal" autoFocus />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="next-step-due">Due</Label>
                <Input id="next-step-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                <div className="flex gap-1.5">
                  <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => setDue(toDueDateString(nextBusinessDay(new Date())))}>Next business day</button>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); setDue(toDueDateString(d)); }}>In a week</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="next-step-owner">Owner</Label>
                <NativeSelect id="next-step-owner" value={owner} onValueChange={setOwner} className="h-10 text-sm">
                  <option value="">Unassigned</option>
                  {people.map((p) => (
                    <option key={p.user_id} value={p.user_id}>{p.display_name}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={update.isPending}>Cancel</Button>
              <Button size="sm" onClick={() => void save()} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        ) : (
          <>
            {hasStep ? (
              <div className="rounded-lg border-l-2 border-primary bg-primary/5 px-3 py-2">
                <p className="text-sm font-medium break-words">{bid.next_step || 'Follow up'}</p>
                {dueLabel && (
                  <span className={cn('mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', attentionBadgeClass(attention) || 'border-border text-muted-foreground')}>
                    {dueLabel}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {bid.stage === 'closed' ? 'Closed — nothing scheduled.' : 'Nothing scheduled. A lead with no next step is a lead nobody owns.'}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" aria-hidden />
                {ownerName ? `Owner · ${ownerName}` : 'No owner'}
              </span>
              {canEdit && hasStep && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void markDone()} disabled={update.isPending}>
                  <Check className="h-3.5 w-3.5" /> Done
                </Button>
              )}
              {canEdit && !hasStep && bid.stage !== 'closed' && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => setEditing(true)}>Set one</Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
