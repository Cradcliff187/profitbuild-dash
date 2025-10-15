import React, { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, User, Play, Square, Edit2, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Geolocation } from '@capacitor/geolocation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ReceiptCapture } from './ReceiptCapture';
import { WeekView } from './WeekView';
import { EditTimeEntryModal } from './EditTimeEntryModal';
import { ManualEntryModal } from './ManualEntryModal';
import { BulkActionsBar } from './BulkActionsBar';
import { ApprovalQueue } from './ApprovalQueue';
import { SyncStatusBanner } from './SyncStatusBanner';
import { TodayTableView } from './TodayTableView';
import { QuickActionBar } from './QuickActionBar';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { addToQueue } from '@/utils/syncQueue';

interface Project {
  id: string;
  project_number: string;
  client_name: string;
  address?: string;
}

interface Worker {
  id: string;
  payee_name: string;
  hourly_rate: number;
}

interface TimeEntry {
  id: string;
  worker: Worker;
  project: Project;
  hours: number;
  amount: number;
  note?: string;
  receiptUrl?: string;
  startTime: Date;
  endTime: Date;
}

interface ActiveTimer {
  worker: Worker;
  project: Project;
  startTime: Date;
  note?: string;
  location?: { lat: number; lng: number; address: string };
}

export const MobileTimeTracker: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [showWorkerSelect, setShowWorkerSelect] = useState(false);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [view, setView] = useState<'timer' | 'today' | 'week' | 'approve'>('timer');
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [showReceiptCapture, setShowReceiptCapture] = useState(false);
  const [pendingReceiptExpenseId, setPendingReceiptExpenseId] = useState<string | null>(null);

  // Load projects and workers on mount
  useEffect(() => {
    loadInitialData();
    loadTodayEntries();
  }, []);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem('activeTimer');
    if (savedTimer) {
      try {
        const parsed = JSON.parse(savedTimer);
        setActiveTimer({
          ...parsed,
          startTime: new Date(parsed.startTime)
        });
        setSelectedWorker(parsed.worker);
        setSelectedProject(parsed.project);
        setLocation(parsed.location);
      } catch (error) {
        console.error('Failed to restore timer:', error);
        localStorage.removeItem('activeTimer');
      }
    }
  }, []);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem('activeTimer', JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem('activeTimer');
    }
  }, [activeTimer]);

  const loadInitialData = async () => {
    setDataLoading(true);
    try {
      // Load active projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_number, client_name, address')
        .in('status', ['in_progress', 'approved'])
        .order('project_number', { ascending: false })
        .limit(20);

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load internal labor workers
      const { data: workersData, error: workersError } = await supabase
        .from('payees')
        .select('id, payee_name, hourly_rate')
        .eq('is_internal', true)
        .eq('provides_labor', true)
        .eq('is_active', true)
        .order('payee_name');

      if (workersError) throw workersError;
      setWorkers(workersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load projects and workers',
        variant: 'destructive'
      });
    } finally {
      setDataLoading(false);
    }
  };

  const loadTodayEntries = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          id,
          amount,
          expense_date,
          description,
          attachment_url,
          created_at,
          payees!inner(id, payee_name, hourly_rate),
          projects!inner(id, project_number, client_name, address)
        `)
        .eq('category', 'labor_internal')
        .eq('expense_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse entries from expenses
      const entries = data?.map((expense: any) => {
        const hourlyRate = expense.payees?.hourly_rate || 75;
        const hours = expense.amount / hourlyRate;
        
        return {
          id: expense.id,
          worker: expense.payees,
          project: expense.projects,
          hours,
          amount: expense.amount,
          note: expense.description,
          receiptUrl: expense.attachment_url,
          startTime: new Date(expense.created_at),
          endTime: new Date(expense.created_at)
        };
      }) || [];

      setTodayEntries(entries);
    } catch (error) {
      console.error('Error loading today entries:', error);
    }
  };

  const captureLocation = async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          return null;
        }
      }
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
      
      const loc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: 'Location captured'
      };
      
      setLocation(loc);
      return loc;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const getElapsedTime = () => {
    if (!activeTimer) return '00:00:00';
    const diff = Math.floor((currentTime.getTime() - activeTimer.startTime.getTime()) / 1000);
    const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const seconds = (diff % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const handleClockIn = async () => {
    if (!selectedWorker || !selectedProject) {
      toast({
        title: 'Missing Information',
        description: 'Please select worker and project first',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Capture location only if online
      const loc = isOnline ? await captureLocation() : { lat: 0, lng: 0, address: 'Offline - no location' };
      
      const timerData = {
        worker: selectedWorker,
        project: selectedProject,
        startTime: new Date(),
        note: note || undefined,
        location: loc || undefined
      };
      
      setActiveTimer(timerData);
      setNote('');
      
      // Queue for sync if offline
      if (!isOnline) {
        await addToQueue({
          type: 'clock_in',
          payload: timerData,
          timestamp: Date.now()
        });
      }
      
      toast({
        title: 'Clocked In',
        description: `Timer started for ${selectedWorker.payee_name}${!isOnline ? ' (offline)' : ''}`,
      });
    } catch (error) {
      console.error('Error clocking in:', error);
      toast({
        title: 'Clock In Failed',
        description: 'Failed to start timer',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptCaptured = useCallback(async (url: string) => {
    setShowReceiptCapture(false);
    
    // Update existing expense with receipt URL
    if (pendingReceiptExpenseId) {
      try {
        const { error } = await supabase
          .from('expenses')
          .update({ attachment_url: url })
          .eq('id', pendingReceiptExpenseId);

        if (error) throw error;

        toast({
          title: 'Receipt Added',
          description: 'Receipt attached to time entry',
        });

        await loadTodayEntries();
      } catch (error) {
        console.error('Error attaching receipt:', error);
        toast({
          title: 'Failed to Attach Receipt',
          description: 'Time entry saved but receipt upload failed',
          variant: 'destructive'
        });
      }
    }
    
    setPendingReceiptExpenseId(null);
  }, [pendingReceiptExpenseId]);

  const completeClockOut = async (): Promise<string | null> => {
    if (!activeTimer) return null;

    setLoading(true);
    try {
      const endTime = new Date();
      const hours = (endTime.getTime() - activeTimer.startTime.getTime()) / (1000 * 60 * 60);
      const amount = hours * activeTimer.worker.hourly_rate;

      const expenseData = {
        project_id: activeTimer.project.id,
        payee_id: activeTimer.worker.id,
        category: 'labor_internal' as const,
        transaction_type: 'expense' as const,
        amount: amount,
        expense_date: activeTimer.startTime.toISOString().split('T')[0],
        description: `${hours.toFixed(2)}hrs - ${activeTimer.worker.payee_name}${
          activeTimer.note ? ` - ${activeTimer.note}` : ''
        }`,
        is_planned: false,
        created_offline: !isOnline
      };

      if (isOnline) {
        // Save directly to DB
        const { data, error } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Clocked Out',
          description: `Saved ${hours.toFixed(2)} hours ($${amount.toFixed(2)})`,
        });

        await loadTodayEntries();
        setActiveTimer(null);
        setLocation(null);

        return data.id;
      } else {
        // Queue for later sync
        const localId = crypto.randomUUID();
        await addToQueue({
          type: 'clock_out',
          payload: { ...expenseData, local_id: localId },
          timestamp: Date.now()
        });

        // Add to local today entries immediately (optimistic UI)
        const localEntry = {
          id: localId,
          worker: activeTimer.worker,
          project: activeTimer.project,
          hours,
          amount,
          note: activeTimer.note,
          startTime: activeTimer.startTime,
          endTime: endTime
        };
        setTodayEntries(prev => [localEntry, ...prev]);

        toast({
          title: 'Clocked Out (Offline)',
          description: `Saved ${hours.toFixed(2)} hours - will sync when online`,
        });

        setActiveTimer(null);
        setLocation(null);

        return localId;
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Clock Out Failed',
        description: 'Failed to save time entry',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    // Save time entry immediately
    const expenseId = await completeClockOut();
    
    // Then offer receipt capture
    if (expenseId && isOnline) {
      setPendingReceiptExpenseId(expenseId);
      setShowReceiptCapture(true);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const todayTotal = todayEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const todayAmount = todayEntries.reduce((sum, entry) => sum + entry.amount, 0);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onClockIn: () => !activeTimer && selectedWorker && selectedProject && handleClockIn(),
    onClockOut: () => activeTimer && handleClockOut(),
    onManualEntry: () => setShowManualEntry(true),
    onApprove: () => setView('approve'),
  });

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Workers Available</AlertTitle>
          <AlertDescription>
            No internal labor workers found. Please add workers in the Payees section with "Internal" and "Provides Labor" enabled.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 pb-20 md:pb-16">
      {/* Sync Status Banner */}
      <SyncStatusBanner />

      {/* Compact Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-2 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-base font-semibold">Time Tracker</h1>
              <p className="text-xs opacity-90">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {!isOnline && (
              <div className="bg-yellow-500 text-yellow-950 px-1.5 py-0.5 text-[10px] rounded font-medium">
                OFFLINE
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <p className="text-[10px] opacity-90">Current Time</p>
          </div>
        </div>
      </div>

      {/* Compact Tab Navigation */}
      <div className="bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setView('timer')}
            className={`flex-1 py-2 text-center font-medium text-[11px] transition-all ${
              view === 'timer' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mx-auto mb-0.5" />
            Timer
          </button>
          <button
            onClick={() => setView('today')}
            className={`flex-1 py-2 text-center font-medium text-[11px] transition-all ${
              view === 'today' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mx-auto mb-0.5" />
            Today
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex-1 py-2 text-center font-medium text-[11px] transition-all ${
              view === 'week' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mx-auto mb-0.5" />
            Week
          </button>
          <button
            onClick={() => setView('approve')}
            className={`flex-1 py-2 text-center font-medium text-[11px] transition-all ${
              view === 'approve' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mx-auto mb-0.5" />
            Approve
          </button>
        </div>
      </div>

      {/* Timer View */}
      {view === 'timer' && (
        <div className="p-3 space-y-2 md:grid md:grid-cols-[280px_1fr] md:gap-3 md:max-w-7xl md:mx-auto">
          <div className="space-y-2 md:space-y-2">
            {/* Active Timer Display - Compact */}
            {activeTimer && (
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-3 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span className="font-semibold text-xs">CLOCKED IN</span>
                  </div>
                  {activeTimer.location && <MapPin className="w-3.5 h-3.5" />}
                </div>
                
                <div className="text-center py-3">
                  <div className="text-3xl font-mono font-bold mb-1">{getElapsedTime()}</div>
                  <p className="text-green-100 text-xs">Started at {formatTime(activeTimer.startTime)}</p>
                </div>

                <div className="space-y-1 text-xs bg-white/10 rounded p-2 backdrop-blur">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span>{activeTimer.worker.payee_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{activeTimer.project.project_number} - {activeTimer.project.client_name}</span>
                  </div>
                  {activeTimer.note && (
                    <div className="flex items-start gap-1.5">
                      <Edit2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="flex-1 text-[11px]">{activeTimer.note}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Worker Selection - Compact */}
            <div className="bg-card rounded border p-2">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                <User className="w-3 h-3 inline mr-1" />
                Worker
              </label>
              <button
                onClick={() => setShowWorkerSelect(!showWorkerSelect)}
                disabled={activeTimer !== null}
                className="w-full p-2 text-left rounded border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {selectedWorker ? (
                  <div>
                    <div className="font-medium text-xs">{selectedWorker.payee_name}</div>
                    <div className="text-[10px] text-muted-foreground">${selectedWorker.hourly_rate}/hr</div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-xs">Select worker...</div>
                )}
              </button>
              
              {showWorkerSelect && !activeTimer && (
                <div className="mt-1.5 border rounded overflow-hidden max-h-48 overflow-y-auto">
                  {workers.map(worker => (
                    <button
                      key={worker.id}
                      onClick={() => {
                        setSelectedWorker(worker);
                        setShowWorkerSelect(false);
                      }}
                      className="w-full p-2 text-left hover:bg-muted border-b last:border-b-0 transition-all"
                    >
                      <div className="font-medium text-xs">{worker.payee_name}</div>
                      <div className="text-[10px] text-muted-foreground">${worker.hourly_rate}/hr</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Project Selection - Compact */}
            <div className="bg-card rounded border p-2">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                <MapPin className="w-3 h-3 inline mr-1" />
                Project
              </label>
              <button
                onClick={() => setShowProjectSelect(!showProjectSelect)}
                disabled={activeTimer !== null}
                className="w-full p-2 text-left rounded border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedProject ? (
                  <div>
                    <div className="font-medium text-xs">{selectedProject.project_number}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{selectedProject.client_name}</div>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-xs">Select project...</div>
                )}
              </button>
              
              {showProjectSelect && !activeTimer && (
                <div className="mt-1.5 border rounded overflow-hidden max-h-48 overflow-y-auto">
                  {projects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setShowProjectSelect(false);
                      }}
                      className="w-full p-2 text-left hover:bg-muted border-b last:border-b-0 transition-all"
                    >
                      <div className="font-medium text-xs">{project.project_number}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{project.client_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note Input - Compact */}
            {!activeTimer && (
              <div className="bg-card rounded border p-2">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  <Edit2 className="w-3 h-3 inline mr-1" />
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full p-2 border rounded text-xs focus:border-primary focus:outline-none resize-none bg-background"
                  rows={2}
                />
              </div>
            )}

            {/* Clock In/Out Button - Compact */}
            <div className="pt-2">
              {!activeTimer ? (
                <button
                  onClick={handleClockIn}
                  disabled={!selectedWorker || !selectedProject || loading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-lg font-bold text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      CLOCK IN
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleClockOut}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 rounded-lg font-bold text-base shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Square className="w-5 h-5" />
                      CLOCK OUT
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right column - Today entries in table format */}
          <div className="md:block hidden">
            {todayEntries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Today's Entries</h3>
                <TodayTableView entries={todayEntries} onEdit={setEditingEntry} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today View - Data-Dense Table */}
      {view === 'today' && (
        <div className="p-3 md:max-w-5xl md:mx-auto">
          <TodayTableView entries={todayEntries} onEdit={setEditingEntry} />
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="p-3 md:max-w-7xl md:mx-auto">
          <WeekView
            onEditEntry={(entry) => setEditingEntry(entry)}
            onCreateEntry={() => setShowManualEntry(true)}
          />
        </div>
      )}

      {/* Approve View */}
      {view === 'approve' && (
        <div className="p-3 md:max-w-5xl md:mx-auto">
          <ApprovalQueue />
        </div>
      )}

      {/* Quick Action Bar (Desktop Only) */}
      <QuickActionBar
        onClockIn={handleClockIn}
        onManualEntry={() => setShowManualEntry(true)}
        onApprove={() => setView('approve')}
        onClockOut={handleClockOut}
        activeTimer={activeTimer}
        elapsedTime={getElapsedTime()}
        disabled={loading}
      />

      {/* Receipt Capture Modal */}
      {showReceiptCapture && pendingReceiptExpenseId && (
        <ReceiptCapture
          projectId={selectedProject?.id || ''}
          onCapture={handleReceiptCaptured}
          onSkip={() => {
            setShowReceiptCapture(false);
            setPendingReceiptExpenseId(null);
          }}
        />
      )}

      {/* Edit Time Entry Modal */}
      <EditTimeEntryModal
        entry={editingEntry}
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        onSaved={() => {
          loadTodayEntries();
          setEditingEntry(null);
        }}
      />

      {/* Manual Entry Modal */}
      <ManualEntryModal
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
    </div>
  );
};
