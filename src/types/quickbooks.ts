// Use string type for app_category to match database enum values
export interface QuickBooksAccountMapping {
  id: string;
  app_category: string; // Database expense_category enum value
  qb_account_name: string;
  qb_account_full_path: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QuickBooksSyncLog {
  id: string;
  sync_type: string;
  status: 'pending' | 'success' | 'failed';
  records_synced?: number;
  error_message?: string;
  created_at: string;
}

export interface QuickBooksConnection {
  id: string;
  realm_id: string;
  company_name?: string;
  is_active: boolean;
  environment: string;
  connected_at?: string;
  last_sync_at?: string;
  last_error?: string;
}
