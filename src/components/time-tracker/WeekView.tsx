import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimeEntry {
  id: string;
  payee_id: string;
  project_id: string;
  expense_date: string;
  amount: number;
  description: string;
  approval_status?: string;
  payee_name?: string;
  project_name?: string;
}

interface WeekViewProps {
  onEditEntry: (entry: TimeEntry) => void;
  onCreateEntry: () => void;
}

export const WeekView = ({ onEditEntry, onCreateEntry }: WeekViewProps) => {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Array<{ id: string; name: string }>>([]);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadWeekData();
  }, [weekStart]);

  const loadWeekData = async () => {
    try {
      setLoading(true);

      // Load entries for the week
      const { data: entriesData, error: entriesError } = await supabase
        .from('expenses')
        .select(`
          *,
          payees!expenses_payee_id_fkey(payee_name),
          projects!expenses_project_id_fkey(project_name)
        `)
        .eq('category', 'labor_internal')
        .gte('expense_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('expense_date', { ascending: true });

      if (entriesError) throw entriesError;

      const formattedEntries = entriesData.map(entry => ({
        ...entry,
        payee_name: entry.payees?.payee_name,
        project_name: entry.projects?.project_name,
      }));

      setEntries(formattedEntries);

      // Get unique workers
      const uniqueWorkers = Array.from(
        new Map(
          formattedEntries.map(e => [e.payee_id, { id: e.payee_id, name: e.payee_name || 'Unknown' }])
        ).values()
      );
      setWorkers(uniqueWorkers);
    } catch (error) {
      console.error('Error loading week data:', error);
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const getEntriesForWorkerAndDay = (workerId: string, day: Date) => {
    return entries.filter(
      e => e.payee_id === workerId && isSameDay(new Date(e.expense_date), day)
    );
  };

  const getDayTotal = (day: Date) => {
    const dayEntries = entries.filter(e => isSameDay(new Date(e.expense_date), day));
    return dayEntries.reduce((sum, e) => {
      const hours = parseFloat(e.description.match(/(\d+\.?\d*)\s*hours?/i)?.[1] || '0');
      return sum + hours;
    }, 0);
  };

  const getWorkerTotal = (workerId: string) => {
    const workerEntries = entries.filter(e => e.payee_id === workerId);
    return workerEntries.reduce((sum, e) => {
      const hours = parseFloat(e.description.match(/(\d+\.?\d*)\s*hours?/i)?.[1] || '0');
      return sum + hours;
    }, 0);
  };

  const getStatusBadge = (status?: string) => {
    if (!status || status === 'draft') return null;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      locked: 'outline',
    };
    
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading timesheet...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Compact Week Navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={goToPreviousWeek} className="h-7 w-7 p-0">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToToday} className="h-7 px-2 text-xs">
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={goToNextWeek} className="h-7 w-7 p-0">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={onCreateEntry} className="h-7 px-2 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Compact Week Grid */}
      <Card className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b bg-muted/30">
            <div className="p-1.5 text-[11px] font-medium border-r">Worker</div>
            {weekDays.map((day, i) => (
              <div key={i} className="p-1.5 text-center text-[11px] font-medium border-r last:border-r-0">
                <div>{format(day, 'EEE')}</div>
                <div className="text-muted-foreground text-[10px]">{format(day, 'd')}</div>
              </div>
            ))}
          </div>

          {/* Worker Rows */}
          {workers.map(worker => (
            <div key={worker.id} className="grid grid-cols-8 border-b last:border-b-0 hover:bg-muted/20">
              <div className="p-1.5 text-xs border-r font-medium truncate">
                {worker.name}
              </div>
              {weekDays.map((day, i) => {
                const dayEntries = getEntriesForWorkerAndDay(worker.id, day);
                const totalHours = dayEntries.reduce((sum, e) => {
                  const hours = parseFloat(e.description.match(/(\d+\.?\d*)\s*hours?/i)?.[1] || '0');
                  return sum + hours;
                }, 0);

                return (
                  <div
                    key={i}
                    className="p-1.5 text-center border-r last:border-r-0 cursor-pointer hover:bg-accent/50"
                    onClick={() => dayEntries[0] && onEditEntry(dayEntries[0])}
                  >
                    {totalHours > 0 ? (
                      <div className="space-y-0.5">
                        <div className={`text-xs font-medium ${
                          totalHours < 8 ? 'text-yellow-600' : 
                          totalHours === 8 ? 'text-green-600' : 
                          'text-blue-600'
                        }`}>
                          {totalHours.toFixed(1)}
                        </div>
                        {dayEntries.length > 0 && getStatusBadge(dayEntries[0].approval_status)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground">---</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Totals Row */}
          <div className="grid grid-cols-8 bg-muted/40">
            <div className="p-1.5 text-xs font-medium border-r">Daily Total</div>
            {weekDays.map((day, i) => {
              const total = getDayTotal(day);
              return (
                <div key={i} className="p-1.5 text-center text-xs font-medium border-r last:border-r-0">
                  {total > 0 ? total.toFixed(1) : '---'}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Compact Summary */}
      <div className="text-[10px] text-muted-foreground text-right">
        Total entries: {entries.length} • 
        Total hours: {entries.reduce((sum, e) => {
          const hours = parseFloat(e.description.match(/(\d+\.?\d*)\s*hours?/i)?.[1] || '0');
          return sum + hours;
        }, 0).toFixed(1)}
      </div>
    </div>
  );
};
