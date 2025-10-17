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
  hours: number;
  hourly_rate: number;
  note: string;
  attachment_url?: string;
  payee_id: string;
  project_id: string;
}

export interface TimeEntryFilters {
  dateFrom: string | null;
  dateTo: string | null;
  status: 'all' | 'pending' | 'approved' | 'rejected';
  workerId: string | null;
  projectId: string | null;
}

export interface TimeEntryStatistics {
  pendingCount: number;
  approvedThisWeekHours: number;
  rejectedCount: number;
  totalThisMonthHours: number;
}
