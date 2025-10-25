import React, { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, User, Play, Square, Edit2, Calendar, Loader2, AlertCircle, Camera, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getCompanyBranding } from '@/utils/companyBranding';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AddReceiptModal } from './AddReceiptModal';
import { WeekView } from './WeekView';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';
import { CreateTimeEntryDialog } from './CreateTimeEntryDialog';
import { BulkActionsBar } from './BulkActionsBar';
import { SyncStatusBanner } from './SyncStatusBanner';
import { ReceiptsList } from './ReceiptsList';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/contexts/RoleContext';
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
  email?: string;
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
}

interface ActiveTimer {
  teamMember: TeamMember;
  project: Project;
  startTime: Date;
  location?: { lat: number; lng: number; address: string };
}

export const MobileTimeTracker: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, isManager } = useRoles();
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
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [view, setView] = useState<'timer' | 'entries' | 'receipts'>('timer');
  const [entriesDateRange, setEntriesDateRange] = useState<'today' | 'week'>('today');
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false);
  const [pendingReceiptExpenseId, setPendingReceiptExpenseId] = useState<string | null>(null);
  const [showDuplicateTimerAlert, setShowDuplicateTimerAlert] = useState(false);
  const [existingTimerInfo, setExistingTimerInfo] = useState<any>(null);
  const [activeTimerPayeeIds, setActiveTimerPayeeIds] = useState<Set<string>>(new Set());
  const [logoIcon, setLogoIcon] = useState<string | null>(null);

  // Load active timers to show who's currently clocked in
  const loadActiveTimers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('payee_id')
        .eq('category', 'labor_internal')
        .is('end_time', null);

      if (error) throw error;

      const activePayeeIds = new Set(data?.map(e => e.payee_id) || []);
      setActiveTimerPayeeIds(activePayeeIds);
    } catch (error) {
      console.error('Error loading active timers:', error);
    }
  }, []);

  // Load company branding for logo
  useEffect(() => {
    const loadBranding = async () => {
      const branding = await getCompanyBranding();
      if (branding?.logo_icon_url) {
        setLogoIcon(branding.logo_icon_url);
      }
    };
    loadBranding();
  }, []);

  // Load projects and workers on mount
  useEffect(() => {
    if (user) {
      loadInitialData();
      loadTodayEntries();
      loadActiveTimers();
      
      // Set up real-time subscription
      const channel = setupRealtimeSubscription();
      
      // Cleanup on unmount
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

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
        .select('id, payee_name, hourly_rate, email')
        .eq('is_internal', true)
        .eq('provides_labor', true)
        .eq('is_active', true)
        .order('payee_name');

      if (teamMembersError) throw teamMembersError;
      setTeamMembers(teamMembersData || []);

      // Auto-select current user if they're a team member
      if (user?.email && teamMembersData && teamMembersData.length > 0) {
        const currentUserPayee = teamMembersData.find(
          member => member.email?.toLowerCase() === user.email?.toLowerCase()
        );
        
        if (currentUserPayee && !activeTimer) {
          setSelectedTeamMember({
            id: currentUserPayee.id,
            payee_name: currentUserPayee.payee_name,
            hourly_rate: currentUserPayee.hourly_rate
          });
        }
      }
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

  // Set up real-time subscription for time entries
  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('time-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'expenses',
          filter: `category=eq.labor_internal`
        },
        (payload) => {
          console.log('Real-time change detected:', payload);
          // Reload today's entries when any change occurs
          loadTodayEntries();
          loadActiveTimers();
        }
      )
      .subscribe();

    return channel;
  };

  const loadTodayEntries = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get current user and check role
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id || '');
      
      const isAdmin = roles?.some(r => r.role === 'admin');
      const isManager = roles?.some(r => r.role === 'manager');
      
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
          payees!inner(id, payee_name, hourly_rate),
          projects!inner(id, project_number, project_name, client_name, address)
        `)
        .eq('category', 'labor_internal')
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
        const hours = expense.amount / hourlyRate;
        
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
          endTimeString
        };
      }) || [];

      setTodayEntries(entries);
      await loadActiveTimers();
    } catch (error) {
      console.error('Error loading today entries:', error);
    }
  };

  const captureLocation = async () => {
    try {
      if (!navigator.geolocation) {
        return null;
      }
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
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

  const checkForDuplicateTimer = async (): Promise<boolean> => {
    if (!selectedTeamMember || !isOnline) return false;

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, projects(project_name, project_number)')
        .eq('payee_id', selectedTeamMember.id)
        .eq('category', 'labor_internal')
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingTimerInfo(data);
        setShowDuplicateTimerAlert(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking for duplicate timer:', error);
      return false;
    }
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

    // Check for duplicate active timer
    const hasDuplicate = await checkForDuplicateTimer();
    if (hasDuplicate) {
      return; // Alert dialog will handle next steps
    }

    await proceedWithClockIn();
  };

  const proceedWithClockIn = async () => {
    if (!selectedTeamMember || !selectedProject) return;

    setLoading(true);
    try {
      // Capture location only if online
      const loc = isOnline ? await captureLocation() : { lat: 0, lng: 0, address: 'Offline - no location' };
      
      const timerData = {
        teamMember: selectedTeamMember,
        project: selectedProject,
        startTime: new Date(),
        location: loc || undefined
      };
      
      setActiveTimer(timerData);
      
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

      // Refresh active timers list
      await loadActiveTimers();
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

  const handleReceiptFromClockOut = async (receiptId: string) => {
    setShowReceiptModal(false);
    
    // Link the receipt to the expense
    if (pendingReceiptExpenseId) {
      try {
        const { error } = await supabase
          .from('expenses')
          .update({ receipt_id: receiptId })
          .eq('id', pendingReceiptExpenseId);

        if (error) throw error;

        toast({
          title: 'Receipt Added',
          description: 'Receipt attached to time entry',
        });

        await loadTodayEntries();
      } catch (error) {
        console.error('Error linking receipt:', error);
        toast({
          title: 'Receipt Link Failed',
          description: 'Receipt saved but failed to link to time entry',
          variant: 'destructive'
        });
      }
    }
    
    setPendingReceiptExpenseId(null);
  };

  const completeClockOut = async (): Promise<string | null> => {
    if (!activeTimer) return null;

    setLoading(true);
    try {
      const endTime = new Date();
      const hours = (endTime.getTime() - activeTimer.startTime.getTime()) / (1000 * 60 * 60);
      const amount = hours * activeTimer.teamMember.hourly_rate;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const expenseData = {
        project_id: activeTimer.project.id,
        payee_id: activeTimer.teamMember.id,
        category: 'labor_internal' as const,
        transaction_type: 'expense' as const,
        amount: amount,
        expense_date: format(activeTimer.startTime, 'yyyy-MM-dd'),
        description: '',
        is_planned: false,
        created_offline: !isOnline,
        approval_status: 'pending',
        user_id: user?.id,
        updated_by: user?.id,
        start_time: activeTimer.startTime.toISOString(),
        end_time: endTime.toISOString()
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
        await loadActiveTimers();
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
    } catch (error: any) {
      console.error('Error clocking out:', error);
      const errorMessage = error?.message || '';
      const isRlsError = errorMessage.toLowerCase().includes('row-level security') || 
                         errorMessage.toLowerCase().includes('policy');
      
      toast({
        title: 'Clock Out Failed',
        description: isRlsError
          ? 'Your account is missing permission to save time entries. Please contact an administrator.'
          : 'Failed to save time entry. Please try again.',
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
    
    // Then ask if user wants to add receipt
    if (expenseId && isOnline) {
      setPendingReceiptExpenseId(expenseId);
      setShowReceiptPrompt(true);
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
            {logoIcon && (
              <img 
                src={logoIcon} 
                alt="Company Logo" 
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
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
            <Clock className="w-5 h-5 mx-auto mb-1" />
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
            <Calendar className="w-5 h-5 mx-auto mb-1" />
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
            <Camera className="w-5 h-5 mx-auto mb-1" />
            Receipts
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
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
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
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-foreground">{selectedTeamMember.payee_name}</div>
                  {activeTimerPayeeIds.has(selectedTeamMember.id) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Active
                    </span>
                  )}
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
                    className={cn(
                      "w-full p-3 text-left border-b last:border-b-0 transition-all",
                      selectedTeamMember?.id === member.id
                        ? "bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{member.payee_name}</div>
                      <div className="flex items-center gap-2">
                        {activeTimerPayeeIds.has(member.id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Active
                          </span>
                        )}
                        {selectedTeamMember?.id === member.id && (
                          <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
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
                    className={cn(
                      "w-full p-3 text-left border-b last:border-b-0 transition-all",
                      selectedProject?.id === project.id
                        ? "bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                          {project.project_number} - {project.client_name}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">{project.project_name}</div>
                        {project.address && (
                          <div className="text-xs text-muted-foreground truncate">{project.address}</div>
                        )}
                      </div>
                      {selectedProject?.id === project.id && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clock In/Out Button */}
          <div className="pt-4 space-y-3">
            {!activeTimer ? (
              <button
                onClick={handleClockIn}
                disabled={!selectedTeamMember || !selectedProject || loading}
                className="w-full bg-gradient-to-r from-green-500 via-green-600 to-teal-500 hover:from-green-600 hover:via-green-700 hover:to-teal-600 text-white py-6 rounded-2xl font-bold text-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center gap-2"
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
            
            {/* Manual Entry Button */}
            <button
              onClick={() => setShowManualEntry(true)}
              className="w-full bg-card border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 text-primary py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Edit2 className="w-5 h-5" />
              Forgot to clock in? Add Time Manually
            </button>
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
            <div className="p-4 space-y-3 relative pb-24">
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
                    onClick={async () => {
                      const { data } = await supabase
                        .from('expenses')
                        .select('*')
                        .eq('id', entry.id)
                        .single();
                      if (data) setEditingEntry(data);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        {/* PRIMARY: Start/End Times - Prominent at top */}
                        {entry.startTimeString && entry.endTimeString ? (
                          <div className="text-sm font-medium text-foreground">
                            {entry.startTimeString} - {entry.endTimeString}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-muted-foreground">
                            {format(entry.startTime, 'EEE, MMM d')} • Manual Entry
                          </div>
                        )}
                        
                        {/* SECONDARY: Project Information */}
                        <div className="text-sm text-muted-foreground mt-1">
                          {entry.project.project_number} - {entry.project.client_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.project.project_name}
                        </div>
                        
                        {/* STATUS: Approval Badge if Pending */}
                        {entry.approval_status === 'pending' && (
                          <div className="inline-flex items-center gap-1 mt-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            Pending Approval
                          </div>
                        )}
                      </div>
                      
                      {/* EMPHASIS: Hours Worked */}
                      <div className="text-right">
                        <div className="font-bold text-primary text-lg">
                          {entry.hours.toFixed(2)} hrs
                        </div>
                        {entry.attachment_url && (
                          <div className="text-xs text-muted-foreground mt-1">📎 Receipt</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Floating Add Button - Only on Today tab */}
              <button
                onClick={() => setShowManualEntry(true)}
                className="fixed bottom-6 right-6 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 z-20"
                aria-label="Add time entry manually"
              >
                <Edit2 className="w-6 h-6" />
              </button>
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
      {view === 'receipts' && <ReceiptsList />}

      {/* Receipt Prompt Confirmation */}
      <AlertDialog open={showReceiptPrompt} onOpenChange={setShowReceiptPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to add a receipt for this time entry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowReceiptPrompt(false);
              setPendingReceiptExpenseId(null);
            }}>
              Skip
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowReceiptPrompt(false);
              setShowReceiptModal(true);
            }}>
              Add Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Capture Modal */}
      <AddReceiptModal
        open={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setPendingReceiptExpenseId(null);
        }}
        onSuccess={(receipt) => {
          handleReceiptFromClockOut(receipt.id);
        }}
      />

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

      {/* Duplicate Timer Alert */}
      <AlertDialog open={showDuplicateTimerAlert} onOpenChange={setShowDuplicateTimerAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Active Timer Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                <span className="font-medium text-foreground">{selectedTeamMember?.payee_name}</span> already has an active timer running
                {existingTimerInfo?.projects && (
                  <> on project <span className="font-medium text-foreground">{existingTimerInfo.projects.project_name}</span></>
                )}.
              </p>
              {existingTimerInfo?.start_time && (
                <p className="text-xs text-muted-foreground">
                  Started: {format(new Date(existingTimerInfo.start_time), 'h:mm a')}
                </p>
              )}
              <p className="text-sm">
                Starting a new timer will leave the existing timer running. You should clock out of the existing timer first.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setExistingTimerInfo(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowDuplicateTimerAlert(false);
                setView('entries');
                setEntriesDateRange('today');
                setExistingTimerInfo(null);
              }}
              className="bg-primary"
            >
              View Active Timer
            </AlertDialogAction>
            <AlertDialogAction
              onClick={async () => {
                setShowDuplicateTimerAlert(false);
                await proceedWithClockIn();
                setExistingTimerInfo(null);
              }}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Start Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
