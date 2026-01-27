import Papa from 'papaparse';
import { ExpenseCategory, TransactionType } from '@/types/expense';
import { supabase } from '@/integrations/supabase/client';
import { fuzzyMatchPayee, PartialPayee, FuzzyMatchResult } from '@/utils/fuzzyPayeeMatcher';
import { PayeeType } from '@/types/payee';
import { resolveQBAccountCategory } from '@/utils/quickbooksMapping';
import { parseCsvDateForDB, parseDateOnly, formatDateForDB } from './dateUtils';

// Type for QB account mapping (matches database schema)
type QuickBooksAccountMapping = { qb_account_name: string; qb_account_full_path: string; app_category: string };

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

export interface PayeeMatchInfo {
  qbName: string;
  matchedPayee: PartialPayee;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'auto';
}

export interface TransactionImportResult {
  expenses: ExpenseImportData[];
  revenues: RevenueImportData[];
  unassociated_expenses: number;
  unassociated_revenues: number;
  category_mappings_used: Record<string, string>;
  errors: string[];
  databaseDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingExpenseId: string;
    matchKey: string;
  }>;
  databaseDuplicatesSkipped: number;
  inFileDuplicates: Array<{
    transaction: TransactionCSVRow;
    reason: string;
  }>;
  inFileDuplicatesSkipped: number;
  revenueDatabaseDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingRevenueId: string;
    matchKey: string;
  }>;
  revenueDatabaseDuplicatesSkipped: number;
  revenueInFileDuplicates: Array<{
    transaction: TransactionCSVRow;
    reason: string;
  }>;
  revenueInFileDuplicatesSkipped: number;
  fuzzyMatches: PayeeMatchInfo[];
  lowConfidenceMatches: Array<{
    qbName: string;
    suggestions: Array<{
      payee: PartialPayee;
      confidence: number;
    }>;
  }>;
  autoCreatedPayees: Array<{
    qbName: string;
    payeeId: string;
    payeeType: PayeeType;
  }>;
  autoCreatedCount: number;
  mappingStats: {
    databaseMapped: number;
    staticMapped: number;
    descriptionMapped: number;
    unmapped: number;
  };
  unmappedAccounts: string[];
  reconciliation?: {
    totalExistingNonLaborExpenses: number;  // Sum of matching expenses in DB (non-LABOR)
    totalDuplicateAmount: number;           // Sum of amounts from all duplicate transactions
    difference: number;                     // Difference between the two totals
    isAligned: boolean;                     // True if difference is within threshold
    threshold: number;                      // Tolerance threshold (default $0.01)
  };
  revenueReconciliation?: {
    totalExistingRevenues: number;
    totalDuplicateAmount: number;
    difference: number;
    isAligned: boolean;
    threshold: number;
  };
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
  // === Phase 1: Detect in-file duplicates for both expenses and revenues ===
  const { unique: uniqueExpenseTransactions, duplicates: inFileDuplicates } = detectInFileDuplicates(data);
  const { unique: uniqueRevenueTransactions, duplicates: revenueInFileDuplicates } = detectRevenueInFileDuplicates(data);
  
  const expenses: ExpenseImportData[] = [];
  const revenues: RevenueImportData[] = [];
  const errors: string[] = [];
  const categoryMappingsUsed: Record<string, string> = {};
  const databaseDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingExpenseId: string;
    matchKey: string;
  }> = [];
  const revenueDatabaseDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingRevenueId: string;
    matchKey: string;
  }> = [];
  const fuzzyMatches: PayeeMatchInfo[] = [];
  const lowConfidenceMatches: Array<{
    qbName: string;
    suggestions: Array<{
      payee: PartialPayee;
      confidence: number;
    }>;
  }> = [];
  const autoCreatedPayees: Array<{
    qbName: string;
    payeeId: string;
    payeeType: PayeeType;
  }> = [];
  const unmappedAccounts: string[] = [];
  
  let mappingStats = {
    databaseMapped: 0,
    staticMapped: 0,
    descriptionMapped: 0,
    unmapped: 0
  };

  // Define the unassigned project ID constant
  const UNASSIGNED_PROJECT_ID = '00000000-0000-0000-0000-000000000002';
  const UNASSIGNED_CLIENT_ID = '00000000-0000-0000-0000-000000000001';

  // === Calculate date range and fetch existing expenses + revenues for duplicate detection ===
  const dates = data
    .map(row => row['Date'])
    .filter(d => d && d.trim() !== '')
    .map(d => {
      const date = new Date(d);
      return isNaN(date.getTime()) ? null : date;
    })
    .filter((d): d is Date => d !== null);
  
  let existingExpenses = new Map<string, { id: string; description: string }>();
  let existingRevenues = new Map<string, { id: string; description: string }>();
  
  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add buffer days to catch edge cases
    minDate.setDate(minDate.getDate() - 1);
    maxDate.setDate(maxDate.getDate() + 1);
    
    [existingExpenses, existingRevenues] = await Promise.all([
      fetchExistingExpenses(
        minDate.toISOString().split('T')[0],
        maxDate.toISOString().split('T')[0]
      ),
      fetchExistingRevenues(
        minDate.toISOString().split('T')[0],
        maxDate.toISOString().split('T')[0]
      )
    ]);
  }
  // === END duplicate detection setup ===

  // Load clients, payees, projects, and account mappings for matching
  const [clientsResponse, payeesResponse, projectsResponse, mappingsResponse] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('payees').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('quickbooks_account_mappings').select('*').eq('is_active', true)
  ]);

  const clients = clientsResponse.data || [];
  const payees = payeesResponse.data || [];
  const projects = projectsResponse.data || [];
  const dbMappings = mappingsResponse.data || [];

  // Create lookup maps
  const clientMap = new Map<string, string>();
  const projectMap = new Map<string, string>();

  clients.forEach(client => {
    const normalizedName = normalizeString(client.client_name);
    clientMap.set(normalizedName, client.id);
    if (client.company_name) {
      clientMap.set(normalizeString(client.company_name), client.id);
    }
  });

  projects.forEach(project => {
    const normalizedNumber = normalizeString(project.project_number);
    projectMap.set(normalizedNumber, project.id);
    if (project.project_name) {
      projectMap.set(normalizeString(project.project_name), project.id);
    }
  });

  // Convert payees to PartialPayee format for fuzzy matching
  const partialPayees: PartialPayee[] = payees.map(p => ({
    id: p.id,
    payee_name: p.payee_name,
    full_name: p.full_name
  }));

  let unassociated_expenses = 0;
  let unassociated_revenues = 0;

  // Process unique expense transactions
  for (const row of uniqueExpenseTransactions) {
    try {
      const transactionType = row['Transaction type']?.toLowerCase();
      
      // Skip invoices (revenues) - they're processed separately
      if (transactionType === 'invoice') continue;
      
      const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
      const date = parseCsvDateForDB(row['Date'], true) || '';
      const name = row['Name']?.trim() || '';
      const projectWO = row['Project/WO #']?.trim() || '';
      const accountFullName = row['Account full name']?.trim() || '';
      const accountName = row['Account name']?.trim() || '';

      // Find project if specified
      let project_id: string = UNASSIGNED_PROJECT_ID;
      let isUnassigned = true;
      
      if (projectWO) {
        // Special project mappings: Fuel/fuel (or variations like "Fuel - Mike") → 001-GAS, GA → 002-GA
        let mappedProjectWO = projectWO;
        const normalizedProjectWO = normalizeString(projectWO);
        
        // Check if normalized starts with "fuel" (handles "Fuel", "fuel", "Fuel - Mike", etc.)
        if (normalizedProjectWO.startsWith('fuel')) {
          mappedProjectWO = '001-GAS';
        } else if (normalizedProjectWO === 'ga') {
          // Exact match for "GA" (case-insensitive)
          mappedProjectWO = '002-GA';
        }
        
        // Look up the project (either mapped or original)
        const foundProjectId = projectMap.get(normalizeString(mappedProjectWO));
        if (foundProjectId) {
          project_id = foundProjectId;
          isUnassigned = false;
        }
      }

      // === Fuzzy payee matching ===
      let payee_id: string | undefined;
      if (name) {
        const matchResult = fuzzyMatchPayee(name, partialPayees);
        
        if (matchResult.bestMatch) {
          payee_id = matchResult.bestMatch.payee.id;
          
          fuzzyMatches.push({
            qbName: name,
            matchedPayee: matchResult.bestMatch.payee,
            confidence: matchResult.bestMatch.confidence,
            matchType: matchResult.bestMatch.confidence >= 75 ? 'auto' : 
                      matchResult.bestMatch.matchType === 'exact' ? 'exact' : 'fuzzy'
          });
        } else if (matchResult.matches.length > 0) {
          const suggestions = matchResult.matches
            .filter(match => match.confidence >= 40)
            .slice(0, 3)
            .map(match => ({
              payee: match.payee,
              confidence: match.confidence
            }));
          
          if (suggestions.length > 0) {
            lowConfidenceMatches.push({
              qbName: name,
              suggestions
            });
          }
        } else {
          const createdPayeeId = await createPayeeFromTransaction(name, accountFullName);
          if (createdPayeeId) {
            payee_id = createdPayeeId;
            const payeeType = detectPayeeTypeFromAccount(accountFullName);
            autoCreatedPayees.push({
              qbName: name,
              payeeId: createdPayeeId,
              payeeType
            });
            partialPayees.push({
              id: createdPayeeId,
              payee_name: name,
              full_name: name
            });
          }
        }
      }

      const category = categorizeExpense(name, accountFullName, dbMappings);

      // Track mapping statistics
      if (accountFullName && dbMappings.some(m => 
        m.qb_account_full_path.toLowerCase() === accountFullName.toLowerCase()
      )) {
        mappingStats.databaseMapped++;
      } else if (accountFullName && mapAccountToCategory(accountFullName) !== null) {
        mappingStats.staticMapped++;
      } else if (accountFullName && resolveQBAccountCategory(accountFullName) !== ExpenseCategory.OTHER) {
        mappingStats.staticMapped++;
      } else if (category !== ExpenseCategory.OTHER) {
        mappingStats.descriptionMapped++;
      } else {
        mappingStats.unmapped++;
        if (accountFullName && !unmappedAccounts.includes(accountFullName)) {
          unmappedAccounts.push(accountFullName);
        }
      }

      if (category) {
        categoryMappingsUsed[accountFullName] = category;
      }
      
      const txType = mapTransactionType(transactionType);

      // === DATABASE DUPLICATE CHECK - ENHANCED MULTI-KEY MATCHING ===
      // Try multiple matching strategies to handle empty names and mismatches
      let existingExpense: { id: string; description: string } | undefined;
      let matchKey = '';
      
      // Strategy 1: Primary key with CSV Name (exact match)
      const primaryKey = createExpenseKey(date, amount, name);
      existingExpense = existingExpenses.get(primaryKey);
      if (existingExpense) {
        matchKey = primaryKey;
      }
      
      // Strategy 2: If CSV Name is empty, try empty name key
      // This handles cases where CSV has empty Name but DB expense has empty description (even with payee_name)
      if (!existingExpense && !name) {
        const emptyKey = createExpenseKey(date, amount, '');
        existingExpense = existingExpenses.get(emptyKey);
        if (existingExpense) {
          matchKey = emptyKey;
        }
      }
      
      // Strategy 3: If CSV Name is empty and we have a payee_id from fuzzy matching, try payee_name key
      // This handles cases where CSV Name is empty but we matched a payee, and DB expense has that payee_name
      if (!existingExpense && !name && payee_id) {
        const matchedPayee = partialPayees.find(p => p.id === payee_id);
        if (matchedPayee) {
          const payeeKey = createExpenseKey(date, amount, matchedPayee.payee_name);
          existingExpense = existingExpenses.get(payeeKey);
          if (existingExpense) {
            matchKey = payeeKey;
          }
        }
      }
      
      // Strategy 4: If CSV has a name but no match, try matching against payee_name keys
      // This handles cases where CSV Name doesn't match extracted name but matches a payee_name
      if (!existingExpense && name) {
        // Try all payee_name keys for this date+amount by checking if name matches any payee
        // We can't easily iterate the map, but we can try the payee we matched if we have one
        if (payee_id) {
          const matchedPayee = partialPayees.find(p => p.id === payee_id);
          if (matchedPayee && matchedPayee.payee_name.toLowerCase().trim() === name.toLowerCase().trim()) {
            const payeeKey = createExpenseKey(date, amount, matchedPayee.payee_name);
            existingExpense = existingExpenses.get(payeeKey);
            if (existingExpense) {
              matchKey = payeeKey;
            }
          }
        }
      }
      
      if (existingExpense) {
        databaseDuplicates.push({
          transaction: row,
          existingExpenseId: existingExpense.id,
          matchKey: matchKey || primaryKey
        });
        continue; // Skip - already exists
      }
      // === END DUPLICATE CHECK ===

      const expense: ExpenseImportData = {
        project_id,
        description: `${transactionType} - ${name}${isUnassigned ? ' (Unassigned)' : ''}`,
        category: category || ExpenseCategory.MANAGEMENT,
        transaction_type: txType,
        amount: Math.abs(amount),
        expense_date: date,
        payee_id,
        account_name: accountName,
        account_full_name: accountFullName,
      };

      expenses.push(expense);

      if (isUnassigned) {
        unassociated_expenses++;
      }
    } catch (error) {
      errors.push(`Error processing expense row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process unique revenue transactions
  for (const row of uniqueRevenueTransactions) {
    try {
      const transactionType = row['Transaction type']?.toLowerCase();
      
      // Only process invoices (revenues)
      if (transactionType !== 'invoice') continue;
      
      const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
      const date = parseCsvDateForDB(row['Date'], true) || '';
      const name = row['Name']?.trim() || '';
      const projectWO = row['Project/WO #']?.trim() || '';
      const accountFullName = row['Account full name']?.trim() || '';
      const accountName = row['Account name']?.trim() || '';
      const invoiceNumber = row['Invoice #']?.trim() || '';

      // Find project if specified
      let project_id: string = UNASSIGNED_PROJECT_ID;
      let isUnassigned = true;
      
      if (projectWO) {
        // Special project mappings: Fuel/fuel (or variations like "Fuel - Mike") → 001-GAS, GA → 002-GA
        let mappedProjectWO = projectWO;
        const normalizedProjectWO = normalizeString(projectWO);
        
        // Check if normalized starts with "fuel" (handles "Fuel", "fuel", "Fuel - Mike", etc.)
        if (normalizedProjectWO.startsWith('fuel')) {
          mappedProjectWO = '001-GAS';
        } else if (normalizedProjectWO === 'ga') {
          // Exact match for "GA" (case-insensitive)
          mappedProjectWO = '002-GA';
        }
        
        // Look up the project (either mapped or original)
        const foundProjectId = projectMap.get(normalizeString(mappedProjectWO));
        if (foundProjectId) {
          project_id = foundProjectId;
          isUnassigned = false;
        }
      }

      const client_id = clientMap.get(normalizeString(name)) || (isUnassigned ? UNASSIGNED_CLIENT_ID : undefined);
      const description = `Invoice from ${name}${isUnassigned ? ' (Unassigned)' : ''}`;

      // === Check for database duplicate ===
      const revenueKey = createRevenueKey(amount, date, invoiceNumber, name);
      const existingRevenue = existingRevenues.get(revenueKey);
      
      if (existingRevenue) {
        revenueDatabaseDuplicates.push({
          transaction: row,
          existingRevenueId: existingRevenue.id,
          matchKey: revenueKey
        });
        continue;
      }
      // === END database duplicate check ===
      
      const revenue: RevenueImportData = {
        project_id,
        client_id,
        amount: Math.abs(amount),
        invoice_date: date,
        description,
        invoice_number: invoiceNumber || undefined,
        account_name: accountName,
        account_full_name: accountFullName,
      };

      revenues.push(revenue);
      
      if (isUnassigned) {
        unassociated_revenues++;
      }
    } catch (error) {
      errors.push(`Error processing revenue row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // === Calculate reconciliation ===
  let reconciliation;
  if (dates.length > 0 && (databaseDuplicates.length > 0 || inFileDuplicates.length > 0)) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    minDate.setDate(minDate.getDate() - 1);
    maxDate.setDate(maxDate.getDate() + 1);
    
    const allDuplicates = [
      ...inFileDuplicates.map(d => ({ transaction: d.transaction, reason: d.reason })),
      ...databaseDuplicates.map(d => ({ 
        transaction: d.transaction, 
        existingExpenseId: d.existingExpenseId, 
        matchKey: d.matchKey 
      }))
    ];
    
    reconciliation = await calculateReconciliation(
      minDate.toISOString().split('T')[0],
      maxDate.toISOString().split('T')[0],
      allDuplicates
    );
  }

  // === Calculate REVENUE reconciliation ===
  let revenueReconciliation;
  if (dates.length > 0 && (revenueDatabaseDuplicates.length > 0 || revenueInFileDuplicates.length > 0)) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    minDate.setDate(minDate.getDate() - 1);
    maxDate.setDate(maxDate.getDate() + 1);
    
    const allRevenueDuplicates = [
      ...revenueInFileDuplicates.map(d => ({ transaction: d.transaction, reason: d.reason })),
      ...revenueDatabaseDuplicates.map(d => ({ 
        transaction: d.transaction, 
        existingRevenueId: d.existingRevenueId, 
        matchKey: d.matchKey 
      }))
    ];
    
    revenueReconciliation = await calculateRevenueReconciliation(
      minDate.toISOString().split('T')[0],
      maxDate.toISOString().split('T')[0],
      allRevenueDuplicates
    );
  }

  return {
    expenses,
    revenues,
    unassociated_expenses,
    unassociated_revenues,
    category_mappings_used: categoryMappingsUsed,
    errors,
    databaseDuplicates,
    databaseDuplicatesSkipped: databaseDuplicates.length,
    inFileDuplicates,
    inFileDuplicatesSkipped: inFileDuplicates.length,
    revenueDatabaseDuplicates,
    revenueDatabaseDuplicatesSkipped: revenueDatabaseDuplicates.length,
    revenueInFileDuplicates,
    revenueInFileDuplicatesSkipped: revenueInFileDuplicates.length,
    fuzzyMatches,
    lowConfidenceMatches,
    autoCreatedPayees,
    autoCreatedCount: autoCreatedPayees.length,
    mappingStats,
    unmappedAccounts,
    reconciliation,
    revenueReconciliation
  };
};

const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
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

/**
 * Detects expense duplicates within the CSV file itself
 */
const detectInFileDuplicates = (
  data: TransactionCSVRow[]
): { unique: TransactionCSVRow[]; duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> } => {
  const seen = new Map<string, TransactionCSVRow>();
  const duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
  const unique: TransactionCSVRow[] = [];

  for (const row of data) {
    // Only check expenses for duplicates (not invoices/revenues)
    if (row['Transaction type']?.toLowerCase() === 'invoice') {
      unique.push(row);
      continue;
    }

    const date = parseCsvDateForDB(row['Date'], true) || '';
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const name = row['Name']?.trim() || '';

    // Use the same key function for consistency
    const key = createExpenseKey(date, amount, name);

    if (seen.has(key)) {
      const firstOccurrence = seen.get(key)!;
      duplicates.push({
        transaction: row,
        reason: `Duplicate of: ${firstOccurrence['Name']} on ${firstOccurrence['Date']} for ${firstOccurrence['Amount']}`
      });
    } else {
      seen.set(key, row);
      unique.push(row);
    }
  }

  return { unique, duplicates };
};

/**
 * Detects revenue duplicates within the CSV file itself
 */
const detectRevenueInFileDuplicates = (
  data: TransactionCSVRow[]
): { unique: TransactionCSVRow[]; duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> } => {
  const seen = new Map<string, TransactionCSVRow>();
  const duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
  const unique: TransactionCSVRow[] = [];

  for (const row of data) {
    // Only check invoices/revenues for duplicates
    if (row['Transaction type']?.toLowerCase() !== 'invoice') {
      unique.push(row);
      continue;
    }

    const date = parseCsvDateForDB(row['Date'], true) || '';
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const name = row['Name']?.trim() || '';
    const invoiceNumber = row['Invoice #']?.trim() || '';

    // Use the same key function for consistency
    const key = createRevenueKey(amount, date, invoiceNumber, name);

    if (seen.has(key)) {
      const firstOccurrence = seen.get(key)!;
      duplicates.push({
        transaction: row,
        reason: `Duplicate revenue: ${firstOccurrence['Name']} on ${firstOccurrence['Date']}`
      });
    } else {
      seen.set(key, row);
      unique.push(row);
    }
  }

  return { unique, duplicates };
};

/**
 * Auto-detect payee type from account path
 */
const detectPayeeTypeFromAccount = (accountPath?: string): PayeeType => {
  if (!accountPath) return PayeeType.OTHER;
  
  const lowerAccount = accountPath.toLowerCase();
  
  if (lowerAccount.includes('contract labor') || lowerAccount.includes('subcontractor')) {
    return PayeeType.SUBCONTRACTOR;
  }
  if (lowerAccount.includes('materials') || lowerAccount.includes('supplies')) {
    return PayeeType.MATERIAL_SUPPLIER;
  }
  if (lowerAccount.includes('equipment') || lowerAccount.includes('rental')) {
    return PayeeType.EQUIPMENT_RENTAL;
  }
  if (lowerAccount.includes('permit') || lowerAccount.includes('license')) {
    return PayeeType.PERMIT_AUTHORITY;
  }
  
  return PayeeType.OTHER;
};

/**
 * Create a new payee from transaction data
 */
const createPayeeFromTransaction = async (
  qbName: string, 
  accountPath?: string
): Promise<string | null> => {
  const payeeType = detectPayeeTypeFromAccount(accountPath);
  
  const payeeData = {
    payee_name: qbName,
    payee_type: payeeType,
    provides_labor: payeeType === PayeeType.SUBCONTRACTOR,
    provides_materials: payeeType === PayeeType.MATERIAL_SUPPLIER,
    requires_1099: payeeType === PayeeType.SUBCONTRACTOR,
    is_active: true,
    terms: 'Net 30'
  };
  
  try {
    const { data, error } = await supabase
      .from('payees')
      .insert([payeeData])
      .select('id')
      .single();
    
    return error ? null : data.id;
  } catch (error) {
    console.error('Error creating payee from transaction:', error);
    return null;
  }
};

/**
 * Calculates reconciliation between matching expenses in database and duplicate transaction totals
 * This compares the sum of expenses that match the duplicates (by ID) vs the sum of duplicate amounts
 */
const calculateReconciliation = async (
  startDate: string,
  endDate: string,
  allDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingExpenseId?: string;
    matchKey?: string;
    reason?: string;
  }>
): Promise<{
  totalExistingNonLaborExpenses: number;
  totalDuplicateAmount: number;
  difference: number;
  isAligned: boolean;
  threshold: number;
}> => {
  // Get unique expense IDs from database duplicates (in-file duplicates don't have existingExpenseId)
  const expenseIds = allDuplicates
    .filter(dup => dup.existingExpenseId)
    .map(dup => dup.existingExpenseId!)
    .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

  let totalExistingNonLaborExpenses = 0;
  
  if (expenseIds.length > 0) {
    // Query database for the specific expenses that match the duplicates
    const { data: expensesData, error } = await supabase
      .from('expenses')
      .select('id, amount, category')
      .in('id', expenseIds)
      .neq('category', ExpenseCategory.LABOR)
      .eq('is_split', false);

    if (!error && expensesData) {
      totalExistingNonLaborExpenses = expensesData.reduce((sum, exp) => sum + Math.abs(exp.amount || 0), 0);
    }
  }

  // Sum amounts from all duplicate transactions (both in-file and database duplicates)
  let totalDuplicateAmount = 0;
  for (const dup of allDuplicates) {
    const amount = parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0');
    totalDuplicateAmount += Math.abs(amount);
  }

  const difference = Math.abs(totalExistingNonLaborExpenses - totalDuplicateAmount);
  const threshold = 0.01; // $0.01 tolerance for rounding
  const isAligned = difference <= threshold;

  return {
    totalExistingNonLaborExpenses,
    totalDuplicateAmount,
    difference,
    isAligned,
    threshold
  };
};

/**
 * Calculates reconciliation between matching revenues in database and duplicate invoice totals
 */
const calculateRevenueReconciliation = async (
  startDate: string,
  endDate: string,
  allRevenueDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingRevenueId?: string;
    matchKey?: string;
    reason?: string;
  }>
): Promise<{
  totalExistingRevenues: number;
  totalDuplicateAmount: number;
  difference: number;
  isAligned: boolean;
  threshold: number;
}> => {
  const revenueIds = allRevenueDuplicates
    .filter(dup => dup.existingRevenueId)
    .map(dup => dup.existingRevenueId!)
    .filter((id, index, self) => self.indexOf(id) === index);

  let totalExistingRevenues = 0;
  
  if (revenueIds.length > 0) {
    const { data: revenuesData, error } = await supabase
      .from('project_revenues')
      .select('id, amount')
      .in('id', revenueIds);

    if (!error && revenuesData) {
      totalExistingRevenues = revenuesData.reduce((sum, rev) => sum + Math.abs(rev.amount || 0), 0);
    }
  }

  let totalDuplicateAmount = 0;
  for (const dup of allRevenueDuplicates) {
    const amount = parseFloat(dup.transaction['Amount']?.replace(/[,$]/g, '') || '0');
    totalDuplicateAmount += Math.abs(amount);
  }

  const difference = Math.abs(totalExistingRevenues - totalDuplicateAmount);
  const threshold = 0.01;
  const isAligned = difference <= threshold;

  return {
    totalExistingRevenues,
    totalDuplicateAmount,
    difference,
    isAligned,
    threshold
  };
};

/**
 * Enhanced categorization with multi-tier logic
 */
const categorizeExpense = (
  description: string,
  accountPath?: string,
  dbMappings?: QuickBooksAccountMapping[]
): ExpenseCategory => {
  // Priority 1: User-defined database mappings
  if (accountPath && dbMappings) {
    const dbMapping = dbMappings.find(m => 
      m.qb_account_full_path.toLowerCase() === accountPath.toLowerCase()
    );
    if (dbMapping) return dbMapping.app_category as ExpenseCategory;
  }

  // Priority 2: Static ACCOUNT_CATEGORY_MAP
  if (accountPath) {
    const staticMapping = mapAccountToCategory(accountPath);
    if (staticMapping !== null) return staticMapping;
    
    // Also check resolveQBAccountCategory from quickbooksMapping
    const qbMapping = resolveQBAccountCategory(accountPath);
    if (qbMapping !== ExpenseCategory.OTHER) return qbMapping;
  }

  // Priority 3: Description-based categorization
  const desc = description.toLowerCase();
  
  if (desc.includes('labor') || desc.includes('wage') || desc.includes('payroll')) {
    return ExpenseCategory.LABOR;
  }
  if (desc.includes('contractor') || desc.includes('subcontractor')) {
    return ExpenseCategory.SUBCONTRACTOR;
  }
  if (desc.includes('material') || desc.includes('supply') || desc.includes('lumber') || desc.includes('concrete')) {
    return ExpenseCategory.MATERIALS;
  }
  if (desc.includes('equipment') || desc.includes('rental') || desc.includes('tool') || desc.includes('machinery')) {
    return ExpenseCategory.EQUIPMENT;
  }
  if (desc.includes('permit') || desc.includes('fee') || desc.includes('license')) {
    return ExpenseCategory.PERMITS;
  }
  if (desc.includes('management') || desc.includes('admin') || desc.includes('office')) {
    return ExpenseCategory.MANAGEMENT;
  }
  
  // Priority 4: Default fallback
  return ExpenseCategory.OTHER;
};

/**
 * Creates a composite key for expense matching
 * Uses normalized name (from QuickBooks) instead of payee_id for consistency
 * 
 * @param date - Transaction date
 * @param amount - Transaction amount
 * @param name - QuickBooks Name field (stable across imports)
 */
const createExpenseKey = (
  date: string | Date,
  amount: number,
  name: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.abs(amount).toFixed(2); // Ensure positive, 2 decimal precision as STRING
  const normalizedName = (name || '').toLowerCase().trim();
  return `${dateStr}|${normalizedAmount}|${normalizedName}`;
};

/**
 * Creates a composite key using description (fallback when no payee)
 */
const createExpenseKeyWithDescription = (
  date: string | Date,
  amount: number,
  description: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(amount * 100) / 100;
  const normalizedDesc = description.toLowerCase().trim().substring(0, 50);
  return `desc|${dateStr}|${normalizedAmount}|${normalizedDesc}`;
};

/**
 * Creates a composite key for revenue matching
 * Uses: amount, date, invoice number, and client name
 * 
 * @param amount - Revenue amount
 * @param date - Invoice date
 * @param invoiceNumber - Invoice number
 * @param name - QuickBooks Name field (stable across imports)
 */
const createRevenueKey = (
  amount: number,
  date: string | Date,
  invoiceNumber: string,
  name: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
  const normalizedName = (name || '').toLowerCase().trim();
  const normalizedInvoice = (invoiceNumber || '').toLowerCase().trim();
  return `rev|${normalizedAmount}|${dateStr}|${normalizedInvoice}|${normalizedName}`;
};

/**
 * Fetches existing expenses from database for duplicate detection
 * Joins with payees to get the name for matching
 * @param startDate - Earliest date in the import batch
 * @param endDate - Latest date in the import batch
 * @returns Map of composite keys to existing expense IDs
 */
const fetchExistingExpenses = async (
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string }>> => {
  const { data: existingExpenses, error } = await supabase
    .from('expenses')
    .select(`
      id, 
      expense_date, 
      amount, 
      payee_id, 
      description,
      payees!expenses_payee_id_fkey (
        payee_name
      )
    `)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .eq('is_split', false);

  if (error) {
    console.error('Error fetching existing expenses for duplicate check:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();
  
  for (const expense of existingExpenses || []) {
    // ALWAYS extract from description first (matches CSV format)
    let extractedName = '';
    if (expense.description) {
      // Extract name from description pattern "transaction_type - Name (Unassigned)"
      // Also handle case where name is empty: "expense - " or "expense -  (Unassigned)"
      const descMatch = expense.description.match(/^(?:bill|check|expense)\s*-\s*(.+?)(?:\s*\(|$)/i);
      if (descMatch) {
        let extracted = descMatch[1].trim();
        // Remove "(Unassigned)" or any other parenthetical suffixes
        extracted = extracted.replace(/\s*\([^)]*\)\s*/g, '').trim();
        // If extracted is empty or just whitespace, treat as empty name
        extractedName = extracted || '';
      } else {
        // If pattern doesn't match at all, check if it's just "transaction_type - " (empty name case)
        const emptyNameMatch = expense.description.match(/^(?:bill|check|expense)\s*-\s*$/i);
        if (emptyNameMatch) {
          extractedName = ''; // Explicitly empty name
        }
      }
    }
    
    // Use payee name as fallback if extraction failed AND description is truly empty
    // Don't use payee name if description exists but name is empty (that's a valid empty name case)
    const payeeName = (expense.payees as any)?.payee_name || '';
    if (!extractedName && payeeName && (!expense.description || expense.description.trim() === '')) {
      extractedName = payeeName;
    }
    
    // Normalize date to ISO format to ensure consistent matching
    const normalizedDate = expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : expense.expense_date;
    
    // Create primary key with extracted name (matches CSV format)
    const primaryKey = createExpenseKey(
      normalizedDate,
      expense.amount, // Pass raw amount, function will format it
      extractedName
    );
    existingMap.set(primaryKey, { 
      id: expense.id, 
      description: expense.description || '' 
    });
    
    // ALWAYS create key with payee name (not just when different)
    // This handles cases where CSV Name is empty but DB has payee_name
    if (payeeName) {
      const payeeKey = createExpenseKey(
        normalizedDate,
        expense.amount, // Pass raw amount, function will format it
        payeeName
      );
      // Only set if different from primary key to avoid overwriting
      if (payeeKey !== primaryKey) {
        existingMap.set(payeeKey, { 
          id: expense.id, 
          description: expense.description || '' 
        });
      }
    }
    
    // Create key with empty name for expenses with empty names (regardless of description format)
    // This handles cases where CSV has empty Name but DB expense has payee_name
    // We create this key if:
    // 1. Description is truly empty, OR
    // 2. Description matches pattern "expense - " (empty name after extraction), OR
    // 3. Extracted name looks auto-generated (contains "no vendor", "no payee", etc.)
    // This allows CSV rows with empty names to match DB expenses that have payee_names or auto-generated text
    const looksAutoGenerated = extractedName && /no vendor|no payee|unassigned|unknown/i.test(extractedName);
    const shouldCreateEmptyKey = 
      !expense.description || 
      expense.description.trim() === '' ||
      expense.description.match(/^(?:bill|check|expense)\s*-\s*$/i) !== null ||
      (extractedName === '' && expense.description.match(/^(?:bill|check|expense)\s*-\s*(?:\s*\(|$)/i) !== null) ||
      looksAutoGenerated;
    
    if (shouldCreateEmptyKey) {
      const emptyKey = createExpenseKey(
        normalizedDate,
        expense.amount, // Pass raw amount, function will format it
        ''
      );
      // Only set if different from primary key to avoid overwriting
      if (emptyKey !== primaryKey) {
        existingMap.set(emptyKey, { 
          id: expense.id, 
          description: expense.description || '' 
        });
      }
    }
  }

  return existingMap;
};

/**
 * Fetches existing revenues from database for duplicate detection
 * Joins with clients to get the name for matching
 * @param startDate - Earliest date in the import batch
 * @param endDate - Latest date in the import batch
 * @returns Map of composite keys to existing revenue IDs
 */
const fetchExistingRevenues = async (
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string }>> => {
  const { data: existingRevenues, error } = await supabase
    .from('project_revenues')
    .select(`
      id, 
      invoice_date, 
      amount, 
      invoice_number, 
      description,
      clients!project_revenues_client_id_fkey (
        client_name
      )
    `)
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate);

  if (error) {
    console.error('Error fetching existing revenues for duplicate check:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();
  
  for (const revenue of existingRevenues || []) {
    const clientName = (revenue.clients as any)?.client_name || '';
    
    // Extract name from description as fallback
    const descMatch = revenue.description?.match(/^Invoice from\s+(.+?)(?:\s*\(|$)/i);
    const extractedName = descMatch ? descMatch[1].trim() : clientName;
    
    const key = createRevenueKey(
      revenue.amount,
      revenue.invoice_date,
      revenue.invoice_number || '',
      extractedName
    );
    
    existingMap.set(key, { 
      id: revenue.id, 
      description: revenue.description || '' 
    });
  }

  return existingMap;
};