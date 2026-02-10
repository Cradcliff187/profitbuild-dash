import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRoles } from '@/contexts/RoleContext';

// PTO/Overhead project numbers that don't have traditional start/end times
const PTO_PROJECT_NUMBERS = ['006-SICK', '007-VAC', '008-HOL'];

const isPTOProject = (projectNumber: string): boolean => {
  return PTO_PROJECT_NUMBERS.includes(projectNumber);
};

const formatTime = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return null;
  }
};

interface TimeEntry {
  id: string;
  payee_id: string;
  project_id: string;
  expense_date: string;
  amount: number;
  description: string;
  approval_status?: string;
  attachment_url?: string;
  hours: number;
  start_time?: string;
  end_time?: string;
  lunch_taken?: boolean;
  lunch_duration_minutes?: number | null;
  gross_hours?: number;
  payee: {
    payee_name: string;
  };
  project: {
    project_number: string;
    project_name: string;
    client_name: string;
    address?: string;
  };
}

interface WeekViewProps {
  onEditEntry: (entry: TimeEntry) => void;
  onCreateEntry: () => void;
}

export const WeekView = ({ onEditEntry, onCreateEntry }: WeekViewProps) => {
  const { isAdmin, isManager } = useRoles();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    loadWeekData();
  }, [weekStart]);

  const loadWeekData = async () => {
    try {
      setLoading(true);

      // Load entries for the week - show ALL entries regardless of status
      const { data: entriesData, error: entriesError } = await supabase
        .from('expenses')
        .select(`
          *,
          payees!expenses_payee_id_fkey(payee_name, hourly_rate),
          projects!expenses_project_id_fkey(project_number, project_name, client_name, address)
        `)
        .eq('category', 'labor_internal')
        .gte('expense_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;

      const formattedEntries = entriesData.map(entry => {
        const hours = entry.hours ?? 0;
        return {
          ...entry,
          payee: entry.payees,
          project: entry.projects,
          hours,
          gross_hours: entry.gross_hours ?? hours
        };
      });

      setEntries(formattedEntries);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading timesheet...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={goToNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week Summary Card */}
      {(() => {
        const totalPaidHours = entries.reduce((sum, e) => sum + e.hours, 0);
        const totalShiftHours = entries.reduce((sum, e) => sum + (e.gross_hours || e.hours), 0);
        const hasLunchDeductions = totalShiftHours > totalPaidHours + 0.01;
        
        return (
          <div className="bg-card rounded-xl shadow-sm p-4 mb-4 border">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {totalPaidHours.toFixed(1)} hrs{hasLunchDeductions ? ' paid' : ''}
                </div>
                <div className="text-sm text-muted-foreground">
                  {hasLunchDeductions 
                    ? `${totalShiftHours.toFixed(1)} hrs shift • ${entries.length} entries`
                    : `${entries.length} entries this week`
                  }
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Empty State */}
      {entries.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm p-8 text-center border">
          <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-semibold mb-2">No time entries this week</p>
          <p className="text-sm text-muted-foreground">Entries will appear here once logged</p>
        </div>
      ) : (
        // Group entries by date
        weekDays.map(day => {
          const dayEntries = entries.filter(e => {
            // Parse date string as local date, not UTC
            const [year, month, dayNum] = e.expense_date.split('-').map(Number);
            const entryDate = new Date(year, month - 1, dayNum);
            return isSameDay(entryDate, day);
          });
          
          if (dayEntries.length === 0) return null;
          
          const dayTotal = dayEntries.reduce((sum, e) => sum + e.hours, 0);
          
          return (
            <div key={day.toISOString()} className="space-y-2">
              {/* Day Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
                <div className="text-sm font-semibold">
                  {format(day, 'EEEE, MMM d')}
                </div>
                <div className="text-sm font-medium text-primary">
                  {dayTotal.toFixed(1)} hrs
                </div>
              </div>
              
              {/* Day's Time Entry Cards */}
              {dayEntries.map(entry => {
                const isPTO = isPTOProject(entry.project.project_number);
                const hasLunch = entry.lunch_taken && entry.lunch_duration_minutes && entry.lunch_duration_minutes > 0;
                const showShiftHours = hasLunch && entry.gross_hours && Math.abs(entry.gross_hours - entry.hours) > 0.01;
                const isLongShiftNoLunch = !isPTO && !entry.lunch_taken && entry.gross_hours && entry.gross_hours > 6;

                return (
                  <div 
                    key={entry.id} 
                    className="bg-card rounded-xl shadow-sm p-4 border-l-4 border-primary cursor-pointer hover:shadow-md transition-shadow border"
                    onClick={() => onEditEntry(entry)}
                  >
                    {/* Row 0: Employee Name (Admin/Manager only) */}
                    {(isAdmin || isManager) && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {entry.payee.payee_name}
                      </div>
                    )}
                    
                    {/* Row 1: Project/PTO Name + Status Badge */}
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-foreground text-sm">
                        {isPTO 
                          ? entry.project.project_name 
                          : `${entry.project.project_number} - ${entry.project.project_name}`
                        }
                      </div>
                      <Badge 
                        variant={
                          entry.approval_status === 'approved' ? 'default' :
                          entry.approval_status === 'rejected' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs ml-2 shrink-0"
                      >
                        {entry.approval_status || 'pending'}
                      </Badge>
                    </div>
                    
                    {/* Row 2: Time Range (only for non-PTO entries with times) */}
                    {!isPTO && entry.start_time && entry.end_time && (
                      <div className="text-sm text-muted-foreground mb-2">
                        {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                      </div>
                    )}
                    
                    {/* Row 3: Hours Display + Lunch Badge */}
                    <div className="flex justify-between items-end">
                      <div className="space-y-0.5">
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span className="w-10">Shift:</span>
                          <span className="font-mono">{(entry.gross_hours || entry.hours).toFixed(1)} hrs</span>
                        </div>
                        <div className="flex gap-2 text-sm">
                          <span className="w-10 text-muted-foreground">Paid:</span>
                          <span className="font-mono font-semibold text-primary">{entry.hours.toFixed(1)} hrs</span>
                        </div>
                      </div>
                      
                      {/* Lunch Status - ALWAYS show */}
                      {!isPTO && (
                        hasLunch ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs">
                            <CheckSquare className="h-3 w-3" />
                            <span>{entry.lunch_duration_minutes}m</span>
                          </div>
                        ) : (entry.gross_hours && entry.gross_hours > 6) ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs">
                            <AlertTriangle className="h-3 w-3" />
                            <span>No lunch</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                            <span>No lunch</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
};
