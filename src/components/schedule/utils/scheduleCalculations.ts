/**
 * Pure calculation functions for schedule operations
 * No side effects, easy to test
 */

import { ScheduleTask, TaskDependency } from '@/types/schedule';

/**
 * Calculate the duration in days between two dates (inclusive)
 */
export function calculateDuration(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1); // +1 to include both start and end days
}

/**
 * Calculate end date given start date and duration
 */
export function calculateEndDate(startDate: Date, durationDays: number): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays - 1);
  return endDate;
}

/**
 * Calculate the earliest start date for a task based on its dependencies
 */
export function calculateEarliestStart(
  task: ScheduleTask,
  allTasks: ScheduleTask[]
): Date {
  if (task.dependencies.length === 0) {
    return new Date(task.start);
  }
  
  let latestDependencyEnd = new Date(task.start);
  
  for (const dep of task.dependencies) {
    const depTask = allTasks.find(t => t.id === dep.task_id);
    if (depTask) {
      const depEnd = new Date(depTask.end);
      if (depEnd > latestDependencyEnd) {
        latestDependencyEnd = depEnd;
      }
    }
  }
  
  // Add one day after the latest dependency ends
  const earliestStart = new Date(latestDependencyEnd);
  earliestStart.setDate(earliestStart.getDate() + 1);
  
  return earliestStart;
}

/**
 * Calculate critical path through the project
 * Returns array of task IDs that are on the critical path
 */
export function calculateCriticalPath(tasks: ScheduleTask[]): string[] {
  if (tasks.length === 0) return [];
  
  // Build dependency graph
  const graph = new Map<string, Set<string>>();
  const reverseGraph = new Map<string, Set<string>>();
  const taskMap = new Map<string, ScheduleTask>();
  
  tasks.forEach(task => {
    taskMap.set(task.id, task);
    graph.set(task.id, new Set(task.dependencies.map(d => d.task_id)));
    reverseGraph.set(task.id, new Set());
  });
  
  // Build reverse dependencies
  tasks.forEach(task => {
    task.dependencies.forEach(dep => {
      const set = reverseGraph.get(dep.task_id);
      if (set) set.add(task.id);
    });
  });
  
  // Calculate earliest start times (forward pass)
  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  
  const topoSort: string[] = [];
  const inDegree = new Map<string, number>();
  
  tasks.forEach(task => {
    inDegree.set(task.id, task.dependencies.length);
  });
  
  const queue: string[] = [];
  tasks.forEach(task => {
    if ((inDegree.get(task.id) || 0) === 0) {
      queue.push(task.id);
    }
  });
  
  while (queue.length > 0) {
    const taskId = queue.shift()!;
    topoSort.push(taskId);
    
    const task = taskMap.get(taskId)!;
    const taskDuration = calculateDuration(new Date(task.start), new Date(task.end));
    
    let maxEarliestStart = 0;
    task.dependencies.forEach(dep => {
      const depFinish = earliestFinish.get(dep.task_id) || 0;
      maxEarliestStart = Math.max(maxEarliestStart, depFinish);
    });
    
    earliestStart.set(taskId, maxEarliestStart);
    earliestFinish.set(taskId, maxEarliestStart + taskDuration);
    
    // Process successors
    const successors = reverseGraph.get(taskId);
    successors?.forEach(successor => {
      const degree = (inDegree.get(successor) || 0) - 1;
      inDegree.set(successor, degree);
      if (degree === 0) {
        queue.push(successor);
      }
    });
  }
  
  // Calculate latest start times (backward pass)
  const latestStart = new Map<string, number>();
  const latestFinish = new Map<string, number>();
  
  // Find project end time
  let projectEnd = 0;
  earliestFinish.forEach(finish => {
    projectEnd = Math.max(projectEnd, finish);
  });
  
  // Initialize leaf nodes
  tasks.forEach(task => {
    const successors = reverseGraph.get(task.id);
    if (!successors || successors.size === 0) {
      latestFinish.set(task.id, projectEnd);
    }
  });
  
  // Backward pass
  for (let i = topoSort.length - 1; i >= 0; i--) {
    const taskId = topoSort[i];
    const task = taskMap.get(taskId)!;
    const taskDuration = calculateDuration(new Date(task.start), new Date(task.end));
    
    let minLatestFinish = latestFinish.get(taskId);
    if (minLatestFinish === undefined) {
      minLatestFinish = projectEnd;
      const successors = reverseGraph.get(taskId);
      successors?.forEach(successor => {
        const successorLatestStart = latestStart.get(successor);
        if (successorLatestStart !== undefined) {
          minLatestFinish = Math.min(minLatestFinish!, successorLatestStart);
        }
      });
    }
    
    latestFinish.set(taskId, minLatestFinish);
    latestStart.set(taskId, minLatestFinish - taskDuration);
  }
  
  // Identify critical path (tasks with zero slack)
  const criticalPath: string[] = [];
  tasks.forEach(task => {
    const es = earliestStart.get(task.id) || 0;
    const ls = latestStart.get(task.id) || 0;
    const slack = ls - es;
    
    if (Math.abs(slack) < 0.01) { // Critical if slack is near zero
      criticalPath.push(task.id);
    }
  });
  
  return criticalPath;
}

/**
 * Calculate total project duration from tasks
 */
export function calculateProjectDuration(tasks: ScheduleTask[]): number {
  if (tasks.length === 0) return 0;
  
  const dates = tasks.map(t => ({
    start: new Date(t.start).getTime(),
    end: new Date(t.end).getTime()
  }));
  
  const projectStart = Math.min(...dates.map(d => d.start));
  const projectEnd = Math.max(...dates.map(d => d.end));
  
  return Math.ceil((projectEnd - projectStart) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculate progress percentage from actual vs estimated cost
 */
export function calculateProgressFromCost(actualCost: number, estimatedCost: number): number {
  if (estimatedCost <= 0) return 0;
  return Math.min(100, Math.round((actualCost / estimatedCost) * 100));
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: ScheduleTask, today: Date = new Date()): boolean {
  const endDate = new Date(task.end);
  return endDate < today && task.progress < 100;
}

/**
 * Calculate schedule variance (days ahead/behind)
 */
export function calculateScheduleVariance(
  task: ScheduleTask,
  today: Date = new Date()
): number {
  const endDate = new Date(task.end);
  const diffTime = today.getTime() - endDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (task.progress >= 100) {
    // Task is complete
    return 0;
  }
  
  // Negative = ahead of schedule, Positive = behind schedule
  return diffDays;
}

/**
 * Get tasks that can start now (all dependencies met)
 */
export function getReadyToStartTasks(tasks: ScheduleTask[]): ScheduleTask[] {
  const today = new Date();
  
  return tasks.filter(task => {
    // Already started or completed
    if (task.progress > 0) return false;
    
    // Not yet scheduled to start
    if (new Date(task.start) > today) return false;
    
    // Check if all dependencies are complete
    const allDepsComplete = task.dependencies.every(dep => {
      const depTask = tasks.find(t => t.id === dep.task_id);
      return depTask && depTask.progress >= 100;
    });
    
    return allDepsComplete;
  });
}

/**
 * Format duration for display
 */
export function formatDuration(days: number): string {
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (remainingDays === 0) {
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  
  return `${weeks}w ${remainingDays}d`;
}

/**
 * Detect if two tasks have date overlap
 */
export function tasksOverlap(task1: ScheduleTask, task2: ScheduleTask): boolean {
  const start1 = new Date(task1.start);
  const end1 = new Date(task1.end);
  const start2 = new Date(task2.start);
  const end2 = new Date(task2.end);
  
  return (start1 <= end2) && (start2 <= end1);
}

