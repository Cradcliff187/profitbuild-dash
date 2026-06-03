import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Square, AlertTriangle, Trash2, ArrowLeftRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { checkStaleTimer } from '@/utils/timeEntryValidation';
import { LunchToggle } from '@/components/time-tracker/LunchToggle';
import { DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';
import { isPTOProject } from '@/utils/timeEntries';

// PTO entries should NEVER have start_time/end_time set — they're duration-only.
// If one shows up in Active Timers it's a data-entry mistake, and force-clocking
// it out at "now" creates a multi-day astronomical labor cost. The admin path
// here lets you convert it back to a proper PTO entry (8 hours, no times) or
// discard it entirely. (isPTOProject + the PTO list now live in @/utils/timeEntries.)

// Soft cap on a single shift — anything over this prompts an explicit warning.
// The actual rule of thumb: a normal day is 8h, a long day is ~12h, a double-
// shift is up to 16h. Past 16h we're almost certainly looking at a forgotten
// timer and the admin should pick a sensible end time, not let "now" win.
const LONG_SHIFT_HOURS = 16;

// Hard cap. Past this we refuse to save without explicit confirmation. Twenty-
// four hours is the maximum a real shift could plausibly be.
const HARD_CAP_HOURS = 24;

interface ActiveTimer {
  id: string;
  payee_id: string;
  project_id: string;
  start_time: string;
  payee_name: string;
  project_number: string;
  project_name: string;
  hourly_rate: number;
}

interface ActiveTimersTableProps {
  onTimerClosed?: () => void;
}

export function ActiveTimersTable({ onTimerClosed }: ActiveTimersTableProps) {
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceClockOutOpen, setForceClockOutOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<ActiveTimer | null>(null);
  const [endTime, setEndTime] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lunchTaken, setLunchTaken] = useState(false);
  const [lunchDuration, setLunchDuration] = useState(DEFAULT_LUNCH_DURATION);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [convertPtoConfirmOpen, setConvertPtoConfirmOpen] = useState(false);

  const loadActiveTimers = async () => {
    try {
      // CRITICAL: filter `start_time IS NOT NULL` (May 8, 2026).
      //
      // Pre-fix this query was just `category=labor_internal AND end_time IS NULL`,
      // which pulled ALL labor_internal rows with no end_time — including
      // perfectly-valid PTO entries (sick / vacation / holiday) that legitimately
      // have NO start_time and NO end_time (they're duration-only, hours-amount
      // only). Those phantom "active timers" then rendered with `start_time=null`
      // → JS `new Date(null)` = epoch 0 → "started over 56 years ago" — and a
      // force-clock-out at "now" computed (now − epoch 0) × hourly_rate, which is
      // an astronomical $17M+ amount applied to the project. User-reported May 8.
      //
      // The right query for "active timer" is "started but not yet stopped" =
      // start_time IS NOT NULL AND end_time IS NULL. PTO entries never have a
      // start_time, so they correctly stay out of this view.
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          payee_id,
          project_id,
          start_time,
          payees!inner(payee_name, hourly_rate),
          projects!inner(project_number, project_name)
        `)
        .eq('category', 'labor_internal')
        .not('start_time', 'is', null)
        .is('end_time', null)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formatted = (data || []).map(t => ({
        id: t.id,
        payee_id: t.payee_id,
        project_id: t.project_id,
        start_time: t.start_time,
        payee_name: t.payees.payee_name,
        project_number: t.projects.project_number,
        project_name: t.projects.project_name,
        hourly_rate: t.payees.hourly_rate
      }));

      setTimers(formatted);
    } catch (error) {
      console.error('Error loading active timers:', error);
      toast.error('Failed to load active timers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveTimers();
    // Refresh every 30 seconds
    const interval = setInterval(loadActiveTimers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleForceClockOut = (timer: ActiveTimer) => {
    setSelectedTimer(timer);
    const startTimeDate = new Date(timer.start_time);
    const hoursElapsed =
      (Date.now() - startTimeDate.getTime()) / (1000 * 60 * 60);

    // Smart default end time:
    //   - If timer's been running ≤ LONG_SHIFT_HOURS, default to "now"
    //     (admin is closing a timer that's still within plausible-shift range).
    //   - If older, default to start_time + 8 hours (a standard shift). This
    //     prevents the multi-day astronomical-cost bug where a forgotten
    //     timer × hourly_rate produces $5K+ entries on force-close.
    //
    // Admin can still override either default in the dialog. The point is to
    // make "Just click Clock Out" produce a sane number on stale timers.
    let defaultEnd: Date;
    if (hoursElapsed > LONG_SHIFT_HOURS) {
      defaultEnd = new Date(startTimeDate.getTime() + 8 * 60 * 60 * 1000);
    } else {
      defaultEnd = new Date();
    }
    setEndTime(format(defaultEnd, "yyyy-MM-dd'T'HH:mm"));
    setLunchTaken(false);
    setLunchDuration(DEFAULT_LUNCH_DURATION);
    setForceClockOutOpen(true);
  };

  const handleDiscardClick = () => {
    setForceClockOutOpen(false);
    setDiscardConfirmOpen(true);
  };

  const handleConvertToPtoClick = () => {
    setForceClockOutOpen(false);
    setConvertPtoConfirmOpen(true);
  };

  const confirmForceClockOut = async () => {
    if (!selectedTimer || !endTime) return;

    setProcessing(true);
    try {
      const endTimeDate = new Date(endTime);
      const startTimeDate = new Date(selectedTimer.start_time);

      if (endTimeDate <= startTimeDate) {
        toast.error('End time must be after start time');
        setProcessing(false);
        return;
      }

      const grossHours = (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60 * 60);
      const lunchHours = lunchTaken ? lunchDuration / 60 : 0;
      const netHours = Math.max(0, grossHours - lunchHours);

      if (netHours <= 0) {
        toast.error('Lunch duration cannot exceed shift duration');
        setProcessing(false);
        return;
      }

      // Hard cap — 24h is the most a single shift could possibly be. Past that
      // we refuse without explicit re-acknowledgement so a stuck-timer × rate
      // can't sneak through as a 5-figure labor expense.
      if (grossHours > HARD_CAP_HOURS) {
        const proceed = window.confirm(
          `⚠️ This will create a ${grossHours.toFixed(1)}-hour entry — well over a normal day.\n\n` +
          `Amount: $${(netHours * selectedTimer.hourly_rate).toFixed(2)}\n\n` +
          `Continue, or cancel and pick a more accurate end time?`
        );
        if (!proceed) {
          setProcessing(false);
          return;
        }
      }

      const amount = netHours * selectedTimer.hourly_rate;

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('expenses')
        .update({
          end_time: endTimeDate.toISOString(),
          amount: amount,
          lunch_taken: lunchTaken,
          lunch_duration_minutes: lunchTaken ? lunchDuration : null,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTimer.id);

      if (error) throw error;

      toast.success(lunchTaken
          ? `Clocked out ${selectedTimer.payee_name} (${netHours.toFixed(2)} hours, ${lunchDuration}min lunch)`
          : `Clocked out ${selectedTimer.payee_name} (${netHours.toFixed(2)} hours)`);

      resetDialogState();
      await loadActiveTimers();
      onTimerClosed?.();
    } catch (error) {
      console.error('Error force clocking out:', error);
      toast.error('Failed to clock out timer');
    } finally {
      setProcessing(false);
    }
  };

  const confirmDiscard = async () => {
    if (!selectedTimer) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', selectedTimer.id);
      if (error) throw error;
      toast.success(`Discarded stale timer for ${selectedTimer.payee_name}`);
      resetDialogState();
      await loadActiveTimers();
      onTimerClosed?.();
    } catch (error) {
      console.error('Error discarding timer:', error);
      toast.error('Failed to discard timer');
    } finally {
      setProcessing(false);
    }
  };

  const confirmConvertToPto = async () => {
    if (!selectedTimer) return;
    setProcessing(true);
    try {
      // PTO entries are duration-only: clear start_time/end_time, set 8 hours,
      // and zero out the amount (PTO categorization happens via the DB trigger
      // based on the linked payee's shape; for internal employees the manual
      // form computes hours×rate, but for fixing a mistake-clocked-in PTO
      // entry the safest move is hours=8, amount=0 — admin can edit hours/rate
      // afterward via the normal time entry edit flow if needed).
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('expenses')
        .update({
          start_time: null,
          end_time: null,
          hours: 8,
          gross_hours: 8,
          amount: 0,
          lunch_taken: false,
          lunch_duration_minutes: null,
          description: 'PTO entry (converted from stale timer)',
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTimer.id);
      if (error) throw error;
      toast.success(
        `Converted to PTO entry for ${selectedTimer.payee_name} (8 hours, no times)`,
        { description: 'Edit the entry from Time Entries if you need to adjust hours.' }
      );
      resetDialogState();
      await loadActiveTimers();
      onTimerClosed?.();
    } catch (error) {
      console.error('Error converting to PTO:', error);
      toast.error('Failed to convert to PTO entry');
    } finally {
      setProcessing(false);
    }
  };

  const resetDialogState = () => {
    setForceClockOutOpen(false);
    setDiscardConfirmOpen(false);
    setConvertPtoConfirmOpen(false);
    setSelectedTimer(null);
    setEndTime('');
    setLunchTaken(false);
    setLunchDuration(DEFAULT_LUNCH_DURATION);
  };

  // Computed in render based on current dialog state
  const computedDuration = useMemo(() => {
    if (!selectedTimer || !endTime) return null;
    const startTimeDate = new Date(selectedTimer.start_time);
    const endTimeDate = new Date(endTime);
    if (endTimeDate <= startTimeDate) return null;
    const grossHours = (endTimeDate.getTime() - startTimeDate.getTime()) / (1000 * 60 * 60);
    const lunchHours = lunchTaken ? lunchDuration / 60 : 0;
    const netHours = Math.max(0, grossHours - lunchHours);
    return {
      grossHours,
      netHours,
      amount: netHours * (selectedTimer.hourly_rate || 0),
      isLong: grossHours > LONG_SHIFT_HOURS,
      isOverHardCap: grossHours > HARD_CAP_HOURS,
    };
  }, [selectedTimer, endTime, lunchTaken, lunchDuration]);

  const selectedIsPTO = selectedTimer ? isPTOProject(selectedTimer.project_number) : false;

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading timers...</div>;
  }

  if (timers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No active timers</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timers.map(timer => {
            const staleCheck = checkStaleTimer(new Date(timer.start_time));
            const duration = formatDistanceToNow(new Date(timer.start_time), { addSuffix: false });
            const ptoMistake = isPTOProject(timer.project_number);

            return (
              <TableRow key={timer.id}>
                <TableCell className="font-medium">{timer.payee_name}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="flex items-center gap-1.5">
                      {timer.project_number}
                      {ptoMistake && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-sm bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200"
                          title="PTO entries should be duration-only — this looks like a mistaken clock-in"
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          PTO mistake
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground">{timer.project_name}</div>
                  </div>
                </TableCell>
                <TableCell>{format(new Date(timer.start_time), 'MMM d, h:mm a')}</TableCell>
                <TableCell>{duration}</TableCell>
                <TableCell>
                  {staleCheck.shouldAutoClose ? (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Over 24h
                    </span>
                  ) : staleCheck.isStale ? (
                    <span className="flex items-center gap-1 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      Over 12h
                    </span>
                  ) : (
                    <span className="text-green-600">Active</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleForceClockOut(timer)}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Force Clock Out
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={forceClockOutOpen} onOpenChange={(o) => { if (!o) resetDialogState(); else setForceClockOutOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Clock Out</DialogTitle>
            <DialogDescription>
              {selectedIsPTO
                ? "This is a PTO project (sick / vacation / holiday) — clocking out at a wall-clock time will create a wrong cost. Convert it to a proper PTO entry instead."
                : `Manually clock out ${selectedTimer?.payee_name}. Specify the end time for this work session.`}
            </DialogDescription>
          </DialogHeader>

          {selectedTimer && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg text-sm space-y-0.5">
                <div><strong>Worker:</strong> {selectedTimer.payee_name}</div>
                <div><strong>Project:</strong> {selectedTimer.project_number} · {selectedTimer.project_name}</div>
                <div><strong>Started:</strong> {format(new Date(selectedTimer.start_time), 'MMM d, yyyy h:mm a')}</div>
                <div className="text-xs text-muted-foreground pt-1">
                  Running for {formatDistanceToNow(new Date(selectedTimer.start_time))}.
                </div>
              </div>

              {selectedIsPTO && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-medium">PTO clock-in detected</div>
                      <div className="text-xs">
                        Sick / vacation / holiday entries should be entered as a fixed number of hours, not as a real-time timer. Use the "Convert to PTO entry" button below to set this to 8 hours and remove the start/end times.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!selectedIsPTO && (
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    min={format(new Date(selectedTimer.start_time), "yyyy-MM-dd'T'HH:mm")}
                    max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pre-filled with a sensible default ({format(new Date(selectedTimer.start_time), 'MMM d')} +
                    {' '}
                    {(() => {
                      const startTimeDate = new Date(selectedTimer.start_time);
                      const hoursElapsed =
                        (Date.now() - startTimeDate.getTime()) / (1000 * 60 * 60);
                      return hoursElapsed > LONG_SHIFT_HOURS ? '8h shift cap' : 'now';
                    })()}
                    ). Adjust if you know the actual end.
                  </p>
                </div>
              )}

              {!selectedIsPTO && (
                <LunchToggle
                  lunchTaken={lunchTaken}
                  onLunchTakenChange={setLunchTaken}
                  lunchDuration={lunchDuration}
                  onLunchDurationChange={setLunchDuration}
                  compact={true}
                />
              )}

              {!selectedIsPTO && computedDuration && (
                <div className={
                  computedDuration.isOverHardCap
                    ? 'rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 space-y-1'
                    : computedDuration.isLong
                    ? 'rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1'
                    : 'rounded-md border bg-muted/40 p-3 text-sm space-y-1'
                }>
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Resulting entry
                    </span>
                    {(computedDuration.isOverHardCap || computedDuration.isLong) && (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="font-mono text-sm">
                    {computedDuration.netHours.toFixed(2)} hours · ${computedDuration.amount.toFixed(2)}
                  </div>
                  {computedDuration.isOverHardCap && (
                    <div className="text-xs">
                      Over 24 hours — almost certainly a stuck timer. Pick a real end time or use Discard.
                    </div>
                  )}
                  {computedDuration.isLong && !computedDuration.isOverHardCap && (
                    <div className="text-xs">
                      Long shift — double-check the end time before saving.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {selectedIsPTO ? (
              <>
                <Button
                  variant="outline"
                  onClick={resetDialogState}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDiscardClick}
                  disabled={processing}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Discard
                </Button>
                <Button onClick={handleConvertToPtoClick} disabled={processing}>
                  <ArrowLeftRight className="h-4 w-4 mr-1" />
                  Convert to PTO entry
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={resetDialogState}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDiscardClick}
                  disabled={processing}
                  title="Delete this timer entirely (use when it's a stale/forgotten one with no real shift)"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Discard timer
                </Button>
                <Button
                  onClick={confirmForceClockOut}
                  disabled={!endTime || processing}
                >
                  {processing ? 'Processing...' : 'Clock Out'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard confirmation — destructive, requires explicit yes */}
      <AlertDialog
        open={discardConfirmOpen}
        onOpenChange={(o) => { if (!o) resetDialogState(); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this timer?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the timer row entirely — no time entry is created and no expense is recorded. Use this for stale or mistakenly-started timers. This cannot be undone.
              {selectedTimer && (
                <span className="block mt-2 font-medium text-foreground">
                  {selectedTimer.payee_name} · {selectedTimer.project_number} · started{' '}
                  {format(new Date(selectedTimer.start_time), 'MMM d, h:mm a')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Keep timer</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscard}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? 'Discarding...' : 'Yes, discard'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert-to-PTO confirmation */}
      <AlertDialog
        open={convertPtoConfirmOpen}
        onOpenChange={(o) => { if (!o) resetDialogState(); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to PTO entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Sets this entry to 8 hours, removes the start/end times, and zeros out the amount. The DB trigger will recategorize cost via the linked payee on next save.
              {selectedTimer && (
                <span className="block mt-2 font-medium text-foreground">
                  {selectedTimer.payee_name} · {selectedTimer.project_number} · started{' '}
                  {format(new Date(selectedTimer.start_time), 'MMM d, h:mm a')}
                </span>
              )}
              <span className="block mt-2 text-xs text-muted-foreground">
                You can still edit the hours afterward from Time Entries if 8 isn&apos;t right.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvertToPto} disabled={processing}>
              {processing ? 'Converting...' : 'Convert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
