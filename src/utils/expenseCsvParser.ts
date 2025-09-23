import Papa from 'papaparse';
import { ExpenseCategory, TransactionType } from '@/types/expense';

export interface ExpenseCSVRow {
  [key: string]: string;
}

export interface ExpenseColumnMapping {
  expense_date?: string;
  description?: string;
  amount?: string;
  payee_name?: string;
  category?: string;
  transaction_type?: string;
  project_name?: string;
  invoice_number?: string;
}

export interface ParsedExpenseCSV {
  data: ExpenseCSVRow[];
  headers: string[];
  errors: string[];
}

export const parseExpenseCSVFile = (file: File): Promise<ParsedExpenseCSV> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        let data = results.data as ExpenseCSVRow[];
        let errors: string[] = [];
        
        console.log('Raw expense CSV parse results:', { dataLength: data.length, firstRow: data[0] });
        
        // Handle QuickBooks format - improved detection
        if (data.length > 0) {
          let skipRows = 0;
          
          // Check first few rows for QuickBooks metadata
          for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            const rowValues = Object.values(row);
            const hasQuickBooksMetadata = rowValues.some(val => 
              val?.toLowerCase().includes('quickbooks') || 
              val?.toLowerCase().includes('transaction') ||
              val?.toLowerCase().includes('report') ||
              val?.toLowerCase().includes('akc llc') ||
              (!val || val.trim() === '') // Empty row
            );
            
            if (hasQuickBooksMetadata) {
              skipRows = i + 1;
            } else {
              break; // Found actual data row
            }
          }
          
          if (skipRows > 0) {
            console.log(`Skipping ${skipRows} QuickBooks header rows`);
            data = data.slice(skipRows);
          }
        }
        
        // Clean and filter headers to remove empty ones
        let headers: string[] = [];
        if (data.length > 0) {
          const rawHeaders = Object.keys(data[0]);
          headers = rawHeaders.filter(header => 
            header && 
            header.trim() !== '' && 
            header !== '__parsed_extra' // Papa Parse internal field
          );
          
          console.log('Filtered expense headers:', { raw: rawHeaders, filtered: headers });
          
          // Clean the data to only include valid columns
          data = data.map(row => {
            const cleanedRow: ExpenseCSVRow = {};
            headers.forEach(header => {
              if (row[header] !== undefined) {
                cleanedRow[header] = row[header];
              }
            });
            return cleanedRow;
          });
        }
        
        // Validate we have data
        if (data.length === 0) {
          errors.push('No expense data found in CSV file');
        }
        
        if (headers.length === 0) {
          errors.push('No valid columns found in CSV file');
        }
        
        // Add any Papa Parse errors
        if (results.errors && results.errors.length > 0) {
          errors.push(...results.errors.map(e => e.message));
        }
        
        console.log('Final expense parse results:', { dataLength: data.length, headers, errorCount: errors.length });
        
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

export const validateExpenseCSVData = (
  data: ExpenseCSVRow[], 
  mapping: ExpenseColumnMapping, 
  selectedProjectId?: string
): string[] => {
  const errors: string[] = [];
  
  if (!mapping.expense_date) {
    errors.push('Date column is required');
  }
  
  if (!mapping.description) {
    errors.push('Description column is required');
  }
  
  if (!mapping.amount) {
    errors.push('Amount column is required');
  }
  
  if (!selectedProjectId && !mapping.project_name) {
    errors.push('Project must be selected or project column must be mapped');
  }
  
  if (data.length === 0) {
    errors.push('No data rows found');
  }
  
  // Validate required fields in data
  if (mapping.expense_date) {
    const emptyDates = data.filter(row => !row[mapping.expense_date!]?.trim());
    if (emptyDates.length > 0) {
      errors.push(`${emptyDates.length} rows have empty dates`);
    }
  }
  
  if (mapping.description) {
    const emptyDescriptions = data.filter(row => !row[mapping.description!]?.trim());
    if (emptyDescriptions.length > 0) {
      errors.push(`${emptyDescriptions.length} rows have empty descriptions`);
    }
  }
  
  if (mapping.amount) {
    const invalidAmounts = data.filter(row => {
      const amount = row[mapping.amount!]?.trim();
      return !amount || isNaN(parseFloat(amount.replace(/[,$]/g, '')));
    });
    if (invalidAmounts.length > 0) {
      errors.push(`${invalidAmounts.length} rows have invalid amounts`);
    }
  }
  
  return errors;
};

export interface ExpenseImportData {
  project_id: string;
  description: string;
  category: ExpenseCategory;
  transaction_type: TransactionType;
  amount: number;
  expense_date: string;
  payee_id?: string;
  invoice_number?: string;
  is_planned: boolean;
}

export const mapCSVToExpenses = (
  data: ExpenseCSVRow[], 
  mapping: ExpenseColumnMapping,
  selectedProjectId: string,
  payeeMap: Map<string, string> = new Map() // Map payee names to IDs
): ExpenseImportData[] => {
  return data
    .filter(row => {
      // Basic validation - must have required fields
      return mapping.expense_date && row[mapping.expense_date]?.trim() &&
             mapping.description && row[mapping.description]?.trim() &&
             mapping.amount && row[mapping.amount]?.trim();
    })
    .map(row => {
      const expense: ExpenseImportData = {
        project_id: selectedProjectId,
        description: row[mapping.description!]?.trim() || '',
        category: 'other' as ExpenseCategory, // Default category
        transaction_type: 'expense' as TransactionType, // Default type
        amount: parseFloat(row[mapping.amount!]?.replace(/[,$]/g, '') || '0'),
        expense_date: formatDateForDB(row[mapping.expense_date!]?.trim() || ''),
        is_planned: false
      };
      
      // Map category if provided
      if (mapping.category && row[mapping.category]?.trim()) {
        const categoryValue = row[mapping.category].trim().toLowerCase();
        const mappedCategory = mapCategoryValue(categoryValue);
        if (mappedCategory) {
          expense.category = mappedCategory;
        }
      }
      
      // Map transaction type if provided
      if (mapping.transaction_type && row[mapping.transaction_type]?.trim()) {
        const typeValue = row[mapping.transaction_type].trim().toLowerCase();
        const mappedType = mapTransactionTypeValue(typeValue);
        if (mappedType) {
          expense.transaction_type = mappedType;
        }
      }
      
      // Map payee if provided
      if (mapping.payee_name && row[mapping.payee_name]?.trim()) {
        const payeeName = row[mapping.payee_name].trim();
        const payeeId = payeeMap.get(payeeName);
        if (payeeId) {
          expense.payee_id = payeeId;
        }
      }
      
      // Map invoice number if provided
      if (mapping.invoice_number && row[mapping.invoice_number]?.trim()) {
        expense.invoice_number = row[mapping.invoice_number].trim();
      }
      
      return expense;
    });
};

// Helper function to format date for database
const formatDateForDB = (dateString: string): string => {
  if (!dateString) return new Date().toISOString();
  
  // Try to parse various date formats
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    // If parsing fails, return current date
    return new Date().toISOString();
  }
  
  return date.toISOString();
};

// Helper function to map category values
const mapCategoryValue = (value: string): ExpenseCategory | null => {
  const lowercaseValue = value.toLowerCase();
  
  if (lowercaseValue.includes('labor') || lowercaseValue.includes('internal')) {
    return 'labor_internal' as ExpenseCategory;
  }
  if (lowercaseValue.includes('sub') || lowercaseValue.includes('contractor')) {
    return 'subcontractors' as ExpenseCategory;
  }
  if (lowercaseValue.includes('material') || lowercaseValue.includes('supply')) {
    return 'materials' as ExpenseCategory;
  }
  if (lowercaseValue.includes('equipment') || lowercaseValue.includes('rental')) {
    return 'equipment' as ExpenseCategory;
  }
  if (lowercaseValue.includes('permit') || lowercaseValue.includes('fee')) {
    return 'permits' as ExpenseCategory;
  }
  if (lowercaseValue.includes('management') || lowercaseValue.includes('admin')) {
    return 'management' as ExpenseCategory;
  }
  
  return null; // Will use default OTHER
};

// Helper function to map transaction type values
const mapTransactionTypeValue = (value: string): TransactionType | null => {
  const lowercaseValue = value.toLowerCase();
  
  if (lowercaseValue.includes('bill')) {
    return 'bill' as TransactionType;
  }
  if (lowercaseValue.includes('check')) {
    return 'check' as TransactionType;
  }
  if (lowercaseValue.includes('credit') || lowercaseValue.includes('card')) {
    return 'credit_card' as TransactionType;
  }
  if (lowercaseValue.includes('cash')) {
    return 'cash' as TransactionType;
  }
  if (lowercaseValue.includes('expense')) {
    return 'expense' as TransactionType;
  }
  
  return null; // Will use default EXPENSE
};