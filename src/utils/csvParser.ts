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
    const dateStr = mapping.date ? row[mapping.date] : '';
    const amountStr = mapping.amount ? row[mapping.amount] : '0';
    
    // Parse date
    let date = new Date();
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
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
      projectId,
      description,
      category,
      type: 'Unplanned' as const, // Default to unplanned, user can change later
      amount,
      date,
      vendor: mapping.vendor ? row[mapping.vendor] : undefined,
      createdAt: new Date(),
      source: 'csv_import' as const,
      csvData: {
        originalRow: row,
        importedAt: new Date(),
        fileName
      }
    };
  });
};

const categorizeExpense = (description: string): ExpenseCategory => {
  const desc = description.toLowerCase();
  
  if (desc.includes('labor') || desc.includes('wage') || desc.includes('payroll')) {
    return 'Labor';
  }
  if (desc.includes('material') || desc.includes('supply') || desc.includes('lumber') || desc.includes('concrete')) {
    return 'Materials';
  }
  if (desc.includes('equipment') || desc.includes('rental') || desc.includes('tool') || desc.includes('machinery')) {
    return 'Equipment';
  }
  
  return 'Other';
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