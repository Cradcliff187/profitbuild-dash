import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Calendar, AlertTriangle, Camera, BarChart3, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { WeekView } from './WeekView';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';
import { CreateTimeEntryDialog } from './CreateTimeEntryDialog';
import { BulkActionsBar } from './BulkActionsBar';
import { SyncStatusBanner } from './SyncStatusBanner';
import { ReceiptsList } from './ReceiptsList';
import { ProjectScheduleSelector } from './ProjectScheduleSelector';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectCategoryOrFilter, isProjectVisibleByCategory } from '@/utils/sandboxPreferences';
import { useRoles } from '@/contexts/RoleContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { isPTOProject } from '@/utils/timeEntries';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  address?: string;
  category?: string;
}

interface TeamMember {
  id: string;
  payee_name: string;
  hourly_rate: number;
  email?: string;
  is_internal?: boolean;
  provides_labor?: boolean;
  user_id?: string;
}

interface TimeEntry {
  id: string;
  teamMember: TeamMember;
  project: Project;
  hours: number;
  receiptUrl?: string;
  attachment_url?: string;
  startTime: Date;
  endTime: Date;
  startTimeString?: string;
  endTimeString?: string;
  approval_status?: string;
  lunch_taken?: boolean;
  lunch_duration_minutes?: number | null;
  gross_hours?: number;
}

/**
 * /time-tracker for admins, managers, and flag-off field workers: Entries +
 * Receipts. (Field-only users with field_worker_v2 ON get FieldTimeLanding.)
 *
 * The LIVE TIMER (clock in / clock out) was retired Sep 9 2026. It was used
 * once in the 90 days before the v2 rollout (355/356 entries were manual
 * quarter-hour values), it could not close its own >24h timers, and it left
 * a 145-hour open row that Role Management could not see (Gotcha #79). Time
 * is entered through the manual form. Rows that were already open when the
 * timer was retired are closed by an admin from Role Management → Active
 * Timers. Don't bring the timer back without new usage evidence (Rule 35).
 *
 * Auth-loop discipline (Gotchas #53-56/#63): no realtime, no auth.getUser()
 * on this path; today's entries reload on mount and on explicit actions.
 */
export const MobileTimeTracker: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isAdmin, isManager } = useRoles();
  const { isOnline } = useOnlineStatus();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<'entries' | 'receipts'>('entries');
  const [entriesDateRange, setEntriesDateRange] = useState<'today' | 'week'>('today');
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showScheduleSelector, setShowScheduleSelector] = useState(false);

  // Apply URL parameters to set initial view
  useEffect(() => {
    const tabParam = searchParams.get('tab');

    if (tabParam === 'receipts') {
      setView('receipts');
    } else if (tabParam === 'entries') {
      setView('entries');
    }

    // When deep-linked via ?tab=, blur whatever element React focused on
    // mount so the lingering :focus-visible outline (orange ring around the
    // active tab) doesn't render. Keyboard users still get full focus rings
    // on subsequent tab navigation; mouse/touch users from the sidebar see
    // the tab in its clean active state without the extra outline.
    if (tabParam === 'receipts' || tabParam === 'entries') {
      requestAnimationFrame(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
    }
    // Note: status filtering for receipts is handled by ReceiptsList component
  }, [searchParams]);

  // Load projects (for the Job FAB) and today's entries on mount
  useEffect(() => {
    if (user) {
      loadInitialData();
      loadTodayEntries();
    }
  }, [user]);

  // Update current time every second (status row clock)
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    setDataLoading(true);
    try {
      // Load active projects (exclude system projects).
      // `.range(0, 499)` raises the cap from the previous hard-coded `.limit(20)` which
      // silently dropped projects past position 20 once the count of active construction
      // projects exceeded that (first surfaced Apr 16, 2026 — project 225-110 fell off
      // the end of the alphabetical list). 500 is well beyond current scale (~24 active)
      // and still within a reasonable mobile list size without pagination.
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name, address, category')
        .in('status', ['approved', 'in_progress'])
        .or(getProjectCategoryOrFilter())
        .order('project_number', { ascending: true })
        .range(0, 499);

      if (projectsError) throw projectsError;

      // Defense-in-depth: re-apply the visibility predicate client-side so a
      // stale cached row can't slip through if the toggle flipped between fetch
      // and render.
      const cleanedProjects = (projectsData || []).filter(p =>
        isProjectVisibleByCategory(p)
      );
      setProjects(cleanedProjects);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error Loading Data', { description: 'Failed to load projects' });
    } finally {
      setDataLoading(false);
    }
  };

  // P0 (May 12, 2026): real-time subscription DISABLED.
  //
  // Companion to PR #65 (usePendingCounts), PR #66 (autoRefreshToken=false),
  // and PR #67 (Dashboard / ActivityFeedList / useUnreadMentions). MobileTimeTracker
  // mounts on /time-tracker — which is the immediate post-login landing page
  // for pure field workers (AppLayout redirects them off / and /dashboard).
  // Subscribing two postgres_changes channels on mount put exactly the same
  // auth.getSession() → _callRefreshToken pressure on the post-login critical
  // path that PR #67 removed from the admin path, just for field workers
  // instead. Even with autoRefreshToken=false the subscribe path's internal
  // _getAccessToken → __loadSession can still refresh in the expiry-margin
  // window. See Gotcha #53.
  //
  // Today's entries refresh on mount and on explicit user actions (create,
  // edit, delete reload locally). Same trade-off PR #67 made for Dashboard
  // pending approvals.

  const loadTodayEntries = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // P0 (May 12, 2026): use `user` from useAuth and `isAdmin`/`isManager`
      // from useRoles instead of `supabase.auth.getUser()` + a follow-up
      // `from('user_roles')` query. Both are already available in this
      // component's scope. The previous getUser() call on mount races against
      // the just-saved session on the post-login burst — on a slow miss it
      // throws AuthSessionMissingError, supabase-js unconditionally fires
      // _removeSession() → SIGNED_OUT → AppLayout bounces to /auth. Same
      // class as Gotcha #54 (AuthContext.signIn race), just on the
      // /time-tracker landing instead of the signin handler.

      let query = supabase
        .from('expenses')
        .select(`
          id,
          amount,
          expense_date,
          description,
          attachment_url,
          created_at,
          user_id,
          approval_status,
          start_time,
          end_time,
          lunch_taken,
          lunch_duration_minutes,
          gross_hours,
          hours,
          payees!inner(id, payee_name, hourly_rate),
          projects!inner(id, project_number, project_name, client_name, address)
        `)
        .not('start_time', 'is', null)
        .eq('expense_date', today);
      
      // Field workers only see their own entries
      if (!isAdmin && !isManager) {
        query = query.eq('user_id', user?.id || '');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Client-side filter to ensure entries match local timezone date
      const filteredData = (data || []).filter((expense: any) => {
        const localCreatedDate = format(new Date(expense.created_at), 'yyyy-MM-dd');
        const matches = localCreatedDate === today && expense.expense_date === today;
        
        if (!matches) {
          console.debug(`Dropping entry ${expense.id}: created=${localCreatedDate}, expense_date=${expense.expense_date}, today=${today}`);
        }
        
        return matches;
      });

      // Parse entries from expenses
      const entries = filteredData.map((expense: any) => {
        const hourlyRate = expense.payees?.hourly_rate || 75;
        const hours = expense.hours ?? (expense.amount / hourlyRate);
        
        // Prioritize database columns, fallback to description parsing
        let startTimeString: string | undefined;
        let endTimeString: string | undefined;
        let startTime: Date;
        let endTime: Date;
        
        if (expense.start_time && expense.end_time) {
          // Use database timestamps (new entries)
          startTime = new Date(expense.start_time);
          endTime = new Date(expense.end_time);
          startTimeString = formatTime(startTime);
          endTimeString = formatTime(endTime);
        } else {
          // Fallback: Parse times from description (old entries)
          const timeMatch = expense.description.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
          startTime = new Date(expense.created_at);
          
          if (timeMatch) {
            startTimeString = timeMatch[1];
            endTimeString = timeMatch[2];
            endTime = startTime; // Placeholder, actual time in string
          } else if (hours > 0.01) {
            // Calculate times from created_at for old entries
            endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
            startTimeString = formatTime(startTime);
            endTimeString = formatTime(endTime);
          } else {
            endTime = startTime;
            startTimeString = undefined;
            endTimeString = undefined;
          }
        }
        
        // Clean up description to remove redundant info
        const cleanNote = expense.description
          .replace(/Internal Labor\s*-\s*/i, '') // Remove "Internal Labor" prefix
          .replace(/\d+\.?\d*\s*h(?:ou)?rs?\s*-?\s*/i, '') // Remove hours
          .replace(/\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M\s*-?\s*/i, '') // Remove time range
          .replace(/Employee\s+\d+/i, '') // Remove "Employee 1", "Employee 2", etc.
          .replace(/\s*-\s*\w{3}\s+\d{1,2},\s+\d{4}\s*-?\s*/i, '') // Remove date like "Oct 13, 2025"
          .replace(/\s*-\s*[A-Z][a-z]+\s+[A-Z][a-z]+\s*$/i, '') // Remove "FirstName LastName" at end
          .replace(/^\s*-\s*/, '') // Remove leading dash
          .replace(/\s*-\s*$/, '') // Remove trailing dash
          .trim();
        
        return {
          id: expense.id,
          teamMember: expense.payees,
          project: expense.projects,
          payee_id: expense.payees?.id,
          project_id: expense.projects?.id,
          expense_date: expense.expense_date,
          description: expense.description,
          hours,
          note: cleanNote,
          attachment_url: expense.attachment_url,
          user_id: expense.user_id,
          approval_status: expense.approval_status,
          is_locked: expense.is_locked,
          startTime,
          endTime,
          startTimeString,
          endTimeString,
          lunch_taken: expense.lunch_taken || false,
          lunch_duration_minutes: expense.lunch_duration_minutes || null,
          gross_hours: expense.gross_hours ?? hours
        };
      }) || [];

      setTodayEntries(entries);
    } catch (error) {
      console.error('Error loading today entries:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const todayTotal = todayEntries.reduce((sum, entry) => sum + entry.hours, 0);

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <BrandedLoader message="Loading time tracker..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 w-full max-w-[100vw] overflow-x-hidden">
      {/* Sync Status Banner */}
      <SyncStatusBanner />

      {/* Status row — thin, single line. Replaces the previous orange-gradient
          header that had ~80px of filler labels ("Today's Date" / "Current
          Time") above the actual data. Now: one row, semantic typography,
          OFFLINE pill when applicable. Keeps a subtle orange accent dot to
          reinforce brand without dominating the chrome. */}
      <div className="px-4 py-2 bg-card border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />
          <span className="text-sm font-medium truncate">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
          <span className="text-sm font-mono tabular-nums text-muted-foreground">
            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        {!isOnline && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-bg text-warning-fg border border-warning-border text-[10px] font-semibold uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" aria-hidden />
            Offline
          </span>
        )}
      </div>

      {/* Tab Navigation — canonical pill strip pattern (matches R2 unification
          across the app). Entries + Receipts; the Timer tab was retired Sep 2026. */}
      <div className="px-3 py-2 bg-card border-b border-border sticky top-0 z-10">
        <div role="tablist" className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
          <button
            role="tab"
            aria-selected={view === 'entries'}
            type="button"
            onClick={() => setView('entries')}
            className={cn(
              "flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all min-h-[44px] whitespace-nowrap",
              view === 'entries'
                ? "bg-background shadow-sm text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="text-sm">Entries</span>
          </button>
          <button
            role="tab"
            aria-selected={view === 'receipts'}
            type="button"
            onClick={() => setView('receipts')}
            className={cn(
              "flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-all min-h-[44px] whitespace-nowrap",
              view === 'receipts'
                ? "bg-background shadow-sm text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span className="text-sm">Receipts</span>
          </button>
        </div>
      </div>

      {view === 'entries' && (
        <div className="space-y-3">
          {/* Date Range Toggle */}
          <div className="bg-card shadow-sm border-b p-2 sticky top-[57px] z-10">
            <div className="flex gap-2">
              <button
                onClick={() => setEntriesDateRange('today')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  entriesDateRange === 'today'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Today ({todayEntries.length})
              </button>
              <button
                onClick={() => setEntriesDateRange('week')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  entriesDateRange === 'week'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                This Week
              </button>
            </div>
          </div>

          {/* Content based on selected range */}
          {entriesDateRange === 'today' ? (
            <div className="p-4 space-y-3 relative pb-24">
              {(() => {
                const todayShiftTotal = todayEntries.reduce((sum, entry) => {
                  // Use gross_hours from database
                  return sum + (entry.gross_hours ?? entry.hours);
                }, 0);
                const hasLunchDeductions = todayShiftTotal > todayTotal + 0.01;
                
                return (
                  <div className="bg-card rounded-xl shadow-sm p-4">
                    <div className="text-3xl font-bold text-primary">
                      {todayTotal.toFixed(1)} hrs{hasLunchDeductions ? ' paid' : ''}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {hasLunchDeductions 
                        ? `${todayShiftTotal.toFixed(1)} hrs shift • ${todayEntries.length} entries`
                        : `Total today • ${todayEntries.length} entries`
                      }
                    </div>
                  </div>
                );
              })()}
              
              {todayEntries.length === 0 ? (
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl shadow-sm p-8 text-center border-2 border-dashed border-primary/20">
                  <Clock className="w-20 h-20 mx-auto text-primary mb-4" />
                  <p className="text-foreground font-bold text-lg mb-2">No time logged today</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Add your hours for the day — project, start and end time, lunch.
                  </p>
                  <Button onClick={() => setShowManualEntry(true)} className="mt-2">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Add entry
                  </Button>
                </div>
              ) : (
                todayEntries.map(entry => {
                  const isPTO = isPTOProject(entry.project.project_number);
                  
                  // Use gross_hours from database
                  const grossHours = entry.gross_hours ?? entry.hours;
                  
                  // Use explicit lunch fields
                  const hasLunch = entry.lunch_taken && entry.lunch_duration_minutes && entry.lunch_duration_minutes > 0;
                  const lunchMinutes = hasLunch ? entry.lunch_duration_minutes : 0;
                  const showShiftHours = hasLunch && grossHours && Math.abs(grossHours - entry.hours) > 0.01;
                  const isLongShiftNoLunch = !isPTO && !entry.lunch_taken && grossHours > 6;
                  
                  return (
                    <div 
                      key={entry.id} 
                      className="bg-card rounded-xl shadow-sm p-4 border-l-4 border-primary cursor-pointer hover:shadow-md transition-shadow"
                      onClick={async () => {
                        const { data, error } = await supabase
                          .from('expenses')
                          .select('*')
                          .eq('id', entry.id)
                          .single();
                        if (error) { console.error('Failed to load time entry:', error); return; }
                        if (data) setEditingEntry(data);
                      }}
                    >
                      {/* Row 0: Employee Name (Admin/Manager only) */}
                      {(isAdmin || isManager) && (
                        <div className="text-xs text-muted-foreground mb-1">
                          {entry.teamMember.payee_name}
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
                      {!isPTO && entry.startTimeString && entry.endTimeString && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {entry.startTimeString} - {entry.endTimeString}
                        </div>
                      )}
                      
                      {/* Row 3: Hours Display + Lunch Badge */}
                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                          <div className="flex gap-2 text-sm text-muted-foreground">
                            <span className="w-10">Shift:</span>
                            <span className="font-mono">{grossHours.toFixed(1)} hrs</span>
                          </div>
                          <div className="flex gap-2 text-sm">
                            <span className="w-10 text-muted-foreground">Paid:</span>
                            <span className="font-mono font-semibold text-primary">{entry.hours.toFixed(1)} hrs</span>
                          </div>
                        </div>
                        
                        {/* Lunch Status - ALWAYS show */}
                        {!isPTO && (
                          hasLunch && lunchMinutes > 0 ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs">
                              <CheckSquare className="h-3 w-3" />
                              <span>{lunchMinutes}m</span>
                            </div>
                          ) : grossHours > 6 ? (
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
                })
              )}
              
            </div>
          ) : (
            <div className="p-4">
              <WeekView
                onEditEntry={(entry) => setEditingEntry(entry)}
                onCreateEntry={() => setShowManualEntry(true)}
              />
            </div>
          )}
        </div>
      )}

      {/* Receipts View */}
      {view === 'receipts' && (
        <div className="w-full max-w-full overflow-x-hidden">
          <ReceiptsList />
        </div>
      )}

      {/* Edit Time Entry Dialog */}
      <EditTimeEntryDialog
        entry={editingEntry}
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        onSaved={() => {
          loadTodayEntries();
          setEditingEntry(null);
        }}
      />

      {/* Create Time Entry Dialog */}
      <CreateTimeEntryDialog
        open={showManualEntry}
        onOpenChange={setShowManualEntry}
        onSaved={() => {
          loadTodayEntries();
          setShowManualEntry(false);
        }}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedIds={selectedEntries}
        onClearSelection={() => setSelectedEntries([])}
        onRefresh={loadTodayEntries}
      />

      {/* FAB Buttons - Root level for proper z-index stacking */}
      {/* Job FAB - Always visible, bottom-left. Picks a project, then lands on
          that project's field hub (Rule 37) — NOT a schedule, despite the old
          label; the schedule is one row inside the hub. */}
      <button
        onClick={() => setShowScheduleSelector(true)}
        className="fixed bottom-6 left-6 lg:left-[calc(12.5rem+1.5rem)] bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 z-50"
        aria-label="Open a job"
      >
        <BarChart3 className="w-6 h-6" />
      </button>

      {/* Manual Entry FAB - Only on Entries > Today view, bottom-right */}
      {view === 'entries' && entriesDateRange === 'today' && (
        <button
          onClick={() => setShowManualEntry(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 z-50"
          aria-label="Add time entry manually"
        >
          <Edit2 className="w-6 h-6" />
        </button>
      )}

      {/* Project Schedule Selector */}
      <ProjectScheduleSelector
        open={showScheduleSelector}
        projects={projects}
        onSelectProject={(projectId) => {
          // Navigate to canonical mobile schedule (Rule 18). The legacy
          // `/field-schedule/:projectId` URL still redirects, but field
          // workers can't reach the redirect — AppLayout's role allowlist
          // (Gotcha #44) bounces them to /time-tracker before the
          // LegacyFieldScheduleRedirect component mounts.
          navigate(`/projects/${projectId}/schedule`);
          // Close modal
          setShowScheduleSelector(false);
        }}
        onClose={() => setShowScheduleSelector(false)}
      />

    </div>
  );
};
