// Database compatible enum - values match Supabase
export enum ExpenseCategory {
  LABOR = 'labor_internal',
  SUBCONTRACTOR = 'subcontractors', 
  MATERIALS = 'materials',
  EQUIPMENT = 'equipment',
  PERMITS = 'permits',
  MANAGEMENT = 'management',
  OTHER = 'other'
}

export type TransactionType = 'expense' | 'bill' | 'check' | 'credit_card' | 'cash';

// Display mapping for UI
export const EXPENSE_CATEGORY_DISPLAY = {
  [ExpenseCategory.LABOR]: 'Labor (Internal)',
  [ExpenseCategory.SUBCONTRACTOR]: 'Subcontractor',
  [ExpenseCategory.MATERIALS]: 'Materials',
  [ExpenseCategory.EQUIPMENT]: 'Equipment', 
  [ExpenseCategory.PERMITS]: 'Permits & Fees',
  [ExpenseCategory.MANAGEMENT]: 'Management',
  [ExpenseCategory.OTHER]: 'Other'
};

export const TRANSACTION_TYPE_DISPLAY: Record<TransactionType, string> = {
  'expense': 'Expense',
  'bill': 'Bill',
  'check': 'Check',
  'credit_card': 'Credit Card',
  'cash': 'Cash'
};

// Split expense interface
export interface ExpenseSplit {
  id: string;
  expense_id: string;
  project_id: string;
  split_amount: number;
  split_percentage?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  // Join data for display
  project_name?: string;
  project_number?: string;
}

export interface Expense {
  id: string;
  project_id: string;
  description?: string;
  category: ExpenseCategory;
  transaction_type: TransactionType;
  amount: number;
  expense_date: Date;
  payee_id?: string;
  invoice_number?: string;
  is_planned?: boolean;
  created_at: Date;
  updated_at: Date;
  account_name?: string;
  account_full_name?: string;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string; // Changed to string for database compatibility
  rejection_reason?: string;
  // Split expense fields
  is_split?: boolean;
  splits?: ExpenseSplit[]; // Populated when is_split = true
  // Additional fields for display (populated from joins)
  payee_name?: string;
  project_name?: string;
  project_number?: string;
  // For split expenses: the amount allocated to this project (different from parent amount)
  display_amount?: number;
}

export interface ProjectExpenseSummary {
  project_id: string;
  project_name: string;
  estimate_total: number;
  estimated_total_cost: number;
  approved_change_orders: number;
  revised_contract_total: number;
  actual_expenses: number;
  planned_expenses: number;
  unplanned_expenses: number;
  variance: number;
  cost_overrun: number;
  cost_overrun_percentage: number;
  true_margin: number;
  percentage_spent: number;
  cost_utilization_percentage: number;
  category_breakdown: {
    [key in ExpenseCategory]: {
      estimated: number;
      estimated_cost: number;
      actual: number;
      variance: number;
      cost_overrun: number;
    }
  };
}

export interface CSVRow {
  [key: string]: string;
}

export interface ColumnMapping {
  expense_date?: string;
  description?: string;
  amount?: string;
  payee_id?: string;
  category?: string;
  transaction_type?: string;
}

// QuickBooks specific mapping
export interface QBColumnMapping {
  date?: string;
  transaction_type?: string;
  project_wo_number?: string;
  amount?: string;
  name?: string;
}

// Legacy support for existing code
export interface LegacyExpense {
  id: string;
  projectId: string;
  description: string;
  category: 'Labor (Internal)' | 'Subcontractors' | 'Materials' | 'Equipment' | 'Other';
  type: 'Planned' | 'Unplanned';
  amount: number;
  date: Date;
  payee?: string;
  invoiceNumber?: string;
  estimateLineItemId?: string;
  createdAt: Date;
  source: 'manual' | 'csv_import';
  csvData?: {
    originalRow: any;
    importedAt: Date;
    fileName: string;
  };
}