import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Square, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { checkStaleTimer } from '@/utils/timeEntryValidation';
import { LunchToggle } from '@/components/time-tracker/LunchToggle';
import { DEFAULT_LUNCH_DURATION } from '@/utils/timeEntryCalculations';

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

  const loadActiveTimers = async () => {
    try {
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
    // Default to current time
    setEndTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setLunchTaken(false);
    setLunchDuration(DEFAULT_LUNCH_DURATION);
    setForceClockOutOpen(true);
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

      setForceClockOutOpen(false);
      setSelectedTimer(null);
      setEndTime('');
      setLunchTaken(false);
      setLunchDuration(DEFAULT_LUNCH_DURATION);
      await loadActiveTimers();
      onTimerClosed?.();
      
    } catch (error) {
      console.error('Error force clocking out:', error);
      toast.error('Failed to clock out timer');
    } finally {
      setProcessing(false);
    }
  };

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
            
            return (
              <TableRow key={timer.id}>
                <TableCell className="font-medium">{timer.payee_name}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{timer.project_number}</div>
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

      <Dialog open={forceClockOutOpen} onOpenChange={setForceClockOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Clock Out</DialogTitle>
            <DialogDescription>
              Manually clock out {selectedTimer?.payee_name}. Specify the end time for this work session.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTimer && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg text-sm">
                <div><strong>Worker:</strong> {selectedTimer.payee_name}</div>
                <div><strong>Project:</strong> {selectedTimer.project_number}</div>
                <div><strong>Started:</strong> {format(new Date(selectedTimer.start_time), 'MMM d, yyyy h:mm a')}</div>
              </div>
              
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
                  Must be after start time and not in the future
                </p>
              </div>
              
              <LunchToggle
                lunchTaken={lunchTaken}
                onLunchTakenChange={setLunchTaken}
                lunchDuration={lunchDuration}
                onLunchDurationChange={setLunchDuration}
                compact={true}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setForceClockOutOpen(false);
                setSelectedTimer(null);
                setEndTime('');
                setLunchTaken(false);
                setLunchDuration(DEFAULT_LUNCH_DURATION);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmForceClockOut}
              disabled={!endTime || processing}
            >
              {processing ? 'Processing...' : 'Clock Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

