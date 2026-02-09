import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeEntryListItem, TimeEntryFilters, TimeEntryStatistics } from '@/types/timeEntry';
import { toast } from 'sonner';
import { parseDateOnly } from '@/utils/dateUtils';

export const useTimeEntries = (filters: TimeEntryFilters, pageSize: number = 25, currentPage: number = 1) => {
  const [entries, setEntries] = useState<TimeEntryListItem[]>([]);
  const [statistics, setStatistics] = useState<TimeEntryStatistics>({
    pendingCount: 0,
    approvedThisWeekHours: 0,
    rejectedCount: 0,
    totalThisMonthHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('expenses')
        .select(`
          id,
          expense_date,
          start_time,
          end_time,
          amount,
          description,
          approval_status,
          rejection_reason,
          created_at,
          submitted_for_approval_at,
          approved_at,
          approved_by,
          user_id,
          payee_id,
          project_id,
          attachment_url,
          is_locked,
          lunch_taken,
          lunch_duration_minutes,
          gross_hours,
          payees!inner(payee_name, hourly_rate, employee_number),
          projects!inner(project_number, project_name, client_name, address)
        `, { count: 'exact' })
        .eq('category', 'labor_internal')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte('expense_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('expense_date', filters.dateTo);
      }
      if (filters.status.length > 0) {
        query = query.in('approval_status', filters.status);
      }
      if (filters.workerIds.length > 0) {
        query = query.in('payee_id', filters.workerIds);
      }
      if (filters.projectIds.length > 0) {
        query = query.in('project_id', filters.projectIds);
      }

      // Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedEntries: TimeEntryListItem[] = (data || []).map((entry: any) => {
        const lunchTaken = entry.lunch_taken || false;
        const lunchDurationMinutes = entry.lunch_duration_minutes || null;
        const hours = calculateHours(
          entry.start_time, 
          entry.end_time, 
          entry.description,
          lunchTaken,
          lunchDurationMinutes
        );
        const hourlyRate = entry.payees?.hourly_rate || 0;
        
        // Use database gross_hours value
        const grossHours = entry.gross_hours ?? hours;
        
        return {
          id: entry.id,
          expense_date: entry.expense_date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          amount: entry.amount,
          description: entry.description,
          approval_status: entry.approval_status,
          rejection_reason: entry.rejection_reason,
          created_at: entry.created_at,
          submitted_for_approval_at: entry.submitted_for_approval_at,
          approved_at: entry.approved_at,
          approved_by: entry.approved_by,
          user_id: entry.user_id,
          worker_name: entry.payees?.payee_name || 'Unknown',
          project_number: entry.projects?.project_number || '',
          project_name: entry.projects?.project_name || '',
          client_name: entry.projects?.client_name || '',
          project_address: entry.projects?.address || null,
          hours,  // This is now net hours
          hourly_rate: hourlyRate,
          note: entry.description,
          attachment_url: entry.attachment_url,
          payee_id: entry.payee_id,
          project_id: entry.project_id,
          is_locked: entry.is_locked,
          lunch_taken: lunchTaken,
          lunch_duration_minutes: lunchDurationMinutes,
          gross_hours: grossHours,
          payee: entry.payees ? {
            employee_number: entry.payees.employee_number
          } : undefined,
        };
      });

      setEntries(formattedEntries);
      setTotalCount(count || 0);
      
      // Fetch statistics
      await fetchStatistics();
      
    } catch (error: any) {
      console.error('Error fetching time entries:', error);
      toast.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let statsQuery = supabase
        .from('expenses')
        .select('approval_status, start_time, end_time, description, expense_date, lunch_taken, lunch_duration_minutes')
        .eq('category', 'labor_internal');

      // Apply the same filters as the main query (except status filter)
      if (filters.dateFrom) {
        statsQuery = statsQuery.gte('expense_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        statsQuery = statsQuery.lte('expense_date', filters.dateTo);
      }
      if (filters.workerIds.length > 0) {
        statsQuery = statsQuery.in('payee_id', filters.workerIds);
      }
      if (filters.projectIds.length > 0) {
        statsQuery = statsQuery.in('project_id', filters.projectIds);
      }

      const { data: allEntries } = await statsQuery;

      if (allEntries) {
        const pendingCount = allEntries.filter(e => !e.approval_status || e.approval_status === 'pending').length;
        const rejectedCount = allEntries.filter(e => e.approval_status === 'rejected').length;
        
        const approvedThisWeek = allEntries.filter(e => 
          e.approval_status === 'approved' && 
          parseDateOnly(e.expense_date) >= weekStart
        );
        const approvedThisWeekHours = approvedThisWeek.reduce((sum, e) => 
          sum + calculateHours(
            e.start_time, 
            e.end_time, 
            e.description,
            e.lunch_taken || false,
            e.lunch_duration_minutes || null
          ), 0
        );

        const thisMonth = allEntries.filter(e => parseDateOnly(e.expense_date) >= monthStart);
        const totalThisMonthHours = thisMonth.reduce((sum, e) => 
          sum + calculateHours(
            e.start_time, 
            e.end_time, 
            e.description,
            e.lunch_taken || false,
            e.lunch_duration_minutes || null
          ), 0
        );

        setStatistics({
          pendingCount,
          approvedThisWeekHours,
          rejectedCount,
          totalThisMonthHours,
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const calculateHours = (
    startTime: string | null, 
    endTime: string | null, 
    description: string,
    lunchTaken: boolean = false,
    lunchDurationMinutes: number | null = null
  ): number => {
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const grossHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const lunchHours = lunchTaken && lunchDurationMinutes ? lunchDurationMinutes / 60 : 0;
      return Math.max(0, grossHours - lunchHours);
    }
    
    // Fallback to description parsing for old entries
    const timeMatch = description?.match(/(\d+\.?\d*)\s*hours?/i);
    return timeMatch ? parseFloat(timeMatch[1]) : 0;
  };

  useEffect(() => {
    fetchEntries();
  }, [filters, pageSize, currentPage]);

  return {
    entries,
    statistics,
    loading,
    totalCount,
    refetch: fetchEntries,
  };
};
