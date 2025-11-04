export interface TaskDependency {
  task_id: string;
  task_name: string;
  task_type: 'estimate' | 'change_order';
  type: 'finish-to-start'; // Can extend later: 'start-to-start', 'finish-to-finish'
}

export interface ScheduleTask {
  id: string;
  name: string; // description field
  category: string;
  start: string; // ISO date string
  end: string; // ISO date string
  progress: number; // 0-100, calculated from expenses
  dependencies: TaskDependency[];
  custom_class: string; // for Gantt styling
  isChangeOrder: boolean;
  notes?: string;
  
  // Additional metadata
  estimated_cost: number;
  actual_cost: number;
  payee_id?: string;
  payee_name?: string;
  
  // Change order metadata
  change_order_number?: string;
}

export interface ScheduleWarning {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  task_id: string;
  task_name: string;
  suggestion?: string;
  canDismiss: boolean;
}

export interface ScheduleSettings {
  showDependencies: boolean;
  warnings: {
    unusualSequence: boolean;
    dateOverlap: boolean;
    changeOrderTiming: boolean;
    resourceConflicts: boolean;
  };
}

