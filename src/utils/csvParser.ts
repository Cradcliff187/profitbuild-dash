import Papa from 'papaparse';
import { CSVRow, ColumnMapping, Expense, ExpenseCategory, TransactionType } from '@/types/expense';
import { supabase } from '@/integrations/supabase/client';

// Robust amount parser for QuickBooks and other CSV formats
const parseQuickBooksAmount = (amount: string | number): number => {
  if (typeof amount === 'number') return amount;
  if (!amount || typeof amount !== 'string') return 0;
  
  const cleanAmount = amount.replace(/[,"$\s]/g, ''); // Remove quotes, commas, currency, spaces
  const isNegative = cleanAmount.includes('(') || cleanAmount.startsWith('-');
  const numericString = cleanAmount.replace(/[()$€£¥-]/g, ''); // Remove all non-numeric except decimal
  const parsedAmount = parseFloat(numericString) || 0;
  
  return isNegative ? -parsedAmount : parsedAmount;
};

export interface ParseResult {
  data: CSVRow[];
  errors: string[];
  headers: string[];
}

export const parseCSVFile = (file: File): Promise<ParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors = results.errors.map(error => `Row ${error.row}: ${error.message}`);
        resolve({
          data: results.data as CSVRow[],
          errors,
          headers: results.meta.fields || []
        });
      },
      error: (error) => {
        resolve({
          data: [],
          errors: [error.message],
          headers: []
        });
      }
    });
  });
};

export const mapCSVToExpenses = (
  data: CSVRow[],
  mapping: ColumnMapping,
  projectId: string,
  fileName: string
): Expense[] => {
  return data.map((row, index) => {
    const dateStr = mapping.expense_date ? row[mapping.expense_date] : '';
    const amountStr = mapping.amount ? row[mapping.amount] : '0';
    
    // Parse date
    let expense_date = new Date();
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        expense_date = parsedDate;
      }
    }

    // Parse amount using robust parser
    const amount = parseQuickBooksAmount(amountStr);

    // Get description
    const description = mapping.description ? row[mapping.description] : `Imported expense ${index + 1}`;

    // Auto-categorize based on description keywords
    const category = categorizeExpense(description);

    return {
      id: crypto.randomUUID(),
      project_id: projectId,
      description,
      category,
      transaction_type: 'expense' as const,
      amount,
      expense_date,
      vendor_id: mapping.vendor_id && row[mapping.vendor_id] ? row[mapping.vendor_id].trim() : undefined,
      invoice_number: undefined,
      is_planned: false,
      created_at: new Date(),
      updated_at: new Date()
    };
  });
};

const categorizeExpense = (description: string): ExpenseCategory => {
  const desc = description.toLowerCase();
  
  if (desc.includes('labor') || desc.includes('wage') || desc.includes('payroll')) {
    return 'labor_internal';
  }
  if (desc.includes('contractor') || desc.includes('subcontractor')) {
    return 'subcontractors';
  }
  if (desc.includes('material') || desc.includes('supply') || desc.includes('lumber') || desc.includes('concrete')) {
    return 'materials';
  }
  if (desc.includes('equipment') || desc.includes('rental') || desc.includes('tool') || desc.includes('machinery')) {
    return 'equipment';
  }
  
  return 'other';
};

export const validateCSVData = (data: CSVRow[], mapping: ColumnMapping): string[] => {
  const errors: string[] = [];
  
  if (!mapping.amount) {
    errors.push('Amount column is required');
  }
  
  if (!mapping.description) {
    errors.push('Description column is required');
  }

  data.forEach((row, index) => {
    if (mapping.amount && !row[mapping.amount]) {
      errors.push(`Row ${index + 1}: Missing amount`);
    }
    
    if (mapping.amount && row[mapping.amount]) {
      const parsedAmount = parseQuickBooksAmount(row[mapping.amount]);
      if (isNaN(parsedAmount)) {
        errors.push(`Row ${index + 1}: Invalid amount format`);
      }
    }
  });

  return errors;
};

// QuickBooks-specific interfaces
export interface QBParseResult {
  data: QBTransaction[];
  errors: string[];
  headers: string[];
}

export interface QBTransaction {
  date: string;
  transaction_type: string;
  project_wo_number: string;
  amount: string;
  name: string;
  [key: string]: string;
}

export interface QBImportResult {
  total: number;
  successful: number;
  failed: number;
  expenses: Expense[];
  unmatchedProjects: string[];
  unmatchedVendors: string[];
  errors: string[];
}

// Parse QuickBooks CSV (skip first 4 rows)
export const parseQuickBooksCSV = (file: File): Promise<QBParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        // Skip first 4 rows (QuickBooks headers)
        const dataRows = results.data.slice(4);
        
        // Assume the 5th row contains column headers
        const headers = dataRows[0] as string[];
        const actualData = dataRows.slice(1);

        // Map to QB transaction format
        const transactions: QBTransaction[] = actualData.map((row: any) => {
          const transaction: QBTransaction = {} as QBTransaction;
          headers.forEach((header, index) => {
            const cleanHeader = header.toLowerCase().trim();
            if (cleanHeader.includes('date')) {
              transaction.date = row[index] || '';
            } else if (cleanHeader.includes('type') || cleanHeader.includes('transaction')) {
              transaction.transaction_type = row[index] || '';
            } else if (cleanHeader.includes('project') || cleanHeader.includes('job') || cleanHeader.includes('wo')) {
              transaction.project_wo_number = row[index] || '';
            } else if (cleanHeader.includes('amount') || cleanHeader.includes('total')) {
              transaction.amount = row[index] || '0';
            } else if (cleanHeader.includes('name') || cleanHeader.includes('payee') || cleanHeader.includes('vendor')) {
              transaction.name = row[index] || '';
            }
            transaction[header] = row[index] || '';
          });
          return transaction;
        });

        resolve({
          data: transactions,
          errors: results.errors.map(error => `Row ${error.row}: ${error.message}`),
          headers
        });
      },
      error: (error) => {
        resolve({
          data: [],
          errors: [error.message],
          headers: []
        });
      }
    });
  });
};

// Map QuickBooks transaction type to our internal type
const mapQBTransactionType = (qbType: string): TransactionType => {
  const type = qbType.toLowerCase().trim();
  
  if (type.includes('bill')) return 'bill';
  if (type.includes('check')) return 'check';
  if (type.includes('credit card') || type.includes('credit_card')) return 'credit_card';
  if (type.includes('cash')) return 'cash';
  
  return 'expense'; // default
};

// Map QuickBooks transactions to expenses
export const mapQuickBooksToExpenses = async (
  transactions: QBTransaction[],
  fileName: string
): Promise<QBImportResult> => {
  const result: QBImportResult = {
    total: transactions.length,
    successful: 0,
    failed: 0,
    expenses: [],
    unmatchedProjects: [],
    unmatchedVendors: [],
    errors: []
  };

  try {
    // Load projects and vendors for matching
    const [projectsResponse, vendorsResponse] = await Promise.all([
      supabase.from('projects').select('id, project_number, project_name'),
      supabase.from('vendors').select('id, vendor_name, full_name')
    ]);

    const projects = projectsResponse.data || [];
    const vendors = vendorsResponse.data || [];

    // Find a default project for unmatched transactions
    let defaultProject = projects.find(p => p.project_name.toLowerCase().includes('misc') || p.project_name.toLowerCase().includes('general'));
    if (!defaultProject && projects.length > 0) {
      defaultProject = projects[0]; // Use first project as fallback
    }

    if (!defaultProject) {
      result.errors.push('No projects found in database. Please create at least one project before importing.');
      return result;
    }

    for (const transaction of transactions) {
      try {
        // Parse date
        let expense_date = new Date();
        if (transaction.date) {
          const parsedDate = new Date(transaction.date);
          if (!isNaN(parsedDate.getTime())) {
            expense_date = parsedDate;
          }
        }

        // Parse amount using robust parser
        const amount = parseQuickBooksAmount(transaction.amount);

        // Match project
        let matchedProject = defaultProject;
        if (transaction.project_wo_number) {
          const foundProject = projects.find(p => 
            p.project_number.toLowerCase() === transaction.project_wo_number.toLowerCase()
          );
          if (foundProject) {
            matchedProject = foundProject;
          } else {
            if (!result.unmatchedProjects.includes(transaction.project_wo_number)) {
              result.unmatchedProjects.push(transaction.project_wo_number);
            }
          }
        }

        // Match vendor
        let vendorId: string | undefined;
        if (transaction.name) {
          const foundVendor = vendors.find(v => 
            v.vendor_name.toLowerCase() === transaction.name.toLowerCase() ||
            (v.full_name && v.full_name.toLowerCase() === transaction.name.toLowerCase())
          );
          if (foundVendor) {
            vendorId = foundVendor.id;
          } else {
            if (!result.unmatchedVendors.includes(transaction.name)) {
              result.unmatchedVendors.push(transaction.name);
            }
          }
        }

        // Create expense
        const expense: Expense = {
          id: crypto.randomUUID(),
          project_id: matchedProject.id,
          description: `${transaction.name || 'QB Import'} - ${transaction.transaction_type}`,
          category: categorizeExpense(transaction.name || ''),
          transaction_type: mapQBTransactionType(transaction.transaction_type),
          amount,
          expense_date,
          vendor_id: vendorId,
          is_planned: false,
          created_at: new Date(),
          updated_at: new Date()
        };

        result.expenses.push(expense);
        result.successful++;

      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to process transaction: ${error}`);
      }
    }

  } catch (error) {
    result.errors.push(`Database error: ${error}`);
  }

  return result;
};