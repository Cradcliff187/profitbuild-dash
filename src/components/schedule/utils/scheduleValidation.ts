/**
 * Schedule validation and warning generation
 */

import { ScheduleTask, ScheduleWarning } from '@/types/schedule';
import { isSequenceViolation, identifyConstructionPhase, getSuggestedDependencies } from './constructionSequences';
import { calculateEarliestStart, isTaskOverdue, tasksOverlap } from './scheduleCalculations';

/**
 * Generate all schedule warnings for a set of tasks
 */
export function generateScheduleWarnings(
  tasks: ScheduleTask[],
  settings: {
    unusualSequence: boolean;
    dateOverlap: boolean;
    changeOrderTiming: boolean;
    resourceConflicts: boolean;
  }
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  
  tasks.forEach(task => {
    // Check construction sequencing
    if (settings.unusualSequence) {
      const sequenceWarnings = checkConstructionSequencing(task, tasks);
      warnings.push(...sequenceWarnings);
    }
    
    // Check dependency overlaps
    if (settings.dateOverlap) {
      const depWarnings = checkDependencyOverlaps(task, tasks);
      warnings.push(...depWarnings);
    }
    
    // Check change order timing
    if (settings.changeOrderTiming && task.isChangeOrder) {
      const coWarning = checkChangeOrderTiming(task, tasks);
      if (coWarning) warnings.push(coWarning);
    }
    
    // Check resource conflicts
    if (settings.resourceConflicts && task.payee_id) {
      const resourceWarnings = checkResourceConflicts(task, tasks);
      warnings.push(...resourceWarnings);
    }
    
    // Check for overdue tasks
    if (isTaskOverdue(task)) {
      warnings.push({
        id: `overdue-${task.id}`,
        severity: 'error',
        message: `"${task.name}" is overdue. Scheduled completion: ${task.end}`,
        task_id: task.id,
        task_name: task.name,
        suggestion: 'Adjust schedule or update task progress',
        canDismiss: false
      });
    }
    
    // Check for tasks with missing dependencies
    if (settings.unusualSequence) {
      const suggestedDeps = getSuggestedDependencies(task, tasks);
      const existingDepIds = new Set(task.dependencies.map(d => d.task_id));
      
      const missingDeps = suggestedDeps.filter(
        suggestion => !existingDepIds.has(suggestion.taskId)
      );
      
      if (missingDeps.length > 0) {
        warnings.push({
          id: `missing-deps-${task.id}`,
          severity: 'info',
          message: `"${task.name}" may need additional dependencies`,
          task_id: task.id,
          task_name: task.name,
          suggestion: missingDeps.map(d => d.reason).join('. '),
          canDismiss: true
        });
      }
    }
  });
  
  // Remove duplicates
  return Array.from(
    new Map(warnings.map(w => [w.id, w])).values()
  );
}

/**
 * Check for construction sequencing violations
 */
function checkConstructionSequencing(
  task: ScheduleTask,
  allTasks: ScheduleTask[]
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  const phase = identifyConstructionPhase(task.name);
  
  if (!phase) return warnings;
  
  // Check against all other tasks
  allTasks.forEach(otherTask => {
    if (otherTask.id === task.id) return;
    
    const violation = isSequenceViolation(
      { name: task.name, start: task.start },
      { name: otherTask.name, start: otherTask.start }
    );
    
    if (violation.violation) {
      warnings.push({
        id: `sequence-${task.id}-${otherTask.id}`,
        severity: 'warning',
        message: `"${task.name}" has unusual sequencing with "${otherTask.name}". ${violation.reason}`,
        task_id: task.id,
        task_name: task.name,
        suggestion: 'Review construction sequence or add dependency',
        canDismiss: true
      });
    }
  });
  
  return warnings;
}

/**
 * Check for dependency date overlaps
 */
function checkDependencyOverlaps(
  task: ScheduleTask,
  allTasks: ScheduleTask[]
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  
  if (task.dependencies.length === 0) return warnings;
  
  const taskStart = new Date(task.start);
  const earliestPossibleStart = calculateEarliestStart(task, allTasks);
  
  if (taskStart < earliestPossibleStart) {
    const daysDiff = Math.ceil(
      (earliestPossibleStart.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    warnings.push({
      id: `dep-overlap-${task.id}`,
      severity: 'warning',
      message: `"${task.name}" starts before dependencies are complete`,
      task_id: task.id,
      task_name: task.name,
      suggestion: `Consider moving start date ${daysDiff} day(s) later to ${earliestPossibleStart.toISOString().split('T')[0]}`,
      canDismiss: true
    });
  }
  
  return warnings;
}

/**
 * Check change order timing relative to base work
 */
function checkChangeOrderTiming(
  task: ScheduleTask,
  allTasks: ScheduleTask[]
): ScheduleWarning | null {
  const taskStart = new Date(task.start);
  
  // Find related base tasks in same category
  const relatedBaseTasks = allTasks.filter(
    t => !t.isChangeOrder && t.category === task.category
  );
  
  if (relatedBaseTasks.length === 0) return null;
  
  const earliestBaseTask = relatedBaseTasks.reduce((earliest, current) =>
    new Date(current.start) < new Date(earliest.start) ? current : earliest
  );
  
  const baseStart = new Date(earliestBaseTask.start);
  
  // Warn if CO is scheduled significantly before base work
  if (taskStart < baseStart) {
    const daysDiff = Math.ceil(
      (baseStart.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return {
      id: `co-timing-${task.id}`,
      severity: 'info',
      message: `Change order "${task.name}" is scheduled ${daysDiff} day(s) before related base work`,
      task_id: task.id,
      task_name: task.name,
      suggestion: 'Verify this timing is intentional',
      canDismiss: true
    };
  }
  
  return null;
}

/**
 * Check for resource/subcontractor conflicts
 */
function checkResourceConflicts(
  task: ScheduleTask,
  allTasks: ScheduleTask[]
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  
  if (!task.payee_id) return warnings;
  
  // Find other tasks assigned to same payee
  const samePayeeTasks = allTasks.filter(
    t => t.payee_id === task.payee_id && t.id !== task.id
  );
  
  // Check for date overlaps
  samePayeeTasks.forEach(otherTask => {
    if (tasksOverlap(task, otherTask)) {
      warnings.push({
        id: `resource-conflict-${task.id}-${otherTask.id}`,
        severity: 'warning',
        message: `"${task.name}" overlaps with "${otherTask.name}" - same ${task.payee_name || 'subcontractor'}`,
        task_id: task.id,
        task_name: task.name,
        suggestion: 'Adjust schedules to avoid resource conflict',
        canDismiss: true
      });
    }
  });
  
  return warnings;
}

/**
 * Validate a task before saving
 */
export function validateTask(
  task: ScheduleTask,
  allTasks: ScheduleTask[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check dates
  const start = new Date(task.start);
  const end = new Date(task.end);
  
  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }
  
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }
  
  if (start > end) {
    errors.push('Start date must be before end date');
  }
  
  // Check for circular dependencies
  const hasCircularDep = detectCircularDependency(task, allTasks);
  if (hasCircularDep) {
    errors.push('Circular dependency detected');
  }
  
  // Check progress
  if (task.progress < 0 || task.progress > 100) {
    errors.push('Progress must be between 0 and 100');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Detect circular dependencies in task chain
 */
function detectCircularDependency(
  task: ScheduleTask,
  allTasks: ScheduleTask[],
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(task.id)) {
    return true; // Circular dependency found
  }
  
  visited.add(task.id);
  
  for (const dep of task.dependencies) {
    const depTask = allTasks.find(t => t.id === dep.task_id);
    if (depTask) {
      if (detectCircularDependency(depTask, allTasks, new Set(visited))) {
        return true;
      }
    }
  }
  
  return false;
}

