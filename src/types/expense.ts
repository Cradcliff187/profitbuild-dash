export type ExpenseCategory = 'Labor (Internal)' | 'Subcontractors' | 'Materials' | 'Equipment' | 'Other';
export type ExpenseType = 'Planned' | 'Unplanned';

export interface Expense {
  id: string;
  projectId: string;
  description: string;
  category: ExpenseCategory;
  type: ExpenseType;
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

export interface ProjectExpenseSummary {
  projectId: string;
  projectName: string;
  estimateTotal: number;
  actualExpenses: number;
  plannedExpenses: number;
  unplannedExpenses: number;
  variance: number;
  percentageSpent: number;
  categoryBreakdown: {
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
  date?: string;
  description?: string;
  amount?: string;
  vendor?: string;
  category?: string;
}