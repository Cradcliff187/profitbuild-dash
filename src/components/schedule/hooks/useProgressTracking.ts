import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TaskProgress {
  taskId: string;
  progress: number; // 0-100
  actualCost: number;
  estimatedCost: number;
}

/**
 * Hook to track progress and costs for schedule tasks
 * Updated: Fixed expense correlation queries
 */
export function useProgressTracking(projectId: string) {
  const [taskProgress, setTaskProgress] = useState<Map<string, TaskProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, [projectId]);

  const loadProgressData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all estimate line items with their costs
      const { data: estimateItems, error: estimateError } = await supabase
        .from('estimate_line_items')
        .select(`
          id,
          total_cost,
          estimate_id,
          estimates!inner (
            project_id,
            status
          )
        `)
        .eq('estimates.project_id', projectId)
        .eq('estimates.status', 'approved');

      if (estimateError) throw estimateError;

      // Get change order line items
      const { data: coItems, error: coError } = await supabase
        .from('change_order_line_items')
        .select(`
          id,
          total_cost,
          change_order_id,
          change_orders!inner (
            project_id,
            status
          )
        `)
        .eq('change_orders.project_id', projectId)
        .eq('change_orders.status', 'approved');

      if (coError) throw coError;

      // Get expense correlations to calculate actual costs
      // Using the correlations table since expenses don't have direct line_item_id
      const { data: correlations, error: correlationError } = await supabase
        .from('expense_line_item_correlations')
        .select(`
          estimate_line_item_id,
          change_order_line_item_id,
          expenses!inner (
            id,
            project_id,
            amount
          )
        `)
        .eq('expenses.project_id', projectId);

      if (correlationError) throw correlationError;

      // Calculate progress for each task
      const progressMap = new Map<string, TaskProgress>();

      // Process estimate line items
      (estimateItems || []).forEach(item => {
        const estimatedCost = item.total_cost || 0;
        
        // Sum up expense amounts for this line item
        const actualCost = (correlations || [])
          .filter(c => c.estimate_line_item_id === item.id)
          .reduce((sum, c) => sum + (c.expenses?.amount || 0), 0);

        const progress = estimatedCost > 0 
          ? Math.min(100, Math.round((actualCost / estimatedCost) * 100))
          : 0;

        progressMap.set(item.id, {
          taskId: item.id,
          progress,
          actualCost,
          estimatedCost
        });
      });

      // Process change order line items
      (coItems || []).forEach(item => {
        const estimatedCost = item.total_cost || 0;
        
        const actualCost = (correlations || [])
          .filter(c => c.change_order_line_item_id === item.id)
          .reduce((sum, c) => sum + (c.expenses?.amount || 0), 0);

        const progress = estimatedCost > 0 
          ? Math.min(100, Math.round((actualCost / estimatedCost) * 100))
          : 0;

        progressMap.set(item.id, {
          taskId: item.id,
          progress,
          actualCost,
          estimatedCost
        });
      });

      setTaskProgress(progressMap);
    } catch (err) {
      console.error('Error loading progress data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskProgress = (taskId: string): number => {
    return taskProgress.get(taskId)?.progress || 0;
  };

  const getTaskActualCost = (taskId: string): number => {
    return taskProgress.get(taskId)?.actualCost || 0;
  };

  return {
    taskProgress,
    getTaskProgress,
    getTaskActualCost,
    isLoading,
    error,
    refetch: loadProgressData
  };
}
