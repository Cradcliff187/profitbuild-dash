/**
 * @file useTrainingAssignments.ts
 * @description Hook for managing training assignments and user completions
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrainingAssignment, 
  CreateAssignmentData,
  MyTrainingItem,
  TrainingStats,
  SendNotificationParams,
  NotificationResult
} from '@/types/training';
import { toast } from 'sonner';

// =============================================================================
// ADMIN HOOK - Managing assignments
// =============================================================================

export function useTrainingAssignments(contentId?: string) {
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('training_assignments')
        .select(`
          *,
          user:profiles!training_assignments_user_id_fkey(id, full_name, email),
          assigner:profiles!training_assignments_assigned_by_fkey(id, full_name)
        `)
        .order('assigned_at', { ascending: false });

      if (contentId) {
        query = query.eq('training_content_id', contentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  // Bulk create assignments
  const createAssignments = async (
    trainingContentId: string, 
    userIds: string[], 
    options?: { due_date?: string; priority?: number; notes?: string }
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const assignmentsToCreate = userIds.map(userId => ({
        training_content_id: trainingContentId,
        user_id: userId,
        assigned_by: user?.id,
        due_date: options?.due_date || null,
        priority: options?.priority || 0,
        notes: options?.notes || null,
      }));

      const { error } = await supabase
        .from('training_assignments')
        .upsert(assignmentsToCreate, { 
          onConflict: 'training_content_id,user_id',
          ignoreDuplicates: true 
        });

      if (error) throw error;

      toast.success(`Assigned to ${userIds.length} user(s)`);
      await fetchAssignments();
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to create assignments', { description: error.message });
      return false;
    }
  };

  // Delete assignment
  const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('training_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success('Assignment removed');
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to remove assignment', { description: error.message });
      return false;
    }
  };

  // Send notifications
  const sendNotifications = async (params: SendNotificationParams): Promise<NotificationResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-training-notification', {
        body: params,
      });

      if (error) throw error;

      const result = data as NotificationResult;
      
      if (result.summary.sent > 0) {
        toast.success(`Notifications sent to ${result.summary.sent} user(s)`);
      }
      if (result.summary.failed > 0) {
        toast.warning(`Failed to send to ${result.summary.failed} user(s)`);
      }

      await fetchAssignments(); // Refresh to show notification timestamps
      return result;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to send notifications', { description: error.message });
      return null;
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    isLoading,
    createAssignments,
    deleteAssignment,
    sendNotifications,
    refresh: fetchAssignments,
  };
}

// =============================================================================
// USER HOOK - My training items
// =============================================================================

export function useMyTraining() {
  const [items, setItems] = useState<MyTrainingItem[]>([]);
  const [stats, setStats] = useState<TrainingStats>({ 
    total: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0 
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyTraining = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch assignments with content
      const { data: assignments, error: assignError } = await supabase
        .from('training_assignments')
        .select(`
          *,
          training_content(*)
        `)
        .eq('user_id', user.id);

      if (assignError) throw assignError;

      // Fetch completions
      const { data: completions, error: compError } = await supabase
        .from('training_completions')
        .select('*')
        .eq('user_id', user.id);

      if (compError) throw compError;

      // Combine into MyTrainingItem[]
      const today = new Date();
      const trainingItems: MyTrainingItem[] = (assignments || [])
        .filter(a => a.training_content?.status === 'published')
        .map(assignment => {
          const completion = completions?.find(c => c.training_content_id === assignment.training_content_id) || null;
          const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
          
          let status: MyTrainingItem['status'] = 'assigned';
          let daysRemaining: number | null = null;

          if (completion) {
            status = 'completed';
          } else if (dueDate) {
            daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            status = daysRemaining < 0 ? 'overdue' : 'pending';
          }

          return {
            assignment,
            content: assignment.training_content!,
            completion,
            status,
            daysRemaining,
          };
        });

      // Calculate stats
      const total = trainingItems.length;
      const completed = trainingItems.filter(i => i.status === 'completed').length;
      const overdue = trainingItems.filter(i => i.status === 'overdue').length;
      const pending = trainingItems.filter(i => i.status === 'pending' || i.status === 'assigned').length;

      setItems(trainingItems);
      setStats({
        total,
        completed,
        pending,
        overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });

    } catch (err) {
      console.error('Error fetching my training:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark as complete
  const markComplete = async (
    contentId: string, 
    options?: { time_spent_minutes?: number; notes?: string }
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('training_completions')
        .insert({
          training_content_id: contentId,
          user_id: user.id,
          time_spent_minutes: options?.time_spent_minutes,
          notes: options?.notes,
          acknowledged: true,
        });

      if (error) throw error;

      toast.success('Training marked as complete!');
      await fetchMyTraining();
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to mark as complete', { description: error.message });
      return false;
    }
  };

  useEffect(() => {
    fetchMyTraining();
  }, [fetchMyTraining]);

  return {
    items,
    stats,
    isLoading,
    markComplete,
    refresh: fetchMyTraining,
  };
}

