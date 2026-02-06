import Papa from 'papaparse';
import { ExpenseCategory, TransactionType } from '@/types/expense';
import { supabase } from '@/integrations/supabase/client';
import { PayeeType } from '@/types/payee';
import { parseDateOnly } from './dateUtils';
import {
  fuzzyMatchPayee,
  PartialPayee,
  FuzzyMatchResult,
  resolveQBAccountCategory,
  parseCsvDateForDB,
  formatDateForDB,
  normalizeString,
  createExpenseKey,
  createRevenueKey,
  detectPayeeTypeFromAccount,
  categorizeExpense,
  mapTransactionType,
  mapAccountToCategory,
  ACCOUNT_CATEGORY_MAP,
  TRANSACTION_TYPE_MAP,
  QuickBooksAccountMapping,
  fuzzyMatchProject,
  fuzzyMatchClient,
  jaroWinklerSimilarity,
  suggestCategoryFromAccountName,
  PartialProject,
  PartialClient,
  ProjectAlias,
  ProjectMatchResult,
} from './importCore';

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
  import_batch_id?: string;
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
  import_batch_id?: string;
}

export interface PayeeMatchInfo {
  qbName: string;
  matchedPayee: PartialPayee;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'auto';
}

export interface PendingPayeeReview {
  qbName: string;
  suggestedPayeeType: string;
  accountFullName: string;
  suggestions: Array<{
    payee: PartialPayee;
    confidence: number;
  }>;
}

export interface PendingClientReview {
  qbName: string;
  suggestions: Array<{
    client: PartialClient;
    confidence: number;
  }>;
}

export interface MatchLogEntry {
  qbName: string;
  matchedEntity: string | null;
  entityType: 'payee' | 'project' | 'client' | 'category' | 'account';
  confidence: number;
  decision: 'auto_matched' | 'fuzzy_matched' | 'alias_matched' | 'created' | 'pending_review' | 'unmatched' | 'mapped' | 'user_override';
  algorithm: string;
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
    note?: string;
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
  /** @deprecated Superseded by pendingPayeeReviews. Always empty. */
  lowConfidenceMatches: Array<{
    qbName: string;
    suggestions: Array<{
      payee: PartialPayee;
      confidence: number;
    }>;
  }>;
  /** @deprecated Payees are no longer auto-created during import. Always empty. */
  autoCreatedPayees: Array<{
    qbName: string;
    payeeId: string;
    payeeType: PayeeType;
  }>;
  /** @deprecated Always 0. Payees are no longer auto-created during import. */
  autoCreatedCount: number;
  mappingStats: {
    databaseMapped: number;
    staticMapped: number;
    descriptionMapped: number;
    unmapped: number;
  };
  unmappedAccounts: Array<{
    accountFullName: string;
    transactionCount: number;
    totalAmount: number;
    suggestedCategory?: ExpenseCategory;
  }>;
  unmatchedProjects: Array<{
    qbProjectWO: string;
    transactionCount: number;
    totalAmount: number;
    suggestions: Array<{ project: PartialProject; confidence: number; matchType: string }>;
  }>;
  pendingPayeeReviews: PendingPayeeReview[];
  pendingClientReviews: PendingClientReview[];
  matchLog: MatchLogEntry[];
  reimportedDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingId: string;
    matchKey: string;
    type: 'expense' | 'revenue';
  }>;
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
        
        if (import.meta.env.DEV) {
          console.debug('Transaction CSV parsed:', { 
            totalRows: data.length, 
            headers,
            sampleRow: data[0] 
          });
        }
        
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
  data: TransactionCSVRow[],
  import_batch_id?: string,
  options?: { overrideDedup?: Set<string> }
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
  const reimportedDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingId: string;
    matchKey: string;
    type: 'expense' | 'revenue';
  }> = [];
  const revenueDatabaseDuplicates: Array<{
    transaction: TransactionCSVRow;
    existingRevenueId: string;
    matchKey: string;
  }> = [];
  const fuzzyMatches: PayeeMatchInfo[] = [];
  const pendingPayeeReviews: PendingPayeeReview[] = [];
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
  const unmappedAccountsTracker = new Map<string, { count: number; totalAmount: number }>();
  
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
  
  let existingExpenses = new Map<string, { id: string; description: string; is_split?: boolean }>();
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

  // Load clients, payees, projects, account mappings, and project aliases for matching
  const [clientsResponse, payeesResponse, projectsResponse, mappingsResponse, aliasesResponse] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('payees').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('quickbooks_account_mappings').select('*').eq('is_active', true),
    supabase.from('project_aliases').select('*').eq('is_active', true)
  ]);

  const clients = clientsResponse.data || [];
  const payees = payeesResponse.data || [];
  const projects = projectsResponse.data || [];
  const dbMappings = mappingsResponse.data || [];
  const projectAliases: ProjectAlias[] = (aliasesResponse.data || []).map((a: any) => ({
    id: a.id,
    project_id: a.project_id,
    alias: a.alias,
    match_type: a.match_type,
    is_active: a.is_active
  }));

  // Build partial projects for fuzzy matching
  const partialProjects: PartialProject[] = projects.map(p => ({
    id: p.id,
    project_number: p.project_number,
    project_name: p.project_name || ''
  }));

  // Build partial clients for fuzzy matching
  const partialClients: PartialClient[] = clients.map(c => ({
    id: c.id,
    client_name: c.client_name,
    company_name: c.company_name || undefined
  }));

  // Convert payees to PartialPayee format for fuzzy matching
  const partialPayees: PartialPayee[] = payees.map(p => ({
    id: p.id,
    payee_name: p.payee_name,
    full_name: p.full_name
  }));

  let unassociated_expenses = 0;
  let unassociated_revenues = 0;
  const unmatchedProjectTracker = new Map<string, { count: number; totalAmount: number }>();
  const pendingClientReviewsMap = new Map<string, PendingClientReview>();
  const matchLog: MatchLogEntry[] = [];

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

      // Find project if specified using fuzzy matching with aliases
      let project_id: string = UNASSIGNED_PROJECT_ID;
      let isUnassigned = true;
      
      if (projectWO) {
        const projectMatch = fuzzyMatchProject(projectWO, partialProjects, projectAliases);
        if (projectMatch) {
          project_id = projectMatch.project_id;
          isUnassigned = false;
          const matchedProject = partialProjects.find(p => p.id === projectMatch.project_id);
          matchLog.push({
            qbName: projectWO,
            matchedEntity: matchedProject?.project_number || projectMatch.project_id,
            entityType: 'project',
            confidence: projectMatch.confidence,
            decision: projectMatch.matchType.startsWith('alias') ? 'alias_matched' :
                      projectMatch.matchType === 'fuzzy' || projectMatch.matchType === 'regex' ? 'fuzzy_matched' : 'auto_matched',
            algorithm: projectMatch.matchType
          });
        } else {
          // Track unmatched project
          const existing = unmatchedProjectTracker.get(projectWO);
          if (existing) {
            existing.count++;
            existing.totalAmount += Math.abs(amount);
          } else {
            unmatchedProjectTracker.set(projectWO, { count: 1, totalAmount: Math.abs(amount) });
          }
          matchLog.push({
            qbName: projectWO,
            matchedEntity: null,
            entityType: 'project',
            confidence: 0,
            decision: 'unmatched',
            algorithm: 'fuzzyMatchProject'
          });
        }
      }

      // === Fuzzy payee matching ===
      let payee_id: string | undefined;
      if (name) {
        const matchResult = fuzzyMatchPayee(name, partialPayees);
        
        if (matchResult.bestMatch) {
          payee_id = matchResult.bestMatch.payee.id;
          
          const isAuto = matchResult.bestMatch.confidence >= 75;
          fuzzyMatches.push({
            qbName: name,
            matchedPayee: matchResult.bestMatch.payee,
            confidence: matchResult.bestMatch.confidence,
            matchType: isAuto ? 'auto' : 
                      matchResult.bestMatch.matchType === 'exact' ? 'exact' : 'fuzzy'
          });
          matchLog.push({
            qbName: name,
            matchedEntity: matchResult.bestMatch.payee.payee_name,
            entityType: 'payee',
            confidence: matchResult.bestMatch.confidence,
            decision: isAuto ? 'auto_matched' : 'fuzzy_matched',
            algorithm: matchResult.bestMatch.matchType || 'jaroWinkler'
          });
        } else {
          // Queue for user review — covers both "low confidence" and "no match" cases
          if (!pendingPayeeReviews.some(p => p.qbName === name)) {
            pendingPayeeReviews.push({
              qbName: name,
              suggestedPayeeType: detectPayeeTypeFromAccount(accountFullName),
              accountFullName,
              suggestions: matchResult.matches
                .filter(m => m.confidence >= 40)
                .slice(0, 5)
                .map(m => ({ payee: m.payee, confidence: m.confidence }))
            });
          }
          matchLog.push({
            qbName: name,
            matchedEntity: null,
            entityType: 'payee',
            confidence: 0,
            decision: 'pending_review',
            algorithm: 'fuzzyMatchPayee'
          });
          // payee_id remains undefined — will be set after user resolution
        }
      }

      const category = categorizeExpense(name, accountFullName, dbMappings);

      // Track mapping statistics
      if (accountFullName && dbMappings.some(m => 
        m.qb_account_full_path.toLowerCase() === accountFullName.toLowerCase()
      )) {
        mappingStats.databaseMapped++;
        matchLog.push({
          qbName: accountFullName,
          matchedEntity: category || null,
          entityType: 'account',
          confidence: 100,
          decision: 'mapped',
          algorithm: 'database_mapping'
        });
      } else if (accountFullName && mapAccountToCategory(accountFullName) !== null) {
        mappingStats.staticMapped++;
        matchLog.push({
          qbName: accountFullName,
          matchedEntity: category || null,
          entityType: 'account',
          confidence: 100,
          decision: 'mapped',
          algorithm: 'static_mapping'
        });
      } else if (accountFullName && resolveQBAccountCategory(accountFullName) !== ExpenseCategory.OTHER) {
        mappingStats.staticMapped++;
        matchLog.push({
          qbName: accountFullName,
          matchedEntity: category || null,
          entityType: 'account',
          confidence: 100,
          decision: 'mapped',
          algorithm: 'qb_account_resolver'
        });
      } else if (category !== ExpenseCategory.OTHER) {
        mappingStats.descriptionMapped++;
        matchLog.push({
          qbName: accountFullName || name,
          matchedEntity: category,
          entityType: 'category',
          confidence: 80,
          decision: 'mapped',
          algorithm: 'description_mapping'
        });
      } else {
        mappingStats.unmapped++;
        if (accountFullName) {
          const existing = unmappedAccountsTracker.get(accountFullName);
          if (existing) {
            existing.count++;
            existing.totalAmount += Math.abs(amount);
          } else {
            unmappedAccountsTracker.set(accountFullName, { count: 1, totalAmount: Math.abs(amount) });
          }
          matchLog.push({
            qbName: accountFullName,
            matchedEntity: null,
            entityType: 'account',
            confidence: 0,
            decision: 'unmatched',
            algorithm: 'all_mapping_strategies'
          });
        }
      }

      if (category) {
        categoryMappingsUsed[accountFullName] = category;
      }
      
      const txType = mapTransactionType(transactionType);

      // === DATABASE DUPLICATE CHECK - ENHANCED MULTI-KEY MATCHING ===
      // Try multiple matching strategies to handle empty names and mismatches
      let existingExpense: { id: string; description: string; is_split?: boolean } | undefined;
      let matchKey = '';
      
      // Strategy 1a: 4-part key (new — includes account_full_name)
      if (accountFullName) {
        const fourPartKey = createExpenseKey(date, amount, name, accountFullName);
        existingExpense = existingExpenses.get(fourPartKey);
        if (existingExpense) {
          matchKey = fourPartKey;
        }
      }

      // Strategy 1b: 3-part key fallback (backward compat with old records)
      if (!existingExpense) {
        const threePartKey = createExpenseKey(date, amount, name);
        existingExpense = existingExpenses.get(threePartKey);
        if (existingExpense) {
          matchKey = threePartKey;
        }
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
        const resolvedKey = matchKey || createExpenseKey(date, amount, name);
        // Check if user explicitly selected this duplicate for re-import
        if (options?.overrideDedup?.has(resolvedKey)) {
          reimportedDuplicates.push({
            transaction: row,
            existingId: existingExpense.id,
            matchKey: resolvedKey,
            type: 'expense'
          });
          matchLog.push({
            qbName: name || `${date}|${amount}`,
            matchedEntity: existingExpense.id,
            entityType: 'payee',
            confidence: 100,
            decision: 'user_override',
            algorithm: 'overrideDedup'
          });
          // Fall through to create the expense as new
        } else {
          databaseDuplicates.push({
            transaction: row,
            existingExpenseId: existingExpense.id,
            matchKey: resolvedKey,
            ...(existingExpense.is_split ? { note: 'Matched against a split expense — review allocations if re-importing' } : {})
          });
          continue; // Skip - already exists
        }
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
        import_batch_id,
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

      // Find project if specified using fuzzy matching with aliases
      let project_id: string = UNASSIGNED_PROJECT_ID;
      let isUnassigned = true;
      
      if (projectWO) {
        const projectMatch = fuzzyMatchProject(projectWO, partialProjects, projectAliases);
        if (projectMatch) {
          project_id = projectMatch.project_id;
          isUnassigned = false;
          const matchedProject = partialProjects.find(p => p.id === projectMatch.project_id);
          matchLog.push({
            qbName: projectWO,
            matchedEntity: matchedProject?.project_number || projectMatch.project_id,
            entityType: 'project',
            confidence: projectMatch.confidence,
            decision: projectMatch.matchType.startsWith('alias') ? 'alias_matched' :
                      projectMatch.matchType === 'fuzzy' || projectMatch.matchType === 'regex' ? 'fuzzy_matched' : 'auto_matched',
            algorithm: projectMatch.matchType
          });
        } else {
          // Track unmatched project
          const existing = unmatchedProjectTracker.get(projectWO);
          if (existing) {
            existing.count++;
            existing.totalAmount += Math.abs(amount);
          } else {
            unmatchedProjectTracker.set(projectWO, { count: 1, totalAmount: Math.abs(amount) });
          }
          matchLog.push({
            qbName: projectWO,
            matchedEntity: null,
            entityType: 'project',
            confidence: 0,
            decision: 'unmatched',
            algorithm: 'fuzzyMatchProject'
          });
        }
      }

      // Fuzzy match client
      let client_id: string | undefined;
      if (name) {
        const clientResult = fuzzyMatchClient(name, partialClients);
        if (clientResult.bestMatch) {
          client_id = clientResult.bestMatch.client_id;
          matchLog.push({
            qbName: name,
            matchedEntity: partialClients.find(c => c.id === clientResult.bestMatch!.client_id)?.client_name || clientResult.bestMatch.client_id,
            entityType: 'client',
            confidence: clientResult.bestMatch.confidence,
            decision: clientResult.bestMatch.confidence >= 75 ? 'auto_matched' : 'fuzzy_matched',
            algorithm: 'fuzzyMatchClient'
          });
        } else if (clientResult.suggestions.length > 0) {
          // Add to pending client reviews if not already tracked
          if (!pendingClientReviewsMap.has(name.toLowerCase().trim())) {
            pendingClientReviewsMap.set(name.toLowerCase().trim(), {
              qbName: name,
              suggestions: clientResult.suggestions
            });
          }
          matchLog.push({
            qbName: name,
            matchedEntity: null,
            entityType: 'client',
            confidence: clientResult.suggestions[0]?.confidence || 0,
            decision: 'pending_review',
            algorithm: 'fuzzyMatchClient'
          });
        } else {
          matchLog.push({
            qbName: name,
            matchedEntity: null,
            entityType: 'client',
            confidence: 0,
            decision: 'unmatched',
            algorithm: 'fuzzyMatchClient'
          });
        }
      }
      if (!client_id && isUnassigned) {
        client_id = UNASSIGNED_CLIENT_ID;
      }
      const description = `Invoice from ${name}${isUnassigned ? ' (Unassigned)' : ''}`;

      // === Check for database duplicate ===
      const revenueKey = createRevenueKey(amount, date, invoiceNumber, name);
      const existingRevenue = existingRevenues.get(revenueKey);
      
      if (existingRevenue) {
        // Check if user explicitly selected this duplicate for re-import
        if (options?.overrideDedup?.has(revenueKey)) {
          reimportedDuplicates.push({
            transaction: row,
            existingId: existingRevenue.id,
            matchKey: revenueKey,
            type: 'revenue'
          });
          matchLog.push({
            qbName: name || invoiceNumber || `${date}|${amount}`,
            matchedEntity: existingRevenue.id,
            entityType: 'client',
            confidence: 100,
            decision: 'user_override',
            algorithm: 'overrideDedup'
          });
          // Fall through to create the revenue as new
        } else {
          revenueDatabaseDuplicates.push({
            transaction: row,
            existingRevenueId: existingRevenue.id,
            matchKey: revenueKey
          });
          continue;
        }
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
        import_batch_id,
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
    lowConfidenceMatches: [],
    autoCreatedPayees: [],
    autoCreatedCount: 0,
    mappingStats,
    unmappedAccounts: Array.from(unmappedAccountsTracker.entries()).map(([accountFullName, data]) => ({
      accountFullName,
      transactionCount: data.count,
      totalAmount: data.totalAmount,
      suggestedCategory: suggestCategoryFromAccountName(accountFullName) || undefined
    })),
    unmatchedProjects: Array.from(unmatchedProjectTracker.entries()).map(([qbProjectWO, data]) => {
      // Generate fuzzy suggestions for each unmatched project (top 3)
      const suggestions: Array<{ project: PartialProject; confidence: number; matchType: string }> = [];
      for (const p of partialProjects) {
        const similarity = jaroWinklerSimilarity(
          qbProjectWO.toLowerCase().trim(),
          p.project_number.toLowerCase().trim()
        ) * 100;
        if (similarity >= 50) {
          suggestions.push({ project: p, confidence: Math.round(similarity), matchType: 'fuzzy' });
        }
      }
      suggestions.sort((a, b) => b.confidence - a.confidence);
      return {
        qbProjectWO,
        transactionCount: data.count,
        totalAmount: data.totalAmount,
        suggestions: suggestions.slice(0, 3)
      };
    }),
    pendingPayeeReviews,
    pendingClientReviews: Array.from(pendingClientReviewsMap.values()),
    matchLog,
    reimportedDuplicates,
    reconciliation,
    revenueReconciliation
  };
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
    const accountFullName = row['Account full name']?.trim() || '';

    // Use the same key function for consistency (4-part key when account available)
    const key = accountFullName
      ? createExpenseKey(date, amount, name, accountFullName)
      : createExpenseKey(date, amount, name);

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
 * Create a new payee from transaction data
 * Exported for use by ExpenseImportModal after payee review resolution
 */
export const createPayeeFromTransaction = async (
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
 * Joins with payees to get the name for matching
 * @param startDate - Earliest date in the import batch
 * @param endDate - Latest date in the import batch
 * @returns Map of composite keys to existing expense IDs
 */
const fetchExistingExpenses = async (
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string; is_split?: boolean }>> => {
  const { data: existingExpenses, error } = await supabase
    .from('expenses')
    .select(`
      id, 
      expense_date, 
      amount, 
      payee_id, 
      description,
      account_full_name,
      is_split,
      payees!expenses_payee_id_fkey (
        payee_name
      )
    `)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate);

  if (error) {
    console.error('Error fetching existing expenses for duplicate check:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string; is_split?: boolean }>();
  
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
    const mapEntry = { 
      id: expense.id, 
      description: expense.description || '',
      is_split: (expense as any).is_split === true ? true : undefined
    };
    existingMap.set(primaryKey, mapEntry);
    
    // Also store 4-part key if account_full_name is available
    if ((expense as any).account_full_name) {
      const fourPartKey = createExpenseKey(
        normalizedDate,
        expense.amount,
        extractedName,
        (expense as any).account_full_name
      );
      existingMap.set(fourPartKey, mapEntry);
    }
    
    // ALWAYS create key with payee name (not just when different)
    // This handles cases where CSV Name is empty but DB has payee_name
    if (payeeName) {
      const payeeKey = createExpenseKey(
        normalizedDate,
        expense.amount,
        payeeName
      );
      // Only set if different from primary key to avoid overwriting
      if (payeeKey !== primaryKey) {
        existingMap.set(payeeKey, mapEntry);
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
        expense.amount,
        ''
      );
      // Only set if different from primary key to avoid overwriting
      if (emptyKey !== primaryKey) {
        existingMap.set(emptyKey, mapEntry);
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