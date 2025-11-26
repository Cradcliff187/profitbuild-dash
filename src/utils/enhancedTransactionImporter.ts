import Papa from 'papaparse';
import { ExpenseCategory, TransactionType } from '@/types/expense';
import { supabase } from '@/integrations/supabase/client';
import { fuzzyMatchPayee, PartialPayee, FuzzyMatchResult } from '@/utils/fuzzyPayeeMatcher';
import { PayeeType } from '@/types/payee';
import { QuickBooksAccountMapping } from '@/types/quickbooks';
import { resolveQBAccountCategory } from '@/utils/quickbooksMapping';

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
  // === Phase 1: Detect in-file duplicates ===
  const { unique: uniqueTransactions, duplicates: inFileDuplicates } = detectInFileDuplicates(data);
  
  const expenses: ExpenseImportData[] = [];
  const revenues: RevenueImportData[] = [];
  const errors: string[] = [];
  const categoryMappingsUsed: Record<string, string> = {};
  const databaseDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingExpenseId: string;
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

  // === Calculate date range and fetch existing expenses for duplicate detection ===
  const dates = data
    .map(row => row['Date'])
    .filter(d => d && d.trim() !== '')
    .map(d => {
      const date = new Date(d);
      return isNaN(date.getTime()) ? null : date;
    })
    .filter((d): d is Date => d !== null);
  
  let existingExpenses = new Map<string, { id: string; description: string }>();
  
  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add buffer days to catch edge cases
    minDate.setDate(minDate.getDate() - 1);
    maxDate.setDate(maxDate.getDate() + 1);
    
    existingExpenses = await fetchExistingExpenses(
      minDate.toISOString().split('T')[0],
      maxDate.toISOString().split('T')[0]
    );
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

  // Process only unique transactions (skip in-file duplicates)
  for (const row of uniqueTransactions) {
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
        // === Fuzzy payee matching ===
        let payee_id: string | undefined;
        if (name) {
          const matchResult = fuzzyMatchPayee(name, partialPayees);
          
          if (matchResult.bestMatch) {
            payee_id = matchResult.bestMatch.payee.id;
            
            // Record the match info
            fuzzyMatches.push({
              qbName: name,
              matchedPayee: matchResult.bestMatch.payee,
              confidence: matchResult.bestMatch.confidence,
              matchType: matchResult.bestMatch.confidence >= 75 ? 'auto' : 
                        matchResult.bestMatch.matchType === 'exact' ? 'exact' : 'fuzzy'
            });
          } else if (matchResult.matches.length > 0) {
            // Has suggestions but no auto-match
            const suggestions = matchResult.matches
              .filter(match => match.confidence >= 40)
              .slice(0, 3) // Top 3 suggestions
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
            // No matches found - attempt to auto-create payee
            const createdPayeeId = await createPayeeFromTransaction(name, accountFullName);
            if (createdPayeeId) {
              payee_id = createdPayeeId;
              const payeeType = detectPayeeTypeFromAccount(accountFullName);
              autoCreatedPayees.push({
                qbName: name,
                payeeId: createdPayeeId,
                payeeType
              });
              // Update partialPayees for subsequent matches
              partialPayees.push({
                id: createdPayeeId,
                payee_name: name,
                full_name: name
              });
            }
          }
        }

        // === Enhanced categorization with multi-tier logic ===
        const category = categorizeExpense(
          name,
          accountFullName,
          dbMappings
        );

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

        // === Check for database duplicate ===
        const primaryKey = createExpenseKey(date, Math.abs(amount), payee_id || null);
        const descriptionKey = createExpenseKeyWithDescription(
          date, 
          Math.abs(amount), 
          name
        );
        
        const existingByPrimaryKey = existingExpenses.get(primaryKey);
        const existingByDescription = !payee_id ? existingExpenses.get(descriptionKey) : null;
        const existingExpense = existingByPrimaryKey || existingByDescription;
        
        if (existingExpense) {
          databaseDuplicates.push({
            transaction: row,
            existingExpenseId: existingExpense.id,
            matchKey: existingByPrimaryKey ? primaryKey : descriptionKey
          });
          continue; // Skip this transaction - already exists in database
        }
        // === END database duplicate check ===

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

  // === Calculate reconciliation ===
  let reconciliation;
  if (dates.length > 0 && (databaseDuplicates.length > 0 || inFileDuplicates.length > 0)) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add buffer days to match duplicate detection
    minDate.setDate(minDate.getDate() - 1);
    maxDate.setDate(maxDate.getDate() + 1);
    
    // Combine all duplicates for reconciliation
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
    fuzzyMatches,
    lowConfidenceMatches,
    autoCreatedPayees,
    autoCreatedCount: autoCreatedPayees.length,
    mappingStats,
    unmappedAccounts,
    reconciliation
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

/**
 * Detects duplicates within the CSV file itself
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

    const date = formatDateForDB(row['Date']);
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
    const name = row['Name']?.trim().toLowerCase() || '';

    // Create key: date|amount|name
    const key = `${date}|${normalizedAmount}|${name}`.toLowerCase();

    if (seen.has(key)) {
      const firstOccurrence = seen.get(key)!;
      duplicates.push({
        transaction: row,
        reason: `Duplicate of: ${firstOccurrence['Name']} on ${firstOccurrence['Date']}`
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
 */
const createExpenseKey = (
  date: string | Date,
  amount: number,
  payeeId: string | null
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(amount * 100) / 100; // Ensure 2 decimal precision
  return `${dateStr}|${normalizedAmount}|${payeeId || 'null'}`.toLowerCase();
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
 * Fetches existing expenses from database for duplicate detection
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
    .select('id, expense_date, amount, payee_id, description')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .eq('is_split', false); // Only check non-split parent expenses

  if (error) {
    console.error('Error fetching existing expenses for duplicate check:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();
  
  for (const expense of existingExpenses || []) {
    // Primary key: date-amount-payeeId
    const primaryKey = createExpenseKey(
      expense.expense_date,
      expense.amount,
      expense.payee_id
    );
    existingMap.set(primaryKey, { 
      id: expense.id, 
      description: expense.description || '' 
    });
    
    // Secondary key for null payee: date-amount-description (normalized)
    if (!expense.payee_id && expense.description) {
      const secondaryKey = createExpenseKeyWithDescription(
        expense.expense_date,
        expense.amount,
        expense.description
      );
      existingMap.set(secondaryKey, { 
        id: expense.id, 
        description: expense.description 
      });
    }
  }

  return existingMap;
};