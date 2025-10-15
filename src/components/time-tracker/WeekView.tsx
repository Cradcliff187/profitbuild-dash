import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  hours: number;
  note: string;
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
          payees!expenses_payee_id_fkey(payee_name),
          projects!expenses_project_id_fkey(project_number, project_name, client_name, address)
        `)
        .eq('category', 'labor_internal')
        .gte('expense_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('expense_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (entriesError) throw entriesError;

      const formattedEntries = entriesData.map(entry => ({
        ...entry,
        payee: entry.payees,
        project: entry.projects,
        hours: parseFloat(entry.description.match(/(\d+\.?\d*)\s*hours?/i)?.[1] || '0'),
        note: entry.description.replace(/\d+\.?\d*\s*hours?/i, '').trim()
      }));

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
      <div className="bg-card rounded-xl shadow-sm p-4 mb-4 border">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-3xl font-bold text-primary">
              {entries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)} hrs
            </div>
            <div className="text-sm text-muted-foreground">
              Total hours this week • {entries.length} entries
            </div>
          </div>
        </div>
      </div>

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
          const dayEntries = entries.filter(e => 
            isSameDay(new Date(e.expense_date), day)
          );
          
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
              {dayEntries.map(entry => (
                <div 
                  key={entry.id} 
                  className="bg-card rounded-xl shadow-sm p-4 border-l-4 border-primary cursor-pointer hover:shadow-md transition-shadow border"
                  onClick={() => onEditEntry(entry)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      {/* Team Member */}
                      <div className="font-semibold text-foreground">
                        {entry.payee.payee_name}
                      </div>
                      
                      {/* Project Info */}
                      <div className="text-sm text-muted-foreground">
                        {entry.project.project_number} - {entry.project.client_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.project.project_name}
                      </div>
                      {entry.project.address && (
                        <div className="text-xs text-muted-foreground">
                          {entry.project.address}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      {/* Hours */}
                      <div className="font-bold text-primary">
                        {entry.hours.toFixed(2)} hrs
                      </div>
                      
                      {/* Status Badge */}
                      {entry.approval_status && entry.approval_status !== 'draft' && (
                        <Badge 
                          variant={
                            entry.approval_status === 'approved' ? 'default' :
                            entry.approval_status === 'pending' ? 'secondary' :
                            entry.approval_status === 'rejected' ? 'destructive' :
                            'outline'
                          }
                          className="text-xs mt-1"
                        >
                          {entry.approval_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Note */}
                  {entry.note && (
                    <div className="bg-muted rounded p-2 text-sm text-muted-foreground mt-2">
                      {entry.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
};
