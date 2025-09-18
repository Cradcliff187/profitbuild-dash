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
        
        console.log('Raw CSV parse results:', { dataLength: data.length, firstRow: data[0] });
        
        // Handle QuickBooks format - improved detection
        if (data.length > 0) {
          let skipRows = 0;
          
          // Check first few rows for QuickBooks metadata
          for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            const rowValues = Object.values(row);
            const hasQuickBooksMetadata = rowValues.some(val => 
              val?.toLowerCase().includes('quickbooks') || 
              val?.toLowerCase().includes('vendor contact list') ||
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
          
          console.log('Filtered headers:', { raw: rawHeaders, filtered: headers });
          
          // Clean the data to only include valid columns
          data = data.map(row => {
            const cleanedRow: PayeeCSVRow = {};
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
          errors.push('No payee data found in CSV file');
        }
        
        if (headers.length === 0) {
          errors.push('No valid columns found in CSV file');
        }
        
        // Add any Papa Parse errors
        if (results.errors && results.errors.length > 0) {
          errors.push(...results.errors.map(e => e.message));
        }
        
        console.log('Final parse results:', { dataLength: data.length, headers, errorCount: errors.length });
        
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