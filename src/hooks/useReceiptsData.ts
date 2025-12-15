import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UnifiedReceipt {
  id: string;
  type: 'time_entry' | 'standalone';
  image_url: string;
  payee_id: string;
  payee_name: string;
  project_id: string;
  project_number: string;
  project_name: string;
  date: string;
  amount: number;
  description?: string;
  hours?: number;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  submitted_for_approval_at?: string;
  user_id?: string;
  captured_at?: string;
  submitted_by_name?: string;
}

/**
 * Hook for fetching and managing receipt data
 * 
 * Fetches standalone receipts from the database, handles real-time updates,
 * and provides statistics. Also fetches payees and projects for filtering.
 * 
 * @returns Object containing receipt data, loading state, and utilities
 * @returns {UnifiedReceipt[]} allReceipts - Array of all receipts
 * @returns {boolean} loading - Loading state indicator
 * @returns {Array} payees - Array of payees for filtering
 * @returns {Array} projects - Array of projects for filtering
 * @returns {Function} loadReceipts - Function to manually refresh receipts
 * @returns {Object} statistics - Receipt statistics (pendingCount, approvedTodayCount, etc.)
 * 
 * @example
 * ```tsx
 * const receiptsData = useReceiptsData();
 * if (receiptsData.loading) return <Loader />;
 * return <ReceiptsList receipts={receiptsData.allReceipts} />;
 * ```
 */
export const useReceiptsData = () => {
  const [allReceipts, setAllReceipts] = useState<UnifiedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [payees, setPayees] = useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; number: string; name: string }>>([]);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only standalone receipts from receipts table
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          id,
          image_url,
          amount,
          description,
          captured_at,
          approval_status,
          approved_by,
          approved_at,
          submitted_for_approval_at,
          rejection_reason,
          payee_id,
          project_id,
          user_id,
          payees(payee_name),
          projects(project_number, project_name)
        `)
        .order('captured_at', { ascending: false });

      if (receiptsError) throw receiptsError;

      // Fetch user profiles for receipts
      const userIds = [...new Set((receiptsData || [])
        .filter((r: any) => r.user_id)
        .map((r: any) => r.user_id))];
      
      let profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap.set(p.id, p.full_name || 'Unknown');
          });
        }
      }

      // Transform standalone receipts
      const standaloneReceipts: UnifiedReceipt[] = (receiptsData || []).map((receipt: any) => ({
        id: receipt.id,
        type: 'standalone' as const,
        image_url: receipt.image_url,
        payee_id: receipt.payee_id || '',
        payee_name: receipt.payees?.payee_name || 'Unknown',
        project_id: receipt.project_id || '',
        project_number: receipt.projects?.project_number || 'SYS-000',
        project_name: receipt.projects?.project_name || 'Unassigned',
        date: receipt.captured_at,
        amount: receipt.amount,
        description: receipt.description || '',
        approval_status: receipt.approval_status,
        approved_by: receipt.approved_by,
        approved_at: receipt.approved_at,
        rejection_reason: receipt.rejection_reason,
        submitted_for_approval_at: receipt.submitted_for_approval_at,
        user_id: receipt.user_id,
        captured_at: receipt.captured_at,
        submitted_by_name: receipt.user_id ? profilesMap.get(receipt.user_id) : undefined,
      }));

      // Sort by date (most recent first)
      const unified = standaloneReceipts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllReceipts(unified);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load receipts';
      console.error('Failed to load receipts:', {
        error: errorMessage,
        errorDetails: error,
        stack: error?.stack
      });
      toast.error(`Failed to load receipts: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch payees for filter
  useEffect(() => {
    const fetchPayees = async () => {
      const { data } = await supabase
        .from('payees')
        .select('id, payee_name')
        .eq('is_active', true)
        .order('payee_name');
      
      if (data) {
        setPayees(data.map(p => ({ id: p.id, name: p.payee_name })));
      }
    };
    fetchPayees();
  }, []);

  // Fetch projects for filter
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_number, project_name, category')
        .eq('category', 'construction')
        .order('project_number');
      
      if (data) {
        setProjects(data.map(p => ({ 
          id: p.id, 
          number: p.project_number, 
          name: p.project_name 
        })));
      }
    };
    fetchProjects();
  }, []);

  // Real-time updates for receipts
  useEffect(() => {
    const channel = supabase
      .channel('receipts-realtime-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'receipts'
      }, () => {
        console.log('Receipt updated');
        loadReceipts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReceipts]);

  // Statistics calculation
  const statistics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return {
      pendingCount: allReceipts.filter(r => 
        !r.approval_status || r.approval_status === 'pending'
      ).length,
      approvedTodayCount: allReceipts.filter(r => 
        r.approval_status === 'approved' && 
        r.approved_at && 
        new Date(r.approved_at) >= todayStart
      ).length,
      rejectedCount: allReceipts.filter(r => 
        r.approval_status === 'rejected'
      ).length,
      totalThisWeekCount: allReceipts.filter(r => 
        new Date(r.date) >= weekStart
      ).length,
    };
  }, [allReceipts]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  return {
    allReceipts,
    loading,
    payees,
    projects,
    loadReceipts,
    statistics,
  };
};

