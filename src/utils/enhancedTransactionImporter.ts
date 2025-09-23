import Papa from 'papaparse';
import { ExpenseCategory, TransactionType } from '@/types/expense';
import { supabase } from '@/integrations/supabase/client';

export interface TransactionCSVRow {
  [key: string]: string;
}

export interface ParsedTransactionData {
  data: TransactionCSVRow[];
  headers: string[];
  errors: string[];
}

export interface ExpenseImportData {
  project_id: string; // Always assigned now (either real project or unassigned)
  description: string;
  category: ExpenseCategory;
  transaction_type: TransactionType;
  amount: number;
  expense_date: string;
  payee_id?: string;
  invoice_number?: string;
  account_name?: string;
  account_full_name?: string;
  quickbooks_transaction_id?: string;
}

export interface RevenueImportData {
  project_id: string; // Always assigned now (either real project or unassigned)
  client_id?: string;
  amount: number;
  invoice_date: string;
  description?: string;
  invoice_number?: string;
  account_name?: string;
  account_full_name?: string;
  quickbooks_transaction_id?: string;
}

export interface TransactionImportResult {
  expenses: ExpenseImportData[];
  revenues: RevenueImportData[];
  unassociated_expenses: number;
  unassociated_revenues: number;
  category_mappings_used: Record<string, string>;
  errors: string[];
}

// Account mapping from QuickBooks account paths to expense categories
const ACCOUNT_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  'cost of goods sold:contract labor': ExpenseCategory.SUBCONTRACTOR,
  'cost of goods sold:supplies & materials': ExpenseCategory.MATERIALS,
  'cost of goods sold:equipment rental - cogs': ExpenseCategory.EQUIPMENT,
  'cost of goods sold:equipment rental': ExpenseCategory.EQUIPMENT,
  'cost of goods sold:job site dumpsters': ExpenseCategory.MATERIALS,
  'office expenses:office equipment & supplies': ExpenseCategory.MANAGEMENT,
  'vehicle expenses:vehicle gas & fuel': ExpenseCategory.MANAGEMENT,
  'general business expenses:uniforms': ExpenseCategory.MANAGEMENT,
  'rent:building & land rent': ExpenseCategory.MANAGEMENT,
  'employee benefits:workers\' compensation insurance': ExpenseCategory.MANAGEMENT,
  'insurance:business insurance': ExpenseCategory.MANAGEMENT,
  'legal & accounting services:legal fees': ExpenseCategory.MANAGEMENT,
};

// Transaction type mapping
const TRANSACTION_TYPE_MAP: Record<string, TransactionType> = {
  'bill': 'bill',
  'check': 'check',
  'expense': 'expense',
};

export const parseTransactionCSV = (file: File): Promise<ParsedTransactionData> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        const data = results.data as TransactionCSVRow[];
        const errors: string[] = [];
        
        // Get headers and filter empty ones
        const headers = Object.keys(data[0] || {}).filter(h => h && h.trim() !== '');
        
        console.log('Transaction CSV parsed:', { 
          totalRows: data.length, 
          headers,
          sampleRow: data[0] 
        });
        
        // Validate we have expected columns
        const requiredColumns = ['Date', 'Transaction type', 'Amount', 'Name'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
        }
        
        if (data.length === 0) {
          errors.push('No transaction data found in CSV file');
        }
        
        resolve({
          data,
          headers,
          errors
        });
      },
      error: (error) => {
        resolve({
          data: [],
          headers: [],
          errors: [`Failed to parse CSV: ${error.message}`]
        });
      }
    });
  });
};

export const processTransactionImport = async (
  data: TransactionCSVRow[]
): Promise<TransactionImportResult> => {
  const expenses: ExpenseImportData[] = [];
  const revenues: RevenueImportData[] = [];
  const errors: string[] = [];
  const categoryMappingsUsed: Record<string, string> = {};

  // Define the unassigned project ID constant
  const UNASSIGNED_PROJECT_ID = '00000000-0000-0000-0000-000000000002';
  const UNASSIGNED_CLIENT_ID = '00000000-0000-0000-0000-000000000001';

  // Load clients and payees for matching
  const { data: clients } = await supabase.from('clients').select('*');
  const { data: payees } = await supabase.from('payees').select('*');
  const { data: projects } = await supabase.from('projects').select('*');

  // Create lookup maps
  const clientMap = new Map<string, string>();
  const payeeMap = new Map<string, string>();
  const projectMap = new Map<string, string>();

  clients?.forEach(client => {
    const normalizedName = normalizeString(client.client_name);
    clientMap.set(normalizedName, client.id);
    if (client.company_name) {
      clientMap.set(normalizeString(client.company_name), client.id);
    }
  });

  payees?.forEach(payee => {
    const normalizedName = normalizeString(payee.payee_name);
    payeeMap.set(normalizedName, payee.id);
    if (payee.full_name) {
      payeeMap.set(normalizeString(payee.full_name), payee.id);
    }
  });

  projects?.forEach(project => {
    const normalizedNumber = normalizeString(project.project_number);
    projectMap.set(normalizedNumber, project.id);
    if (project.project_name) {
      projectMap.set(normalizeString(project.project_name), project.id);
    }
  });

  let unassociated_expenses = 0;
  let unassociated_revenues = 0;

  for (const row of data) {
    try {
      const transactionType = row['Transaction type']?.toLowerCase();
      const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
      const date = formatDateForDB(row['Date']);
      const name = row['Name']?.trim() || '';
      const projectWO = row['Project/WO #']?.trim() || '';
      const accountFullName = row['Account full name']?.trim() || '';
      const accountName = row['Account name']?.trim() || '';

      // Find project if specified
      let project_id: string = UNASSIGNED_PROJECT_ID; // Default to unassigned project
      let isUnassigned = true;
      
      if (projectWO) {
        const foundProjectId = projectMap.get(normalizeString(projectWO));
        if (foundProjectId) {
          project_id = foundProjectId;
          isUnassigned = false;
        }
      }

      if (transactionType === 'invoice') {
        // This is revenue
        const client_id = clientMap.get(normalizeString(name)) || (isUnassigned ? UNASSIGNED_CLIENT_ID : undefined);
        
        const revenue: RevenueImportData = {
          project_id,
          client_id,
          amount: Math.abs(amount), // Ensure positive for revenue
          invoice_date: date,
          description: `Invoice from ${name}${isUnassigned ? ' (Unassigned)' : ''}`,
          account_name: accountName,
          account_full_name: accountFullName,
        };

        revenues.push(revenue);
        
        if (isUnassigned) {
          unassociated_revenues++;
        }
      } else {
        // This is an expense
        const payee_id = payeeMap.get(normalizeString(name)) || undefined;
        const category = mapAccountToCategory(accountFullName);
        const txType = mapTransactionType(transactionType);

        if (category) {
          categoryMappingsUsed[accountFullName] = category;
        }

        const expense: ExpenseImportData = {
          project_id,
          description: `${transactionType} - ${name}${isUnassigned ? ' (Unassigned)' : ''}`,
          category: category || ExpenseCategory.MANAGEMENT,
          transaction_type: txType,
          amount: Math.abs(amount), // Ensure positive for expenses
          expense_date: date,
          payee_id,
          account_name: accountName,
          account_full_name: accountFullName,
        };

        expenses.push(expense);

        if (isUnassigned) {
          unassociated_expenses++;
        }
      }
    } catch (error) {
      errors.push(`Error processing row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    expenses,
    revenues,
    unassociated_expenses,
    unassociated_revenues,
    category_mappings_used: categoryMappingsUsed,
    errors
  };
};

const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const formatDateForDB = (dateString: string): string => {
  if (!dateString) return new Date().toISOString().split('T')[0];
  
  // Parse M/D/YYYY format
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  
  return date.toISOString().split('T')[0];
};

const mapAccountToCategory = (accountFullName: string): ExpenseCategory | null => {
  if (!accountFullName) return null;
  
  const normalized = accountFullName.toLowerCase().trim();
  return ACCOUNT_CATEGORY_MAP[normalized] || null;
};

const mapTransactionType = (transactionType: string): TransactionType => {
  if (!transactionType) return 'expense';
  
  const normalized = transactionType.toLowerCase().trim();
  return TRANSACTION_TYPE_MAP[normalized] || 'expense';
};