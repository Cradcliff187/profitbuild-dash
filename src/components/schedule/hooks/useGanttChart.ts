/**
 * Hook for managing Gantt chart lifecycle and interactions
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import Gantt from 'frappe-gantt';
import { ScheduleTask } from '@/types/schedule';

interface UseGanttChartProps {
  tasks: ScheduleTask[];
  viewMode: 'Day' | 'Week' | 'Month';
  onTaskClick?: (task: ScheduleTask) => void;
  onDateChange?: (taskId: string, start: Date, end: Date) => Promise<void>;
}

/**
 * Format date string to US format (MM/DD/YYYY)
 */
function formatDateUS(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Manage Gantt chart initialization and lifecycle with proper cleanup
 */
export function useGanttChart({
  tasks,
  viewMode,
  onTaskClick,
  onDateChange
}: UseGanttChartProps) {
  const ganttRef = useRef<Gantt | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const dateChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Apply custom styling to Gantt bars based on task properties
   */
  const applyCustomStyling = useCallback(() => {
    if (!containerRef.current) return;
    
    // Wait for DOM to be ready
    requestAnimationFrame(() => {
      const bars = containerRef.current?.querySelectorAll('.bar');
      bars?.forEach(bar => {
        const taskId = bar.getAttribute('data-id');
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) return;
        
        // Add change order class
        if (task.isChangeOrder) {
          bar.classList.add('change-order-bar');
        }
        
        // Add milestone class
        if (task.dependencies.some(d => d.task_id)) {
          bar.classList.add('has-dependencies');
        }
        
        // Set category data attribute
        if (task.category) {
          bar.setAttribute('data-category', task.category);
        }
        
        // Add progress indicator
        const progress = task.progress;
        if (progress > 0) {
          bar.setAttribute('data-progress', progress.toString());
        }
      });
    });
  }, [tasks]);
  
  /**
   * Initialize Gantt chart with proper configuration
   */
  const initializeGantt = useCallback(() => {
    if (!containerRef.current || tasks.length === 0 || isInitializing) return;
    
    setIsInitializing(true);
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      try {
        if (!containerRef.current) {
          setIsInitializing(false);
          return;
        }
        
        // Clear existing instance completely
        if (ganttRef.current) {
          ganttRef.current = null;
        }
        
        // Clear and reset container
        containerRef.current.innerHTML = '';
        containerRef.current.style.width = '100%';
        containerRef.current.style.overflow = 'auto';
        
        // Convert tasks to Gantt format with validation
        const ganttTasks = tasks.map(task => {
          // Ensure dates are valid
          const startDate = new Date(task.start);
          const endDate = new Date(task.end);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('Invalid task dates:', task);
            // Use fallback dates
            return {
              id: task.id,
              name: task.name,
              start: new Date().toISOString().split('T')[0],
              end: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              progress: task.progress || 0,
              dependencies: '',
              custom_class: task.custom_class || ''
            };
          }
          
          return {
            id: task.id,
            name: task.name,
            start: task.start,
            end: task.end,
            progress: task.progress || 0,
            dependencies: task.dependencies
              .map(dep => dep.task_id)
              .filter(id => id) // Remove empty IDs
              .join(','),
            custom_class: task.custom_class || ''
          };
        });
        
        // Initialize Gantt with error handling
        ganttRef.current = new Gantt(containerRef.current, ganttTasks, {
          view_mode: viewMode,
          date_format: 'YYYY-MM-DD',
          
          // Custom popup HTML
          custom_popup_html: (task: any) => {
            const scheduleTask = tasks.find(t => t.id === task.id);
            if (!scheduleTask) return '';
            
            const progressBar = scheduleTask.progress > 0 ? `
              <div style="width: 100%; background: #e5e7eb; height: 6px; border-radius: 3px; margin: 8px 0;">
                <div style="width: ${scheduleTask.progress}%; background: #3b82f6; height: 100%; border-radius: 3px;"></div>
              </div>
            ` : '';
            
            return `
              <div class="gantt-popup">
                <h5>${scheduleTask.isChangeOrder ? '🔄' : '📋'} ${task.name}</h5>
                <p><strong>Category:</strong> ${scheduleTask.category}</p>
                <p><strong>Duration:</strong> ${formatDateUS(task.start)} to ${formatDateUS(task.end)}</p>
                <p><strong>Progress:</strong> ${scheduleTask.progress}%</p>
                ${progressBar}
                ${scheduleTask.estimated_cost > 0 ? `<p><strong>Budget:</strong> $${scheduleTask.estimated_cost.toLocaleString()}</p>` : ''}
                ${scheduleTask.actual_cost > 0 ? `<p><strong>Actual:</strong> $${scheduleTask.actual_cost.toLocaleString()}</p>` : ''}
                ${task.dependencies ? `<p style="font-size: 11px; color: #64748b;"><strong>Dependencies:</strong> ${task.dependencies}</p>` : ''}
                <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Click to edit</p>
              </div>
            `;
          },
          
          // Click handler
          on_click: (task: any) => {
            try {
              const scheduleTask = tasks.find(t => t.id === task.id);
              if (scheduleTask && onTaskClick) {
                // Close any open popups
                const popups = containerRef.current?.querySelectorAll('.popup-wrapper');
                popups?.forEach(popup => {
                  try {
                    (popup as HTMLElement).style.display = 'none';
                  } catch (e) {
                    // Ignore popup errors
                  }
                });
                onTaskClick(scheduleTask);
              }
            } catch (error) {
              console.error('Error in click handler:', error);
            }
          },
          
          // Date change handler with debouncing
          on_date_change: (task: any, start: Date, end: Date) => {
            try {
              // Validate dates
              if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.error('Invalid dates in on_date_change:', { start, end });
                return;
              }
              
              // Debounce to prevent rapid fire updates
              if (dateChangeTimeoutRef.current) {
                clearTimeout(dateChangeTimeoutRef.current);
              }
              
              dateChangeTimeoutRef.current = setTimeout(() => {
                if (onDateChange) {
                  onDateChange(task.id, start, end).catch(error => {
                    console.error('Error updating task dates:', error);
                  });
                }
              }, 300); // 300ms debounce
            } catch (error) {
              console.error('Error in date_change handler:', error);
            }
          }
        });
        
        // Apply custom styling after a brief delay
        setTimeout(() => {
          try {
            applyCustomStyling();
          } catch (error) {
            console.error('Error applying custom styling:', error);
          }
        }, 100);
        
      } catch (error) {
        console.error('Error initializing Gantt:', error);
        // Display error message in container
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
              <p><strong>Error loading Gantt chart</strong></p>
              <p style="font-size: 14px; color: #64748b;">Please try refreshing the page</p>
            </div>
          `;
        }
      } finally {
        setIsInitializing(false);
      }
    }, 50); // Small delay to ensure DOM is ready
  }, [tasks, viewMode, onTaskClick, onDateChange, applyCustomStyling]);
  
  /**
   * Change view mode
   */
  const changeViewMode = useCallback((mode: 'Day' | 'Week' | 'Month') => {
    if (ganttRef.current) {
      try {
        ganttRef.current.change_view_mode(mode);
        // Reapply styling after view change
        setTimeout(applyCustomStyling, 100);
      } catch (error) {
        console.error('Error changing view mode:', error);
        // Fallback: reinitialize
        initializeGantt();
      }
    }
  }, [applyCustomStyling, initializeGantt]);
  
  /**
   * Refresh tasks without full reinitialization
   */
  const refreshTasks = useCallback(() => {
    if (ganttRef.current && tasks.length > 0) {
      try {
        const ganttTasks = tasks.map(task => ({
          id: task.id,
          name: task.name,
          start: task.start,
          end: task.end,
          progress: task.progress,
          dependencies: task.dependencies
            .map(dep => dep.task_id)
            .join(','),
          custom_class: task.custom_class
        }));
        
        ganttRef.current.refresh(ganttTasks);
        applyCustomStyling();
      } catch (error) {
        console.error('Error refreshing tasks:', error);
        // Fallback: reinitialize
        initializeGantt();
      }
    } else {
      initializeGantt();
    }
  }, [tasks, applyCustomStyling, initializeGantt]);
  
  // Initialize on mount and when dependencies change
  useEffect(() => {
    if (tasks.length > 0 && containerRef.current) {
      initializeGantt();
    }
    
    // Cleanup on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      if (dateChangeTimeoutRef.current) {
        clearTimeout(dateChangeTimeoutRef.current);
      }
      ganttRef.current = null;
    };
  }, [initializeGantt]);
  
  // Handle view mode changes
  useEffect(() => {
    if (ganttRef.current && tasks.length > 0) {
      changeViewMode(viewMode);
    }
  }, [viewMode, changeViewMode]);
  
  return {
    containerRef,
    ganttRef,
    isInitializing,
    refreshTasks,
    changeViewMode
  };
}

