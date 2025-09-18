import Papa from 'papaparse';

export interface PayeeCSVRow {
  [key: string]: string;
}

export interface PayeeColumnMapping {
  payee_name?: string;
  email?: string;
  phone_numbers?: string;
  billing_address?: string;
}

export interface ParsedPayeeCSV {
  data: PayeeCSVRow[];
  headers: string[];
  errors: string[];
}

export const parsePayeeCSVFile = (file: File): Promise<ParsedPayeeCSV> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        let data = results.data as PayeeCSVRow[];
        let errors: string[] = [];
        
        // Handle QuickBooks format - skip first 3 rows if they contain header info
        if (data.length > 3) {
          const firstRow = data[0];
          const firstRowValues = Object.values(firstRow);
          
          // Check if first few rows contain QuickBooks metadata
          if (firstRowValues.some(val => val?.toLowerCase().includes('quickbooks') || 
                                      val?.toLowerCase().includes('vendor') ||
                                      val?.toLowerCase().includes('report'))) {
            data = data.slice(3); // Skip header rows
          }
        }
        
        // Validate we have data
        if (data.length === 0) {
          errors.push('No payee data found in CSV file');
        }
        
        // Get headers from the first data row
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        
        if (headers.length === 0) {
          errors.push('No columns found in CSV file');
        }
        
        // Add any Papa Parse errors
        if (results.errors && results.errors.length > 0) {
          errors.push(...results.errors.map(e => e.message));
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

export const validatePayeeCSVData = (data: PayeeCSVRow[], mapping: PayeeColumnMapping): string[] => {
  const errors: string[] = [];
  
  if (!mapping.payee_name) {
    errors.push('Payee name column is required');
  }
  
  if (data.length === 0) {
    errors.push('No data rows found');
  }
  
  // Validate required fields in data
  if (mapping.payee_name) {
    const emptyNames = data.filter(row => !row[mapping.payee_name!]?.trim());
    if (emptyNames.length > 0) {
      errors.push(`${emptyNames.length} rows have empty payee names`);
    }
  }
  
  return errors;
};

export interface PayeeImportData {
  payee_name: string;
  email?: string;
  phone_numbers?: string;
  billing_address?: string;
}

export const mapCSVToPayees = (
  data: PayeeCSVRow[], 
  mapping: PayeeColumnMapping,
  fileName: string
): PayeeImportData[] => {
  return data
    .filter(row => mapping.payee_name && row[mapping.payee_name]?.trim()) // Only include rows with payee names
    .map(row => {
      const payee: PayeeImportData = {
        payee_name: row[mapping.payee_name!]?.trim() || '',
      };
      
      if (mapping.email && row[mapping.email]?.trim()) {
        payee.email = row[mapping.email].trim();
      }
      
      if (mapping.phone_numbers && row[mapping.phone_numbers]?.trim()) {
        payee.phone_numbers = row[mapping.phone_numbers].trim();
      }
      
      if (mapping.billing_address && row[mapping.billing_address]?.trim()) {
        payee.billing_address = row[mapping.billing_address].trim();
      }
      
      return payee;
    });
};