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
import { useAuth } from '@/contexts/AuthContext';

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
      const loc = await captureLocation();
      
      setActiveTimer({
        worker: selectedWorker,
        project: selectedProject,
        startTime: new Date(),
        note: note || undefined,
        location: loc || undefined
      });
      
      setNote('');
      
      toast({
        title: 'Clocked In',
        description: `Timer started for ${selectedWorker.payee_name}`,
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

  const handleReceiptCaptured = useCallback((url: string) => {
    setShowReceiptCapture(false);
    completeClockOut(url);
  }, []);

  const completeClockOut = async (receiptUrl?: string) => {
    if (!activeTimer) return;

    setLoading(true);
    try {
      const endTime = new Date();
      const hours = (endTime.getTime() - activeTimer.startTime.getTime()) / (1000 * 60 * 60);
      const amount = hours * activeTimer.worker.hourly_rate;

      const { error } = await supabase
        .from('expenses')
        .insert({
          project_id: activeTimer.project.id,
          payee_id: activeTimer.worker.id,
          category: 'labor_internal',
          transaction_type: 'expense',
          amount: amount,
          expense_date: activeTimer.startTime.toISOString().split('T')[0],
          description: `${hours.toFixed(2)}hrs - ${activeTimer.worker.payee_name}${
            activeTimer.note ? ` - ${activeTimer.note}` : ''
          }`,
          attachment_url: receiptUrl,
          is_planned: false
        });

      if (error) throw error;

      toast({
        title: 'Clocked Out',
        description: `Saved ${hours.toFixed(2)} hours ($${amount.toFixed(2)})`,
      });

      await loadTodayEntries();
      
      setActiveTimer(null);
      setLocation(null);
    } catch (error) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Clock Out Failed',
        description: 'Failed to save time entry',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = () => {
    setShowReceiptCapture(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const todayTotal = todayEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const todayAmount = todayEntries.reduce((sum, entry) => sum + entry.amount, 0);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Time Tracker</h1>
            <p className="text-sm opacity-90">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <p className="text-xs opacity-90">Current Time</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setView('timer')}
            className={`flex-1 py-3 text-center font-medium text-xs transition-all ${
              view === 'timer' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Clock className="w-4 h-4 mx-auto mb-1" />
            Timer
          </button>
          <button
            onClick={() => setView('today')}
            className={`flex-1 py-3 text-center font-medium text-xs transition-all ${
              view === 'today' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Calendar className="w-4 h-4 mx-auto mb-1" />
            Today
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex-1 py-3 text-center font-medium text-xs transition-all ${
              view === 'week' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Calendar className="w-4 h-4 mx-auto mb-1" />
            Week
          </button>
          <button
            onClick={() => setView('approve')}
            className={`flex-1 py-3 text-center font-medium text-xs transition-all ${
              view === 'approve' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Clock className="w-4 h-4 mx-auto mb-1" />
            Approve
          </button>
        </div>
      </div>

      {/* Timer View */}
      {view === 'timer' && (
        <div className="p-4 space-y-4">
          {/* Active Timer Display */}
          {activeTimer && (
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="font-semibold">CLOCKED IN</span>
                </div>
                {activeTimer.location && <MapPin className="w-5 h-5" />}
              </div>
              
              <div className="text-center py-6">
                <div className="text-5xl font-mono font-bold mb-2">{getElapsedTime()}</div>
                <p className="text-green-100">Started at {formatTime(activeTimer.startTime)}</p>
              </div>

              <div className="space-y-2 text-sm bg-white/10 rounded-lg p-3 backdrop-blur">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{activeTimer.worker.payee_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{activeTimer.project.project_number} - {activeTimer.project.client_name}</span>
                </div>
                {activeTimer.note && (
                  <div className="flex items-start gap-2">
                    <Edit2 className="w-4 h-4 mt-0.5" />
                    <span className="flex-1">{activeTimer.note}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Worker Selection */}
          <div className="bg-card rounded-xl shadow-sm p-4">
            <label className="block text-sm font-semibold text-foreground mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Worker
            </label>
            <button
              onClick={() => setShowWorkerSelect(!showWorkerSelect)}
              disabled={activeTimer !== null}
              className="w-full p-4 text-left rounded-lg border-2 border-border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedWorker ? (
                <div>
                  <div className="font-semibold text-foreground">{selectedWorker.payee_name}</div>
                  <div className="text-sm text-muted-foreground">${selectedWorker.hourly_rate}/hr</div>
                </div>
              ) : (
                <div className="text-muted-foreground">Select worker...</div>
              )}
            </button>
            
            {showWorkerSelect && !activeTimer && (
              <div className="mt-2 border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {workers.map(worker => (
                  <button
                    key={worker.id}
                    onClick={() => {
                      setSelectedWorker(worker);
                      setShowWorkerSelect(false);
                    }}
                    className="w-full p-3 text-left hover:bg-muted border-b last:border-b-0 transition-all"
                  >
                    <div className="font-semibold">{worker.payee_name}</div>
                    <div className="text-sm text-muted-foreground">${worker.hourly_rate}/hr</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Project Selection */}
          <div className="bg-card rounded-xl shadow-sm p-4">
            <label className="block text-sm font-semibold text-foreground mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Project
            </label>
            <button
              onClick={() => setShowProjectSelect(!showProjectSelect)}
              disabled={activeTimer !== null}
              className="w-full p-4 text-left rounded-lg border-2 border-border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedProject ? (
                <div>
                  <div className="font-semibold text-foreground">{selectedProject.project_number}</div>
                  <div className="text-sm text-muted-foreground">{selectedProject.client_name}</div>
                  {selectedProject.address && (
                    <div className="text-xs text-muted-foreground">{selectedProject.address}</div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">Select project...</div>
              )}
            </button>
            
            {showProjectSelect && !activeTimer && (
              <div className="mt-2 border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setShowProjectSelect(false);
                    }}
                    className="w-full p-3 text-left hover:bg-muted border-b last:border-b-0 transition-all"
                  >
                    <div className="font-semibold">{project.project_number}</div>
                    <div className="text-sm text-muted-foreground">{project.client_name}</div>
                    {project.address && (
                      <div className="text-xs text-muted-foreground">{project.address}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note Input */}
          {!activeTimer && (
            <div className="bg-card rounded-xl shadow-sm p-4">
              <label className="block text-sm font-semibold text-foreground mb-2">
                <Edit2 className="w-4 h-4 inline mr-1" />
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What are you working on?"
                className="w-full p-3 border-2 border-border rounded-lg focus:border-primary focus:outline-none resize-none bg-background"
                rows={2}
              />
            </div>
          )}

          {/* Clock In/Out Button */}
          <div className="pt-4">
            {!activeTimer ? (
              <button
                onClick={handleClockIn}
                disabled={!selectedWorker || !selectedProject || loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-6 rounded-2xl font-bold text-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Play className="w-8 h-8" />
                    CLOCK IN
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-6 rounded-2xl font-bold text-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Square className="w-8 h-8" />
                    CLOCK OUT
                  </>
                )}
              </button>
            )}
          </div>

          {/* Today Summary Card */}
          {todayEntries.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm p-4 border-l-4 border-primary">
              <h3 className="font-semibold text-foreground mb-2">Today's Summary</h3>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{todayTotal.toFixed(1)} hrs</div>
                  <div className="text-sm text-muted-foreground">{todayEntries.length} entries</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">${todayAmount.toFixed(0)}</div>
                  <div className="text-sm text-muted-foreground">Total labor</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today View */}
      {view === 'today' && (
        <div className="p-4 space-y-3">
          <div className="bg-card rounded-xl shadow-sm p-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-3xl font-bold text-primary">{todayTotal.toFixed(1)} hrs</div>
                <div className="text-sm text-muted-foreground">Total hours today</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">${todayAmount.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Total amount</div>
              </div>
            </div>
          </div>

          {todayEntries.length === 0 ? (
            <div className="bg-card rounded-xl shadow-sm p-8 text-center">
              <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-semibold mb-2">No time entries yet</p>
              <p className="text-sm text-muted-foreground">Clock in to start tracking time</p>
              <Button 
                onClick={() => setView('timer')} 
                className="mt-4"
                variant="outline"
              >
                Go to Timer
              </Button>
            </div>
          ) : (
            todayEntries.map(entry => (
              <div key={entry.id} className="bg-card rounded-xl shadow-sm p-4 border-l-4 border-primary">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{entry.worker.payee_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.project.project_number} - {entry.project.client_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{entry.hours.toFixed(2)} hrs</div>
                    <div className="text-sm text-green-600">${entry.amount.toFixed(2)}</div>
                  </div>
                </div>
                
                {entry.note && (
                  <div className="bg-muted rounded p-2 text-sm text-muted-foreground mt-2">
                    {entry.note}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="p-4">
          <WeekView
            onEditEntry={(entry) => setEditingEntry(entry)}
            onCreateEntry={() => setShowManualEntry(true)}
          />
        </div>
      )}

      {/* Approve View */}
      {view === 'approve' && (
        <div className="p-4">
          <ApprovalQueue />
        </div>
      )}

      {/* Receipt Capture Modal */}
      {showReceiptCapture && activeTimer && (
        <ReceiptCapture
          projectId={activeTimer.project.id}
          onCapture={handleReceiptCaptured}
          onSkip={() => completeClockOut()}
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
