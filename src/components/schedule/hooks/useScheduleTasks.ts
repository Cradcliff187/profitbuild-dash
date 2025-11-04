/**
 * Hook for loading and managing schedule tasks
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScheduleTask, TaskDependency } from '@/types/schedule';
import { useProgressTracking } from './useProgressTracking';

interface UseScheduleTasksProps {
  projectId: string;
  projectStartDate?: Date;
  projectEndDate?: Date;
}

/**
 * Load and manage schedule tasks from database
 */
export function useScheduleTasks({
  projectId,
  projectStartDate,
  projectEndDate
}: UseScheduleTasksProps) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Track progress from expenses
  const {
    getProgress,
    getActualCost,
    isLoading: progressLoading,
    refreshProgress
  } = useProgressTracking(
    projectId,
    tasks.map(t => ({
      id: t.id,
      estimated_cost: t.estimated_cost,
      isChangeOrder: t.isChangeOrder
    }))
  );
  
  /**
   * Load tasks from database
   */
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load approved estimate with line items
      const { data: estimate, error: estError } = await supabase
        .from('estimates')
        .select(`
          id,
          estimate_line_items (
            id,
            category,
            description,
            quantity,
            cost_per_unit,
            total_cost,
            scheduled_start_date,
            scheduled_end_date,
            duration_days,
            dependencies,
            is_milestone,
            schedule_notes
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('date_created', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (estError) throw estError;
      
      // Load approved change orders with line items
      const { data: changeOrders, error: coError } = await supabase
        .from('change_orders')
        .select(`
          id,
          change_order_number,
          change_order_line_items (
            id,
            category,
            description,
            quantity,
            cost_per_unit,
            total_cost,
            scheduled_start_date,
            scheduled_end_date,
            duration_days,
            dependencies,
            is_milestone,
            schedule_notes
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'approved');
      
      if (coError) throw coError;
      
      // Convert to ScheduleTask format
      const estimateTasks = convertLineItemsToTasks(
        estimate?.estimate_line_items || [],
        false
      );
      
      const changeOrderTasks = (changeOrders || []).flatMap((co: any) =>
        convertLineItemsToTasks(
          co.change_order_line_items || [],
          true,
          co.change_order_number
        )
      );
      
      const allTasks = [...estimateTasks, ...changeOrderTasks];
      setTasks(allTasks);
    } catch (err) {
      console.error('Error loading schedule tasks:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, projectStartDate, projectEndDate]);
  
  /**
   * Convert line items to ScheduleTask format
   */
  const convertLineItemsToTasks = (
    lineItems: any[],
    isChangeOrder: boolean,
    coNumber?: string
  ): ScheduleTask[] => {
    return lineItems.map((item) => {
      const taskName = isChangeOrder 
        ? `CO-${coNumber}: ${item.description}`
        : item.description;
      
      // Use scheduled dates if available, otherwise use project dates as defaults
      const startDate = item.scheduled_start_date 
        ? new Date(item.scheduled_start_date)
        : projectStartDate 
        ? new Date(projectStartDate)
        : new Date();
      
      const endDate = item.scheduled_end_date
        ? new Date(item.scheduled_end_date)
        : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
      
      // Parse dependencies from JSONB
      let dependencies: TaskDependency[] = [];
      if (item.dependencies) {
        try {
          const parsed = typeof item.dependencies === 'string' 
            ? JSON.parse(item.dependencies) 
            : item.dependencies;
          dependencies = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.warn('Failed to parse dependencies:', e);
          dependencies = [];
        }
      }
      
      return {
        id: item.id,
        name: taskName,
        category: item.category,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        progress: getProgress(item.id), // Get from expenses
        dependencies: dependencies,
        custom_class: isChangeOrder ? 'change-order' : item.category,
        isChangeOrder,
        notes: item.schedule_notes,
        estimated_cost: item.total_cost || 0,
        actual_cost: getActualCost(item.id), // Get from expenses
        payee_id: undefined,
        payee_name: undefined,
        change_order_number: coNumber
      };
    });
  };
  
  /**
   * Update a task in the database
   */
  const updateTask = useCallback(async (updatedTask: ScheduleTask) => {
    const table = updatedTask.isChangeOrder 
      ? 'change_order_line_items' 
      : 'estimate_line_items';
    
    const startDate = new Date(updatedTask.start);
    const endDate = new Date(updatedTask.end);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const { error } = await supabase
      .from(table)
      .update({
        scheduled_start_date: updatedTask.start,
        scheduled_end_date: updatedTask.end,
        duration_days: duration,
        dependencies: updatedTask.dependencies,
        schedule_notes: updatedTask.notes
      })
      .eq('id', updatedTask.id);
    
    if (error) throw error;
    
    // Update local state
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    
    return updatedTask;
  }, []);
  
  /**
   * Update task dates (for drag & drop)
   */
  const updateTaskDates = useCallback(async (
    taskId: string,
    start: Date,
    end: Date
  ) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const table = task.isChangeOrder 
      ? 'change_order_line_items' 
      : 'estimate_line_items';
    
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const { error } = await supabase
      .from(table)
      .update({
        scheduled_start_date: start.toISOString().split('T')[0],
        scheduled_end_date: end.toISOString().split('T')[0],
        duration_days: duration
      })
      .eq('id', taskId);
    
    if (error) throw error;
    
    // Update local state
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            start: start.toISOString().split('T')[0], 
            end: end.toISOString().split('T')[0] 
          }
        : t
    ));
  }, [tasks]);
  
  return {
    tasks,
    isLoading: isLoading || progressLoading,
    error,
    loadTasks,
    updateTask,
    updateTaskDates,
    refreshProgress
  };
}

