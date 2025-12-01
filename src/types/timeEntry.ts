export interface TimeEntryListItem {
  id: string;
  expense_date: string;
  start_time: string | null;
  end_time: string | null;
  amount: number;
  description: string;
  approval_status: 'pending' | 'approved' | 'rejected' | null;
  rejection_reason?: string;
  created_at: string;
  user_id: string;
  worker_name: string;
  project_number: string;
  project_name: string;
  client_name: string;
  project_address: string | null;
  hours: number;
  hourly_rate: number;
  note: string;
  attachment_url?: string;
  payee_id: string | null;
  project_id: string | null;
  is_locked?: boolean;
  lunch_taken: boolean;
  lunch_duration_minutes: number | null;
  gross_hours: number;
  payee?: {
    employee_number?: string;
  };
}

export interface TimeEntryFilters {
  dateFrom: string | null;
  dateTo: string | null;
  status: string[];
  workerIds: string[];
  projectIds: string[];
}

export interface TimeEntryStatistics {
  pendingCount: number;
  approvedThisWeekHours: number;
  rejectedCount: number;
  totalThisMonthHours: number;
}
