/**
 * Hook for managing schedule warnings
 */

import { useState, useEffect, useMemo } from 'react';
import { ScheduleTask, ScheduleWarning, ScheduleSettings } from '@/types/schedule';
import { generateScheduleWarnings } from '../utils/scheduleValidation';

/**
 * Generate and manage schedule warnings
 */
export function useScheduleWarnings(
  tasks: ScheduleTask[],
  settings: ScheduleSettings
) {
  const [warnings, setWarnings] = useState<ScheduleWarning[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());
  
  // Generate warnings whenever tasks or settings change
  useEffect(() => {
    if (tasks.length === 0) {
      setWarnings([]);
      return;
    }
    
    const newWarnings = generateScheduleWarnings(tasks, settings.warnings);
    
    // Filter out dismissed warnings
    const filteredWarnings = newWarnings.filter(
      w => !dismissedWarnings.has(w.id)
    );
    
    setWarnings(filteredWarnings);
  }, [tasks, settings.warnings, dismissedWarnings]);
  
  /**
   * Dismiss a warning
   */
  const dismissWarning = (warningId: string) => {
    setDismissedWarnings(prev => new Set(prev).add(warningId));
  };
  
  /**
   * Clear all dismissed warnings (reset)
   */
  const clearDismissed = () => {
    setDismissedWarnings(new Set());
  };
  
  /**
   * Get warnings for a specific task
   */
  const getTaskWarnings = (taskId: string): ScheduleWarning[] => {
    return warnings.filter(w => w.task_id === taskId);
  };
  
  /**
   * Get warning counts by severity
   */
  const warningCounts = useMemo(() => {
    return {
      error: warnings.filter(w => w.severity === 'error').length,
      warning: warnings.filter(w => w.severity === 'warning').length,
      info: warnings.filter(w => w.severity === 'info').length,
      total: warnings.length
    };
  }, [warnings]);
  
  return {
    warnings,
    dismissWarning,
    clearDismissed,
    getTaskWarnings,
    warningCounts
  };
}

