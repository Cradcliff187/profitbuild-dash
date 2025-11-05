export interface TaskDependency {
  task_id: string;
  task_name: string;
  task_type: 'estimate' | 'change_order';
  type: 'finish-to-start'; // Can extend later: 'start-to-start', 'finish-to-finish'
}

export interface SchedulePhase {
  phase_number: number;
  description?: string;
  start_date: string; // ISO date string
  end_date: string;
  duration_days: number;
  notes?: string;
  completed?: boolean; // Manual completion override
}

export interface ScheduleTask {
  id: string;
  name: string; // description field
  category: string;
  start: string; // ISO date string - First phase start OR single scheduled_start_date
  end: string; // ISO date string - Last phase end OR single scheduled_end_date
  progress: number; // 0-100, calculated from expenses
  dependencies: TaskDependency[];
  custom_class: string; // for Gantt styling
  isChangeOrder: boolean;
  schedule_notes?: string;
  
  // Multi-phase support
  phases?: SchedulePhase[]; // Parsed from schedule_notes JSON
  has_multiple_phases: boolean;
  
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

