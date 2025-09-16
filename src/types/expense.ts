// Database enum values - must match Supabase
export type ExpenseCategory = 'labor_internal' | 'subcontractors' | 'materials' | 'equipment' | 'other';
export type TransactionType = 'expense' | 'bill' | 'check' | 'credit_card' | 'cash';

// Display mapping for UI
export const EXPENSE_CATEGORY_DISPLAY: Record<ExpenseCategory, string> = {
  'labor_internal': 'Labor (Internal)',
  'subcontractors': 'Subcontractors', 
  'materials': 'Materials',
  'equipment': 'Equipment',
  'other': 'Other'
};

export const TRANSACTION_TYPE_DISPLAY: Record<TransactionType, string> = {
  'expense': 'Expense',
  'bill': 'Bill',
  'check': 'Check',
  'credit_card': 'Credit Card',
  'cash': 'Cash'
};

export interface Expense {
  id: string;
  project_id: string;
  description?: string;
  category: ExpenseCategory;
  transaction_type: TransactionType;
  amount: number;
  expense_date: Date;
  vendor_id?: string;
  invoice_number?: string;
  is_planned?: boolean;
  created_at: Date;
  updated_at: Date;
  // Additional fields for display (populated from joins)
  vendor_name?: string;
  project_name?: string;
}

export interface ProjectExpenseSummary {
  project_id: string;
  project_name: string;
  estimate_total: number;
  approved_change_orders: number;
  revised_contract_total: number;
  actual_expenses: number;
  planned_expenses: number;
  unplanned_expenses: number;
  variance: number;
  percentage_spent: number;
  category_breakdown: {
    [key in ExpenseCategory]: {
      estimated: number;
      actual: number;
      variance: number;
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
  vendor_id?: string;
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
  vendor?: string;
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