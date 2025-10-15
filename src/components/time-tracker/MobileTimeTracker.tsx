import React, { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, User, Play, Square, Edit2, Calendar, Loader2, AlertCircle, Camera, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Geolocation } from '@capacitor/geolocation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ReceiptCapture } from './ReceiptCapture';
import { WeekView } from './WeekView';
import { EditTimeEntryModal } from './EditTimeEntryModal';
import { ManualEntryModal } from './ManualEntryModal';
import { BulkActionsBar } from './BulkActionsBar';
import { ApprovalQueue } from './ApprovalQueue';
import { SyncStatusBanner } from './SyncStatusBanner';
import { ReceiptsGallery } from './ReceiptsGallery';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { addToQueue } from '@/utils/syncQueue';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
  address?: string;
}

interface TeamMember {
  id: string;
  payee_name: string;
  hourly_rate: number;
}

interface TimeEntry {
  id: string;
  teamMember: TeamMember;
  project: Project;
  hours: number;
  note?: string;
  receiptUrl?: string;
  attachment_url?: string;
  startTime: Date;
  endTime: Date;
}

interface ActiveTimer {
  teamMember: TeamMember;
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
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [showWorkerSelect, setShowWorkerSelect] = useState(false);
  const [note, setNote] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [view, setView] = useState<'timer' | 'entries' | 'receipts' | 'approve'>('timer');
  const [entriesDateRange, setEntriesDateRange] = useState<'today' | 'week'>('today');
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
        
        // Sanitize: clear system project if cached
        const isSystemProject = (num?: string) => 
          !!num && (num === 'SYS-000' || num === '000-UNASSIGNED' || num.startsWith('SYS-'));
        
        if (parsed.project && isSystemProject(parsed.project.project_number)) {
          parsed.project = null;
        }
        
        setActiveTimer({
          ...parsed,
          startTime: new Date(parsed.startTime)
        });
        setSelectedTeamMember(parsed.teamMember);
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
      // Load active projects (exclude system projects)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name, address')
        .in('status', ['in_progress', 'approved'])
        .neq('project_number', '000-UNASSIGNED')
        .neq('project_number', 'SYS-000')
        .order('project_number', { ascending: false })
        .limit(20);

      if (projectsError) throw projectsError;
      
      // Defense-in-depth: filter any system projects
      const cleanedProjects = (projectsData || []).filter(
        p => p.project_number !== '000-UNASSIGNED' && 
             p.project_number !== 'SYS-000' && 
             !p.project_number.startsWith('SYS-')
      );
      setProjects(cleanedProjects);

      // Load internal labor team members
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('payees')
        .select('id, payee_name, hourly_rate')
        .eq('is_internal', true)
        .eq('provides_labor', true)
        .eq('is_active', true)
        .order('payee_name');

      if (teamMembersError) throw teamMembersError;
      setTeamMembers(teamMembersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load projects and team members',
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
          projects!inner(id, project_number, project_name, client_name, address)
        `)
        .eq('category', 'labor_internal')
        .eq('expense_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse entries from expenses
      const entries = data?.map((expense: any) => {
        const hourlyRate = expense.payees?.hourly_rate || 75;
        const hours = expense.amount / hourlyRate;
        
        // Clean up description to remove redundant info
        const cleanNote = expense.description
          .replace(/Internal Labor\s*-\s*/i, '') // Remove "Internal Labor" prefix
          .replace(/\d+\.?\d*\s*h(?:ou)?rs?\s*-?\s*/i, '') // Remove hours
          .replace(/Employee\s+\d+/i, '') // Remove "Employee 1", "Employee 2", etc.
          .replace(/\s*-\s*\w{3}\s+\d{1,2},\s+\d{4}\s*-?\s*/i, '') // Remove date like "Oct 13, 2025"
          .replace(/^\s*-\s*/, '') // Remove leading dash
          .replace(/\s*-\s*$/, '') // Remove trailing dash
          .trim();
        
        return {
          id: expense.id,
          teamMember: expense.payees,
          project: expense.projects,
          hours,
          note: cleanNote,
          attachment_url: expense.attachment_url,
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
    if (!selectedTeamMember || !selectedProject) {
      toast({
        title: 'Missing Information',
        description: 'Please select team member and project first',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Capture location only if online
      const loc = isOnline ? await captureLocation() : { lat: 0, lng: 0, address: 'Offline - no location' };
      
      const timerData = {
        teamMember: selectedTeamMember,
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
        description: `Timer started for ${selectedTeamMember.payee_name}${!isOnline ? ' (offline)' : ''}`,
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
      const amount = hours * activeTimer.teamMember.hourly_rate;

      const expenseData = {
        project_id: activeTimer.project.id,
        payee_id: activeTimer.teamMember.id,
        category: 'labor_internal' as const,
        transaction_type: 'expense' as const,
        amount: amount,
        expense_date: activeTimer.startTime.toISOString().split('T')[0],
        description: `${hours.toFixed(2)}hrs - ${activeTimer.teamMember.payee_name}${
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
          description: `Saved ${hours.toFixed(2)} hours`,
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
          teamMember: activeTimer.teamMember,
          project: activeTimer.project,
          hours,
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

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
        <LoadingSpinner variant="page" message="Loading time tracker..." />
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Team Members Available</AlertTitle>
          <AlertDescription>
            No internal labor team members found. Please add team members in the Payees section with "Internal" and "Provides Labor" enabled.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 pb-20">
      {/* Sync Status Banner */}
      <SyncStatusBanner />

      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-bold">Time Tracker</h1>
              <p className="text-sm opacity-90">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {!isOnline && (
              <div className="bg-yellow-500 text-yellow-950 px-2 py-1 text-xs rounded font-medium">
                OFFLINE
              </div>
            )}
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
            onClick={() => setView('entries')}
            className={`flex-1 py-3 text-center font-medium text-xs transition-all ${
              view === 'entries' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Calendar className="w-4 h-4 mx-auto mb-1" />
            Entries
          </button>
          <button
            onClick={() => setView('receipts')}
            className={`flex-1 py-3 text-center font-medium text-xs transition-all ${
              view === 'receipts' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <Camera className="w-4 h-4 mx-auto mb-1" />
            Receipts
          </button>
          <button
            onClick={() => setView('approve')}
            className={`flex-1 py-3 text-center font-medium text-xs transition-all ${
              view === 'approve' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground'
            }`}
          >
            <CheckCircle className="w-4 h-4 mx-auto mb-1" />
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
                  <span>{activeTimer.teamMember.payee_name}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{activeTimer.project.project_number} - {activeTimer.project.client_name}</span>
                  </div>
                  <span className="text-xs opacity-90 ml-6">{activeTimer.project.project_name}</span>
                  {activeTimer.project.address && (
                    <span className="text-xs opacity-90 ml-6">{activeTimer.project.address}</span>
                  )}
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

          {/* Team Member Selection */}
          <div className="bg-card rounded-xl shadow-sm p-4">
            <label className="block text-sm font-semibold text-foreground mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Team Member
            </label>
            <button
              onClick={() => setShowWorkerSelect(!showWorkerSelect)}
              disabled={activeTimer !== null}
              className="w-full p-4 text-left rounded-lg border-2 border-border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedTeamMember ? (
                <div>
                  <div className="font-semibold text-foreground">{selectedTeamMember.payee_name}</div>
                </div>
              ) : (
                <div className="text-muted-foreground">Select team member...</div>
              )}
            </button>
            
            {showWorkerSelect && !activeTimer && (
              <div className="mt-2 border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {teamMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedTeamMember(member);
                      setShowWorkerSelect(false);
                    }}
                    className="w-full p-3 text-left hover:bg-muted border-b last:border-b-0 transition-all"
                  >
                    <div className="font-semibold">{member.payee_name}</div>
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
                  <div className="font-semibold text-foreground">
                    {selectedProject.project_number} - {selectedProject.client_name}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedProject.project_name}</div>
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
                    <div className="font-semibold">
                      {project.project_number} - {project.client_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{project.project_name}</div>
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
                disabled={!selectedTeamMember || !selectedProject || loading}
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entries View - Combined Today/Week */}
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
            <div className="p-4 space-y-3">
              <div className="bg-card rounded-xl shadow-sm p-4">
                <div className="text-3xl font-bold text-primary">{todayTotal.toFixed(1)} hrs</div>
                <div className="text-sm text-muted-foreground">Total today • {todayEntries.length} entries</div>
              </div>
              
              {todayEntries.length === 0 ? (
                <div className="bg-card rounded-xl shadow-sm p-8 text-center">
                  <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-semibold mb-2">No time entries today</p>
                  <Button onClick={() => setView('timer')} className="mt-4" variant="outline">
                    Go to Timer
                  </Button>
                </div>
              ) : (
                todayEntries.map(entry => (
                  <div 
                    key={entry.id} 
                    className="bg-card rounded-xl shadow-sm p-4 border-l-4 border-primary cursor-pointer"
                    onClick={() => setEditingEntry(entry)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{entry.teamMember.payee_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.project.project_number} - {entry.project.client_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{entry.project.project_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{entry.hours.toFixed(2)} hrs</div>
                        {entry.attachment_url && (
                          <div className="text-xs text-muted-foreground mt-1">📎 Receipt</div>
                        )}
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
      {view === 'receipts' && <ReceiptsGallery />}

      {/* Approve View */}
      {view === 'approve' && (
        <div className="p-4">
          <ApprovalQueue />
        </div>
      )}

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
