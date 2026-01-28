import Papa from 'papaparse';

export interface PayeeCSVRow {
  [key: string]: string;
}

export interface PayeeColumnMapping {
  payee_name?: string;
  email?: string;
  phone_numbers?: string;
  billing_address?: string;
  full_name?: string;
  contact_name?: string;
  contact_title?: string;
  legal_form?: string;
  state_of_formation?: string;
  notes?: string;
  account_number?: string;
  terms?: string;
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
  full_name?: string;
  contact_name?: string;
  contact_title?: string;
  legal_form?: string;
  state_of_formation?: string;
  notes?: string;
  account_number?: string;
  terms?: string;
}

/** Normalize payee name for in-file dedupe (trim, lowercase, collapse spaces). Consistent with exact-match behavior in fuzzyPayeeMatcher. */
export function normalizePayeeNameForDedupe(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface DedupePayeesResult {
  unique: PayeeImportData[];
  mergedCount: number;
  mergedRows: { canonicalIndex: number; mergedNames: string[] }[];
}

/**
 * Dedupe payees within the CSV by normalized name. Keeps one canonical row per name (first occurrence), optionally merging non-empty email/phone/address from others.
 */
export function dedupePayeesInFile(payees: PayeeImportData[]): DedupePayeesResult {
  const mergedRows: { canonicalIndex: number; mergedNames: string[] }[] = [];
  const byKey = new Map<string, { canonical: PayeeImportData; names: string[]; index: number }>();
  let mergedCount = 0;

  payees.forEach((p) => {
    const key = normalizePayeeNameForDedupe(p.payee_name);
    if (!key) return;

    const existing = byKey.get(key);
    if (existing) {
      mergedCount++;
      existing.names.push(p.payee_name);
      // Merge non-empty fields into canonical
      if (p.email?.trim() && !existing.canonical.email) existing.canonical.email = p.email.trim();
      if (p.phone_numbers?.trim() && !existing.canonical.phone_numbers) existing.canonical.phone_numbers = p.phone_numbers.trim();
      if (p.billing_address?.trim() && !existing.canonical.billing_address) existing.canonical.billing_address = p.billing_address.trim();
      if (p.full_name?.trim() && !existing.canonical.full_name) existing.canonical.full_name = p.full_name.trim();
      if (p.contact_name?.trim() && !existing.canonical.contact_name) existing.canonical.contact_name = p.contact_name.trim();
      if (p.contact_title?.trim() && !existing.canonical.contact_title) existing.canonical.contact_title = p.contact_title.trim();
      if (p.legal_form?.trim() && !existing.canonical.legal_form) existing.canonical.legal_form = p.legal_form.trim();
      if (p.state_of_formation?.trim() && !existing.canonical.state_of_formation) existing.canonical.state_of_formation = p.state_of_formation.trim();
      if (p.notes?.trim() && !existing.canonical.notes) existing.canonical.notes = p.notes.trim();
      if (p.account_number?.trim() && !existing.canonical.account_number) existing.canonical.account_number = p.account_number.trim();
      if (p.terms?.trim() && !existing.canonical.terms) existing.canonical.terms = p.terms.trim();
    } else {
      const index = byKey.size;
      byKey.set(key, { canonical: { ...p }, names: [p.payee_name], index });
    }
  });

  const unique = Array.from(byKey.values())
    .sort((a, b) => a.index - b.index)
    .map((v) => v.canonical);

  byKey.forEach((v) => {
    if (v.names.length > 1) {
      mergedRows.push({ canonicalIndex: v.index, mergedNames: v.names });
    }
  });

  return { unique, mergedCount, mergedRows };
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
      if (mapping.full_name && row[mapping.full_name]?.trim()) payee.full_name = row[mapping.full_name].trim();
      if (mapping.contact_name && row[mapping.contact_name]?.trim()) payee.contact_name = row[mapping.contact_name].trim();
      if (mapping.contact_title && row[mapping.contact_title]?.trim()) payee.contact_title = row[mapping.contact_title].trim();
      if (mapping.legal_form && row[mapping.legal_form]?.trim()) payee.legal_form = row[mapping.legal_form].trim();
      if (mapping.state_of_formation && row[mapping.state_of_formation]?.trim()) payee.state_of_formation = row[mapping.state_of_formation].trim();
      if (mapping.notes && row[mapping.notes]?.trim()) payee.notes = row[mapping.notes].trim();
      if (mapping.account_number && row[mapping.account_number]?.trim()) payee.account_number = row[mapping.account_number].trim();
      if (mapping.terms && row[mapping.terms]?.trim()) payee.terms = row[mapping.terms].trim();
      return payee;
    });
};