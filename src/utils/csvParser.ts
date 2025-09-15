import Papa from 'papaparse';
import { CSVRow, ColumnMapping, Expense, ExpenseCategory } from '@/types/expense';

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

    // Parse amount - remove currency symbols and commas
    const cleanAmount = amountStr.replace(/[$,]/g, '');
    const amount = Math.abs(parseFloat(cleanAmount) || 0);

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
    
    if (mapping.amount && row[mapping.amount] && isNaN(parseFloat(row[mapping.amount].replace(/[$,]/g, '')))) {
      errors.push(`Row ${index + 1}: Invalid amount format`);
    }
  });

  return errors;
};