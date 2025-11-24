import { format } from 'date-fns';
import { ScheduleTask } from '@/types/schedule';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleExportOptions {
  includeProgress: boolean;
  includeCosts: boolean;
  includeDependencies: boolean;
  includeNotes: boolean;
  sortBy: 'start_date' | 'category' | 'name';
}

/**
 * Export schedule tasks to CSV format
 */
export const exportScheduleToCSV = (
  tasks: ScheduleTask[],
  projectName: string,
  options: ScheduleExportOptions
) => {
  if (tasks.length === 0) {
    return;
  }

  // Sort tasks based on option
  let sortedTasks = [...tasks];
  switch (options.sortBy) {
    case 'start_date':
      sortedTasks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      break;
    case 'category':
      sortedTasks.sort((a, b) => a.category.localeCompare(b.category));
      break;
    case 'name':
      sortedTasks.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  // Build headers
  const headers = [
    'Task Name',
    'Category',
    'Start Date',
    'End Date',
    'Duration (Days)',
    'Type'
  ];

  if (options.includeProgress) {
    headers.push('Progress (%)', 'Status');
  }

  if (options.includeCosts) {
    headers.push('Estimated Cost', 'Actual Cost', 'Cost Variance');
  }

  if (options.includeDependencies) {
    headers.push('Dependencies', 'Dependent Tasks');
  }

  if (options.includeNotes) {
    headers.push('Notes');
  }

  // Build rows - expand multi-phase tasks
  const rows = sortedTasks.flatMap(task => {
    if (task.has_multiple_phases && task.phases) {
      // Export each phase as a separate row
      return task.phases.map((phase: any) => {
        const startDate = new Date(phase.start_date);
        const endDate = new Date(phase.end_date);
        const phaseName = `${task.name} - Phase ${phase.phase_number}${phase.description ? `: ${phase.description}` : ''}`;
        
        const row = [
          phaseName.replace(/,/g, ';'),
          formatCategory(task.category),
          format(startDate, 'yyyy-MM-dd'),
          format(endDate, 'yyyy-MM-dd'),
          phase.duration_days.toString(),
          task.isChangeOrder ? 'Change Order' : 'Original Estimate'
        ];

        if (options.includeProgress) {
          row.push(
            task.progress.toString(),
            getStatusFromProgress(task.progress)
          );
        }

        if (options.includeCosts) {
          const variance = (task.actual_cost || 0) - (task.estimated_cost || 0);
          row.push(
            formatCurrency(task.estimated_cost || 0),
            formatCurrency(task.actual_cost || 0),
            formatCurrency(variance)
          );
        }

        if (options.includeDependencies) {
          const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
          const depNames = deps
            .map(dep => dep.task_name || dep.task_id)
            .join('; ');
          row.push(depNames || 'None', 'None');
        }

        if (options.includeNotes) {
          row.push((phase.notes || '').replace(/,/g, ';').replace(/\n/g, ' '));
        }

        return row;
      });
    } else {
      // Single phase task
      const startDate = new Date(task.start);
      const endDate = new Date(task.end);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      const row = [
        task.name.replace(/,/g, ';'),
        formatCategory(task.category),
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd'),
        duration.toString(),
        task.isChangeOrder ? 'Change Order' : 'Original Estimate'
      ];

    if (options.includeProgress) {
      row.push(
        task.progress.toString(),
        getStatusFromProgress(task.progress)
      );
    }

    if (options.includeCosts) {
      const variance = (task.actual_cost || 0) - (task.estimated_cost || 0);
      row.push(
        formatCurrency(task.estimated_cost || 0),
        formatCurrency(task.actual_cost || 0),
        formatCurrency(variance)
      );
    }

      if (options.includeDependencies) {
        const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
        const depNames = deps
          .map(dep => dep.task_name || dep.task_id)
          .join('; ');
        
        const dependents = sortedTasks
          .filter(t => {
            const tDeps = Array.isArray(t.dependencies) ? t.dependencies : [];
            return tDeps.some(dep => dep.task_id === task.id);
          })
          .map(t => t.name)
          .join('; ');

        row.push(
          depNames || 'None',
          dependents || 'None'
        );
      }

      if (options.includeNotes) {
        row.push((task.schedule_notes || '').replace(/,/g, ';').replace(/\n/g, ' '));
      }

      return [row];
    }
  }).flat();

  // Combine headers and rows
  const csvContent = [
    // Add project header
    [`Project: ${projectName}`],
    [`Exported: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
    [`Total Tasks: ${tasks.length}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.join(','))
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(projectName)}_schedule_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format category for display
 */
function formatCategory(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get status based on progress percentage
 */
function getStatusFromProgress(progress: number): string {
  if (progress === 0) return 'Not Started';
  if (progress < 100) return 'In Progress';
  return 'Complete';
}

/**
 * Format currency for CSV
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Sanitize filename for safe download
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Export schedule by day - shows all tasks active on each date
 */
export const exportScheduleByDay = (
  tasks: ScheduleTask[],
  projectName: string
) => {
  if (tasks.length === 0) {
    return;
  }

  // Find overall date range
  const allDates = tasks.flatMap(task => [new Date(task.start), new Date(task.end)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Generate all dates in range
  const dateRange: Date[] = [];
  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Build headers
  const headers = [
    'Date',
    'Day of Week',
    'Active Tasks',
    'Tasks Starting',
    'Tasks Ending',
    'Total Active'
  ];

  // Build rows - one per day
  const rows = dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = format(date, 'EEEE');
    
    // Find tasks active on this date
    const activeTasks = tasks.filter(task => {
      const taskStart = new Date(task.start);
      const taskEnd = new Date(task.end);
      return taskStart <= date && taskEnd >= date;
    });

    // Find tasks starting on this date
    const startingTasks = tasks.filter(task => {
      const taskStart = new Date(task.start);
      return format(taskStart, 'yyyy-MM-dd') === dateStr;
    });

    // Find tasks ending on this date
    const endingTasks = tasks.filter(task => {
      const taskEnd = new Date(task.end);
      return format(taskEnd, 'yyyy-MM-dd') === dateStr;
    });

    // Format task lists
    const activeTasksStr = activeTasks
      .map(t => `${t.name} (${formatCategory(t.category)})`)
      .join('; ') || 'None';
    
    const startingTasksStr = startingTasks
      .map(t => t.name)
      .join('; ') || 'None';
    
    const endingTasksStr = endingTasks
      .map(t => t.name)
      .join('; ') || 'None';

    return [
      dateStr,
      dayOfWeek,
      activeTasksStr.replace(/,/g, ';'),
      startingTasksStr.replace(/,/g, ';'),
      endingTasksStr.replace(/,/g, ';'),
      activeTasks.length.toString()
    ];
  });

  // Combine headers and rows
  const csvContent = [
    // Add project header
    [`Project: ${projectName}`],
    [`Daily Activity Schedule`],
    [`Exported: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
    [`Date Range: ${format(minDate, 'MMM dd, yyyy')} - ${format(maxDate, 'MMM dd, yyyy')}`],
    [`Total Days: ${dateRange.length}`],
    [`Total Tasks: ${tasks.length}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.join(','))
    .join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(projectName)}_daily_schedule_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Load schedule tasks for a specific project
 */
async function loadProjectScheduleTasks(projectId: string): Promise<{ tasks: ScheduleTask[], projectName: string }> {
  try {
    // Load project name
    const { data: project } = await supabase
      .from('projects')
      .select('project_name')
      .eq('id', projectId)
      .single();

    // Load approved estimate with line items
    const { data: estimate } = await supabase
      .from('estimates')
      .select(`
        id,
        estimate_line_items (
          id,
          category,
          description,
          total_cost,
          scheduled_start_date,
          scheduled_end_date
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'approved')
      .order('date_created', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load approved change orders with line items
    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select(`
        id,
        change_order_number,
        change_order_line_items (
          id,
          category,
          description,
          total_cost,
          scheduled_start_date,
          scheduled_end_date
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'approved');

    // Convert to ScheduleTask format
    const tasks: ScheduleTask[] = [];

    // Add estimate tasks
    if (estimate?.estimate_line_items) {
      estimate.estimate_line_items.forEach((item: any) => {
        if (item.scheduled_start_date && item.scheduled_end_date) {
          tasks.push({
            id: item.id,
            name: item.description || 'Untitled Task',
            category: item.category || 'general',
            start: item.scheduled_start_date,
            end: item.scheduled_end_date,
            progress: 0,
            dependencies: [],
            custom_class: 'estimate-task',
            isChangeOrder: false,
            has_multiple_phases: false,
            estimated_cost: item.total_cost || 0,
            actual_cost: 0
          });
        }
      });
    }

    // Add change order tasks
    if (changeOrders) {
      changeOrders.forEach((co: any) => {
        if (co.change_order_line_items) {
          co.change_order_line_items.forEach((item: any) => {
            if (item.scheduled_start_date && item.scheduled_end_date) {
              tasks.push({
                id: item.id,
                name: item.description || 'Untitled Task',
                category: item.category || 'general',
                start: item.scheduled_start_date,
                end: item.scheduled_end_date,
                progress: 0,
                dependencies: [],
                custom_class: 'change-order-task',
                isChangeOrder: true,
                has_multiple_phases: false,
                change_order_number: co.change_order_number,
                estimated_cost: item.total_cost || 0,
                actual_cost: 0
              });
            }
          });
        }
      });
    }

    return {
      tasks,
      projectName: project?.project_name || 'Unknown Project'
    };
  } catch (error) {
    console.error(`Error loading schedule for project ${projectId}:`, error);
    return { tasks: [], projectName: 'Unknown Project' };
  }
}

/**
 * Export schedules for all projects with scheduled tasks
 */
export const exportAllProjectsSchedule = async (format: 'csv' | 'daily-activity' | 'ms-project') => {
  try {
    // Load all active projects (exclude system projects)
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, project_name, project_number, category')
      .eq('category', 'construction')
      .in('status', ['approved', 'in_progress', 'complete'])
      .order('project_number', { ascending: false });

    if (error) throw error;

    // Load schedule data for each project
    const allProjectData = await Promise.all(
      (projects || []).map(project => loadProjectScheduleTasks(project.id))
    );

    // Filter to only projects with tasks
    const projectsWithTasks = allProjectData.filter(p => p.tasks.length > 0);

    if (projectsWithTasks.length === 0) {
      throw new Error('No projects with scheduled tasks found');
    }

    // Combine all tasks with project identifier
    const allTasks: (ScheduleTask & { projectName: string })[] = [];
    projectsWithTasks.forEach(projectData => {
      projectData.tasks.forEach(task => {
        allTasks.push({
          ...task,
          projectName: projectData.projectName
        });
      });
    });

    // Sort by start date
    allTasks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Export based on format
    if (format === 'daily-activity') {
      exportMultiProjectDailyActivity(allTasks, projectsWithTasks.length);
    } else if (format === 'ms-project') {
      exportMultiProjectMSProject(allTasks, projectsWithTasks.length);
    } else {
      exportMultiProjectCSV(allTasks, projectsWithTasks.length);
    }

    return {
      success: true,
      projectCount: projectsWithTasks.length,
      taskCount: allTasks.length
    };
  } catch (error) {
    console.error('Error exporting all projects:', error);
    throw error;
  }
};

/**
 * Export multi-project CSV
 */
function exportMultiProjectCSV(tasks: (ScheduleTask & { projectName: string })[], projectCount: number) {
  const headers = [
    'Project',
    'Task Name',
    'Category',
    'Start Date',
    'End Date',
    'Duration (Days)',
    'Type',
    'Estimated Cost'
  ];

  const rows = tasks.map(task => {
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return [
      task.projectName.replace(/,/g, ';'),
      task.name.replace(/,/g, ';'),
      formatCategory(task.category),
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      duration.toString(),
      task.isChangeOrder ? 'Change Order' : 'Original Estimate',
      formatCurrency(task.estimated_cost || 0)
    ];
  });

  const csvContent = [
    ['All Projects Schedule Export'],
    [`Exported: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
    [`Total Projects: ${projectCount}`],
    [`Total Tasks: ${tasks.length}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `all_projects_schedule_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export multi-project daily activity
 */
function exportMultiProjectDailyActivity(tasks: (ScheduleTask & { projectName: string })[], projectCount: number) {
  const allDates = tasks.flatMap(task => [new Date(task.start), new Date(task.end)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  const dateRange: Date[] = [];
  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const headers = ['Date', 'Day of Week', 'Active Projects', 'Active Tasks', 'Total Active'];

  const rows = dateRange.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = format(date, 'EEEE');

    const activeTasks = tasks.filter(task => {
      const taskStart = new Date(task.start);
      const taskEnd = new Date(task.end);
      return taskStart <= date && taskEnd >= date;
    });

    const activeProjects = [...new Set(activeTasks.map(t => t.projectName))];
    const tasksList = activeTasks
      .map(t => `${t.projectName}: ${t.name}`)
      .join('; ') || 'None';

    return [
      dateStr,
      dayOfWeek,
      activeProjects.join('; ') || 'None',
      tasksList.replace(/,/g, ';'),
      activeTasks.length.toString()
    ];
  });

  const csvContent = [
    ['All Projects - Daily Activity Schedule'],
    [`Exported: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
    [`Total Projects: ${projectCount}`],
    [`Date Range: ${format(minDate, 'MMM dd, yyyy')} - ${format(maxDate, 'MMM dd, yyyy')}`],
    [],
    headers,
    ...rows
  ]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `all_projects_daily_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export multi-project MS Project format
 */
function exportMultiProjectMSProject(tasks: (ScheduleTask & { projectName: string })[], projectCount: number) {
  const headers = ['ID', 'Project', 'Name', 'Duration', 'Start', 'Finish', 'Resource Names'];

  const rows = tasks.map((task, index) => {
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return [
      (index + 1).toString(),
      task.projectName.replace(/,/g, ';'),
      task.name.replace(/,/g, ';'),
      `${duration}d`,
      format(startDate, 'MM/dd/yyyy'),
      format(endDate, 'MM/dd/yyyy'),
      formatCategory(task.category)
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `all_projects_msproject_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export schedule as Microsoft Project compatible CSV
 * (Simplified format that MS Project can import)
 */
export const exportScheduleToMSProject = (
  tasks: ScheduleTask[],
  projectName: string
) => {
  // MS Project CSV format
  const headers = [
    'ID',
    'Name',
    'Duration',
    'Start',
    'Finish',
    'Predecessors',
    'Resource Names'
  ];

  const rows = tasks.map((task, index) => {
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Format dependencies as MS Project expects (task IDs)
    const deps = Array.isArray(task.dependencies) 
      ? task.dependencies.map(dep => {
          const depIndex = tasks.findIndex(t => t.id === dep.task_id);
          return depIndex >= 0 ? (depIndex + 1).toString() : '';
        }).filter(Boolean).join(',')
      : '';

    return [
      (index + 1).toString(),
      task.name.replace(/,/g, ';'),
      `${duration}d`,
      format(startDate, 'MM/dd/yyyy'),
      format(endDate, 'MM/dd/yyyy'),
      deps || '',
      formatCategory(task.category)
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(projectName)}_msproject_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

