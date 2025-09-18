import Papa from 'papaparse';
import { ClientType } from '@/types/client';

export interface ClientCSVRow {
  [key: string]: string;
}

export interface ClientColumnMapping {
  client_name?: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  mailing_address?: string;
  quickbooks_customer_id?: string;
  payment_terms?: string;
}

export interface ParsedClientCSV {
  data: ClientCSVRow[];
  headers: string[];
  errors: string[];
}

export const parseClientCSVFile = (file: File): Promise<ParsedClientCSV> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        let data = results.data as ClientCSVRow[];
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
              val?.toLowerCase().includes('customer contact list') ||
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
            const cleanedRow: ClientCSVRow = {};
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
          errors.push('No client data found in CSV file');
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

export const validateClientCSVData = (data: ClientCSVRow[], mapping: ClientColumnMapping): string[] => {
  const errors: string[] = [];
  
  if (!mapping.client_name) {
    errors.push('Client name column is required');
  }
  
  if (data.length === 0) {
    errors.push('No data rows found');
  }
  
  // Validate required fields in data
  if (mapping.client_name) {
    const emptyNames = data.filter(row => !row[mapping.client_name!]?.trim());
    if (emptyNames.length > 0) {
      errors.push(`${emptyNames.length} rows have empty client names`);
    }
  }
  
  return errors;
};

export interface ClientImportData {
  client_name: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  mailing_address?: string;
  client_type: ClientType;
  payment_terms?: string;
  quickbooks_customer_id?: string;
}

// Intelligent client type detection based on name patterns
export const detectClientType = (clientName: string, contactPerson?: string): ClientType => {
  const name = clientName.toLowerCase();
  
  // Government indicators
  if (name.includes('city of') || 
      name.includes('county') || 
      name.includes('state of') ||
      name.includes('department') ||
      name.includes('govt') ||
      name.includes('government') ||
      name.includes('municipal') ||
      name.includes('township') ||
      name.includes('borough')) {
    return 'government';
  }
  
  // Non-profit indicators
  if (name.includes('foundation') ||
      name.includes('charity') ||
      name.includes('non-profit') ||
      name.includes('nonprofit') ||
      name.includes('church') ||
      name.includes('synagogue') ||
      name.includes('mosque') ||
      name.includes('temple') ||
      name.includes('community center')) {
    return 'nonprofit';
  }
  
  // Commercial indicators
  if (name.includes('llc') ||
      name.includes('inc') ||
      name.includes('corp') ||
      name.includes('company') ||
      name.includes('co.') ||
      name.includes('supply') ||
      name.includes('systems') ||
      name.includes('services') ||
      name.includes('solutions') ||
      name.includes('group') ||
      name.includes('enterprises') ||
      name.includes('construction') ||
      name.includes('builders') ||
      name.includes('contractors')) {
    return 'commercial';
  }
  
  // If we have a contact person that's different from the client name, 
  // it's likely commercial (person representing a business)
  if (contactPerson && contactPerson !== clientName) {
    return 'commercial';
  }
  
  // Default to residential for individual names
  return 'residential';
};

export const mapCSVToClients = (
  data: ClientCSVRow[], 
  mapping: ClientColumnMapping,
  fileName: string
): ClientImportData[] => {
  return data
    .filter(row => mapping.client_name && row[mapping.client_name]?.trim()) // Only include rows with client names
    .map(row => {
      const clientName = row[mapping.client_name!]?.trim() || '';
      const contactPerson = mapping.contact_person && row[mapping.contact_person]?.trim() ? row[mapping.contact_person].trim() : undefined;
      
      const client: ClientImportData = {
        client_name: clientName,
        client_type: detectClientType(clientName, contactPerson),
        payment_terms: 'Net 30' // Default payment terms
      };
      
      if (mapping.company_name && row[mapping.company_name]?.trim()) {
        client.company_name = row[mapping.company_name].trim();
      }
      
      if (contactPerson) {
        client.contact_person = contactPerson;
      }
      
      if (mapping.email && row[mapping.email]?.trim()) {
        client.email = row[mapping.email].trim();
      }
      
      if (mapping.phone && row[mapping.phone]?.trim()) {
        client.phone = row[mapping.phone].trim();
      }
      
      if (mapping.billing_address && row[mapping.billing_address]?.trim()) {
        client.billing_address = row[mapping.billing_address].trim();
      }
      
      if (mapping.mailing_address && row[mapping.mailing_address]?.trim()) {
        client.mailing_address = row[mapping.mailing_address].trim();
      }
      
      if (mapping.quickbooks_customer_id && row[mapping.quickbooks_customer_id]?.trim()) {
        client.quickbooks_customer_id = row[mapping.quickbooks_customer_id].trim();
      }
      
      if (mapping.payment_terms && row[mapping.payment_terms]?.trim()) {
        client.payment_terms = row[mapping.payment_terms].trim();
      }
      
      return client;
    });
};

// Auto-detect common QuickBooks column mappings
export const getQuickBooksColumnMapping = (headers: string[]): ClientColumnMapping => {
  const mapping: ClientColumnMapping = {};
  
  // Common QuickBooks client/customer field mappings
  const fieldMappings = {
    client_name: ['vendor', 'customer', 'name', 'client name', 'company name'],
    contact_person: ['full name', 'contact', 'contact person', 'contact name'],
    email: ['email', 'email address', 'e-mail'],
    phone: ['phone', 'phone number', 'phone numbers', 'telephone', 'tel'],
    billing_address: ['billing address', 'address', 'billing addr', 'addr'],
    mailing_address: ['mailing address', 'mail address', 'shipping address'],
    quickbooks_customer_id: ['account #', 'account number', 'id', 'customer id', 'vendor id'],
    payment_terms: ['terms', 'payment terms', 'terms of payment']
  };
  
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase().trim();
    
    Object.entries(fieldMappings).forEach(([fieldName, variations]) => {
      if (variations.some(variation => lowerHeader === variation)) {
        mapping[fieldName as keyof ClientColumnMapping] = header;
      }
    });
  });
  
  console.log('Auto-detected column mapping:', mapping);
  return mapping;
};