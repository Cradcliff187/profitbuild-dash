import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeEntryListItem, TimeEntryFilters, TimeEntryStatistics } from '@/types/timeEntry';
import { toast } from '@/hooks/use-toast';

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
          user_id,
          payee_id,
          project_id,
          attachment_url,
          is_locked,
          payees!inner(payee_name, hourly_rate),
          projects!inner(project_number, project_name, client_name)
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
      if (filters.status !== 'all') {
        query = query.eq('approval_status', filters.status);
      }
      if (filters.workerId) {
        query = query.eq('payee_id', filters.workerId);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      // Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedEntries: TimeEntryListItem[] = (data || []).map((entry: any) => {
        const hours = calculateHours(entry.start_time, entry.end_time, entry.description);
        const hourlyRate = entry.payees?.hourly_rate || 0;
        
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
          user_id: entry.user_id,
          worker_name: entry.payees?.payee_name || 'Unknown',
          project_number: entry.projects?.project_number || '',
          project_name: entry.projects?.project_name || '',
          client_name: entry.projects?.client_name || '',
          hours,
          hourly_rate: hourlyRate,
          note: entry.description,
          attachment_url: entry.attachment_url,
          payee_id: entry.payee_id,
          project_id: entry.project_id,
          is_locked: entry.is_locked,
        };
      });

      setEntries(formattedEntries);
      setTotalCount(count || 0);
      
      // Fetch statistics
      await fetchStatistics();
      
    } catch (error: any) {
      console.error('Error fetching time entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load time entries',
        variant: 'destructive',
      });
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

      const { data: allEntries } = await supabase
        .from('expenses')
        .select('approval_status, start_time, end_time, description, expense_date')
        .eq('category', 'labor_internal');

      if (allEntries) {
        const pendingCount = allEntries.filter(e => !e.approval_status || e.approval_status === 'pending').length;
        const rejectedCount = allEntries.filter(e => e.approval_status === 'rejected').length;
        
        const approvedThisWeek = allEntries.filter(e => 
          e.approval_status === 'approved' && 
          new Date(e.expense_date) >= weekStart
        );
        const approvedThisWeekHours = approvedThisWeek.reduce((sum, e) => 
          sum + calculateHours(e.start_time, e.end_time, e.description), 0
        );

        const thisMonth = allEntries.filter(e => new Date(e.expense_date) >= monthStart);
        const totalThisMonthHours = thisMonth.reduce((sum, e) => 
          sum + calculateHours(e.start_time, e.end_time, e.description), 0
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

  const calculateHours = (startTime: string | null, endTime: string | null, description: string): number => {
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
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
