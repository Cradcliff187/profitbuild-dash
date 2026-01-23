/**
 * Shared transaction processing logic for QuickBooks imports
 * This module is used by both frontend CSV import and backend API sync
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Type definitions
export interface TransactionCSVRow {
  [key: string]: string;
}

export interface ExpenseImportData {
  project_id: string;
  description: string;
  category: string;
  transaction_type: string;
  amount: number;
  expense_date: string;
  payee_id?: string;
  invoice_number?: string;
  account_name?: string;
  account_full_name?: string;
  quickbooks_transaction_id?: string;
}

export interface RevenueImportData {
  project_id: string;
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
  matchedPayeeId: string;
  matchedPayeeName: string;
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
  databaseDuplicatesSkipped: number;
  inFileDuplicatesSkipped: number;
  revenueDatabaseDuplicatesSkipped: number;
  revenueInFileDuplicatesSkipped: number;
  fuzzyMatches: PayeeMatchInfo[];
  autoCreatedPayees: Array<{
    qbName: string;
    payeeId: string;
    payeeType: string;
  }>;
  autoCreatedCount: number;
  mappingStats: {
    databaseMapped: number;
    staticMapped: number;
    descriptionMapped: number;
    unmapped: number;
  };
  unmappedAccounts: string[];
}

// Constants
const UNASSIGNED_PROJECT_ID = '00000000-0000-0000-0000-000000000002';
const UNASSIGNED_CLIENT_ID = '00000000-0000-0000-0000-000000000001';

const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  'labor_internal': 'labor_internal',
  'subcontractors': 'subcontractors',
  'materials': 'materials',
  'equipment': 'equipment',
  'permits': 'permits',
  'management': 'management',
  'tools': 'tools',
  'software': 'software',
  'vehicle_maintenance': 'vehicle_maintenance',
  'gas': 'gas',
  'meals': 'meals',
  'other': 'other'
};

const ACCOUNT_CATEGORY_MAP: Record<string, string> = {
  'cost of goods sold:contract labor': 'subcontractors',
  'cost of goods sold:supplies & materials': 'materials',
  'cost of goods sold:equipment rental - cogs': 'equipment',
  'cost of goods sold:equipment rental': 'equipment',
  'cost of goods sold:job site dumpsters': 'materials',
  'office expenses:office equipment & supplies': 'management',
  'vehicle expenses:vehicle gas & fuel': 'management',
  'general business expenses:uniforms': 'management',
  'rent:building & land rent': 'management',
  'employee benefits:workers\' compensation insurance': 'management',
  'insurance:business insurance': 'management',
  'legal & accounting services:legal fees': 'management',
};

const TRANSACTION_TYPE_MAP: Record<string, string> = {
  'bill': 'bill',
  'check': 'check',
  'expense': 'expense',
};

/**
 * Process transaction import data
 * @param supabase - Supabase client (can be auth or service role)
 * @param data - Array of transaction CSV rows
 * @returns Import results with expenses, revenues, and metadata
 */
export async function processTransactionImport(
  supabase: SupabaseClient,
  data: TransactionCSVRow[]
): Promise<TransactionImportResult> {
  const expenses: ExpenseImportData[] = [];
  const revenues: RevenueImportData[] = [];
  const errors: string[] = [];
  const categoryMappingsUsed: Record<string, string> = {};
  const fuzzyMatches: PayeeMatchInfo[] = [];
  const autoCreatedPayees: Array<{
    qbName: string;
    payeeId: string;
    payeeType: string;
  }> = [];
  const unmappedAccounts: string[] = [];

  let mappingStats = {
    databaseMapped: 0,
    staticMapped: 0,
    descriptionMapped: 0,
    unmapped: 0
  };

  let unassociated_expenses = 0;
  let unassociated_revenues = 0;

  // Detect duplicates within the file
  const { unique: uniqueExpenseTransactions, duplicates: inFileDuplicates } = 
    detectInFileDuplicates(data);
  const { unique: uniqueRevenueTransactions, duplicates: revenueInFileDuplicates } = 
    detectRevenueInFileDuplicates(data);

  // Fetch existing data for duplicate detection
  const dates = data
    .map(row => row['Date'])
    .filter(d => d && d.trim() !== '')
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()));

  let existingExpenses = new Map<string, { id: string; description: string }>();
  let existingRevenues = new Map<string, { id: string; description: string }>();
  let existingExpensesByQBId = new Map<string, { id: string; description: string }>();
  let existingRevenuesByQBId = new Map<string, { id: string; description: string }>();
  let databaseDuplicatesSkipped = 0;
  let revenueDatabaseDuplicatesSkipped = 0;

  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    minDate.setDate(minDate.getDate() - 1);
    maxDate.setDate(maxDate.getDate() + 1);

    [existingExpenses, existingRevenues, existingExpensesByQBId, existingRevenuesByQBId] = await Promise.all([
      fetchExistingExpenses(
        supabase,
        minDate.toISOString().split('T')[0],
        maxDate.toISOString().split('T')[0]
      ),
      fetchExistingRevenues(
        supabase,
        minDate.toISOString().split('T')[0],
        maxDate.toISOString().split('T')[0]
      ),
      fetchExistingExpensesByQBId(supabase),
      fetchExistingRevenuesByQBId(supabase)
    ]);
  }

  // Load reference data
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
  const payeeMap = new Map<string, string>();

  clients.forEach((client: any) => {
    const normalizedName = normalizeString(client.client_name);
    clientMap.set(normalizedName, client.id);
    if (client.company_name) {
      clientMap.set(normalizeString(client.company_name), client.id);
    }
  });

  projects.forEach((project: any) => {
    const normalizedNumber = normalizeString(project.project_number);
    projectMap.set(normalizedNumber, project.id);
    if (project.project_name) {
      projectMap.set(normalizeString(project.project_name), project.id);
    }
  });

  payees.forEach((payee: any) => {
    const normalizedName = normalizeString(payee.payee_name);
    payeeMap.set(normalizedName, payee.id);
    if (payee.full_name) {
      payeeMap.set(normalizeString(payee.full_name), payee.id);
    }
  });

  // Process expense transactions
  for (const row of uniqueExpenseTransactions) {
    try {
      const transactionType = row['Transaction type']?.toLowerCase();
      if (transactionType === 'invoice') continue;

      const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
      const date = formatDateForDB(row['Date']);
      const name = row['Name']?.trim() || '';
      const projectWO = row['Project/WO #']?.trim() || '';
      const accountFullName = row['Account full name']?.trim() || '';
      const accountName = row['Account name']?.trim() || '';
      const qbTransactionId = row['QB_Transaction_Id'] || '';

      // Find project
      let project_id = UNASSIGNED_PROJECT_ID;
      let isUnassigned = true;

      if (projectWO) {
        let mappedProjectWO = projectWO;
        const normalizedProjectWO = normalizeString(projectWO);

        if (normalizedProjectWO.startsWith('fuel')) {
          mappedProjectWO = '001-GAS';
        } else if (normalizedProjectWO === 'ga') {
          mappedProjectWO = '002-GA';
        }

        const foundProjectId = projectMap.get(normalizeString(mappedProjectWO));
        if (foundProjectId) {
          project_id = foundProjectId;
          isUnassigned = false;
        }
      }

      // Find or create payee
      let payee_id: string | undefined;
      if (name) {
        const normalizedName = normalizeString(name);
        payee_id = payeeMap.get(normalizedName);

        if (!payee_id) {
          const createdPayeeId = await createPayeeFromTransaction(
            supabase,
            name,
            accountFullName
          );
          if (createdPayeeId) {
            payee_id = createdPayeeId;
            payeeMap.set(normalizedName, createdPayeeId);
            const payeeType = detectPayeeTypeFromAccount(accountFullName);
            autoCreatedPayees.push({
              qbName: name,
              payeeId: createdPayeeId,
              payeeType
            });

            fuzzyMatches.push({
              qbName: name,
              matchedPayeeId: createdPayeeId,
              matchedPayeeName: name,
              confidence: 100,
              matchType: 'auto'
            });
          }
        } else {
          fuzzyMatches.push({
            qbName: name,
            matchedPayeeId: payee_id,
            matchedPayeeName: name,
            confidence: 100,
            matchType: 'exact'
          });
        }
      }

      // Categorize expense
      const category = categorizeExpense(name, accountFullName, dbMappings);

      // Track mapping statistics
      if (accountFullName && dbMappings.some(m => 
        m.qb_account_full_path.toLowerCase() === accountFullName.toLowerCase()
      )) {
        mappingStats.databaseMapped++;
      } else if (accountFullName && mapAccountToCategory(accountFullName) !== null) {
        mappingStats.staticMapped++;
      } else if (category !== 'other') {
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

      // Check for database duplicate
      // Priority 1: Check by QuickBooks transaction ID (most reliable)
      if (qbTransactionId) {
        const existingByQBId = existingExpensesByQBId.get(qbTransactionId);
        if (existingByQBId) {
          console.log(`Skipping duplicate expense by QB ID: ${qbTransactionId}`);
          databaseDuplicatesSkipped++;
          continue;
        }
      }

      // Priority 2: Check by composite key (fallback for CSV imports or transactions without QB ID)
      const primaryKey = createExpenseKey(date, amount, name);
      const existingExpense = existingExpenses.get(primaryKey);

      if (existingExpense) {
        databaseDuplicatesSkipped++;
        continue;
      }

      const expense: ExpenseImportData = {
        project_id,
        description: `${transactionType} - ${name}${isUnassigned ? ' (Unassigned)' : ''}`,
        category: category || 'management',
        transaction_type: txType,
        amount: Math.abs(amount),
        expense_date: date,
        payee_id,
        account_name: accountName,
        account_full_name: accountFullName,
        quickbooks_transaction_id: qbTransactionId || undefined
      };

      expenses.push(expense);

      if (isUnassigned) {
        unassociated_expenses++;
      }
    } catch (error) {
      errors.push(`Error processing expense row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process revenue transactions
  for (const row of uniqueRevenueTransactions) {
    try {
      const transactionType = row['Transaction type']?.toLowerCase();
      if (transactionType !== 'invoice') continue;

      const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
      const date = formatDateForDB(row['Date']);
      const name = row['Name']?.trim() || '';
      const projectWO = row['Project/WO #']?.trim() || '';
      const accountFullName = row['Account full name']?.trim() || '';
      const accountName = row['Account name']?.trim() || '';
      const invoiceNumber = row['Invoice #']?.trim() || '';
      const qbTransactionId = row['QB_Transaction_Id'] || '';

      // Find project
      let project_id = UNASSIGNED_PROJECT_ID;
      let isUnassigned = true;

      if (projectWO) {
        let mappedProjectWO = projectWO;
        const normalizedProjectWO = normalizeString(projectWO);

        if (normalizedProjectWO.startsWith('fuel')) {
          mappedProjectWO = '001-GAS';
        } else if (normalizedProjectWO === 'ga') {
          mappedProjectWO = '002-GA';
        }

        const foundProjectId = projectMap.get(normalizeString(mappedProjectWO));
        if (foundProjectId) {
          project_id = foundProjectId;
          isUnassigned = false;
        }
      }

      const client_id = clientMap.get(normalizeString(name)) || 
        (isUnassigned ? UNASSIGNED_CLIENT_ID : undefined);
      const description = `Invoice from ${name}${isUnassigned ? ' (Unassigned)' : ''}`;

      // Check for database duplicate
      // Priority 1: Check by QuickBooks transaction ID (most reliable)
      if (qbTransactionId) {
        const existingByQBId = existingRevenuesByQBId.get(qbTransactionId);
        if (existingByQBId) {
          console.log(`Skipping duplicate revenue by QB ID: ${qbTransactionId}`);
          revenueDatabaseDuplicatesSkipped++;
          continue;
        }
      }

      // Priority 2: Check by composite key (fallback for CSV imports)
      const revenueKey = createRevenueKey(amount, date, invoiceNumber, name);
      const existingRevenue = existingRevenues.get(revenueKey);

      if (existingRevenue) {
        revenueDatabaseDuplicatesSkipped++;
        continue;
      }

      const revenue: RevenueImportData = {
        project_id,
        client_id,
        amount: Math.abs(amount),
        invoice_date: date,
        description,
        invoice_number: invoiceNumber || undefined,
        account_name: accountName,
        account_full_name: accountFullName,
        quickbooks_transaction_id: qbTransactionId || undefined
      };

      revenues.push(revenue);

      if (isUnassigned) {
        unassociated_revenues++;
      }
    } catch (error) {
      errors.push(`Error processing revenue row: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    expenses,
    revenues,
    unassociated_expenses,
    unassociated_revenues,
    category_mappings_used: categoryMappingsUsed,
    errors,
    databaseDuplicatesSkipped,
    inFileDuplicatesSkipped: inFileDuplicates.length,
    revenueDatabaseDuplicatesSkipped,
    revenueInFileDuplicatesSkipped: revenueInFileDuplicates.length,
    fuzzyMatches,
    autoCreatedPayees,
    autoCreatedCount: autoCreatedPayees.length,
    mappingStats,
    unmappedAccounts
  };
}

// Helper functions

function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatDateForDB(dateString: string): string {
  if (!dateString) return new Date().toISOString().split('T')[0];
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

function mapAccountToCategory(accountFullName: string): string | null {
  if (!accountFullName) return null;
  const normalized = accountFullName.toLowerCase().trim();
  return ACCOUNT_CATEGORY_MAP[normalized] || null;
}

function mapTransactionType(transactionType: string): string {
  if (!transactionType) return 'expense';
  const normalized = transactionType.toLowerCase().trim();
  return TRANSACTION_TYPE_MAP[normalized] || 'expense';
}

function detectInFileDuplicates(
  data: TransactionCSVRow[]
): { unique: TransactionCSVRow[]; duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> } {
  const seen = new Map<string, TransactionCSVRow>();
  const duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
  const unique: TransactionCSVRow[] = [];

  for (const row of data) {
    if (row['Transaction type']?.toLowerCase() === 'invoice') {
      unique.push(row);
      continue;
    }

    const date = formatDateForDB(row['Date']);
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const name = row['Name']?.trim() || '';
    const key = createExpenseKey(date, amount, name);

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
}

function detectRevenueInFileDuplicates(
  data: TransactionCSVRow[]
): { unique: TransactionCSVRow[]; duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> } {
  const seen = new Map<string, TransactionCSVRow>();
  const duplicates: Array<{ transaction: TransactionCSVRow; reason: string }> = [];
  const unique: TransactionCSVRow[] = [];

  for (const row of data) {
    if (row['Transaction type']?.toLowerCase() !== 'invoice') {
      unique.push(row);
      continue;
    }

    const date = formatDateForDB(row['Date']);
    const amount = parseFloat(row['Amount']?.replace(/[,$]/g, '') || '0');
    const name = row['Name']?.trim() || '';
    const invoiceNumber = row['Invoice #']?.trim() || '';
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
}

function detectPayeeTypeFromAccount(accountPath?: string): string {
  if (!accountPath) return 'other';
  const lowerAccount = accountPath.toLowerCase();

  if (lowerAccount.includes('contract labor') || lowerAccount.includes('subcontractor')) {
    return 'subcontractor';
  }
  if (lowerAccount.includes('materials') || lowerAccount.includes('supplies')) {
    return 'material_supplier';
  }
  if (lowerAccount.includes('equipment') || lowerAccount.includes('rental')) {
    return 'equipment_rental';
  }
  if (lowerAccount.includes('permit') || lowerAccount.includes('license')) {
    return 'permit_authority';
  }

  return 'other';
}

async function createPayeeFromTransaction(
  supabase: SupabaseClient,
  qbName: string,
  accountPath?: string
): Promise<string | null> {
  const payeeType = detectPayeeTypeFromAccount(accountPath);

  const payeeData = {
    payee_name: qbName,
    payee_type: payeeType,
    provides_labor: payeeType === 'subcontractor',
    provides_materials: payeeType === 'material_supplier',
    requires_1099: payeeType === 'subcontractor',
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
}

function categorizeExpense(
  description: string,
  accountPath?: string,
  dbMappings?: any[]
): string {
  // Priority 1: User-defined database mappings
  if (accountPath && dbMappings) {
    const dbMapping = dbMappings.find(m =>
      m.qb_account_full_path.toLowerCase() === accountPath.toLowerCase()
    );
    if (dbMapping) return dbMapping.app_category;
  }

  // Priority 2: Static account mapping
  if (accountPath) {
    const staticMapping = mapAccountToCategory(accountPath);
    if (staticMapping !== null) return staticMapping;
  }

  // Priority 3: Description-based categorization
  const desc = description.toLowerCase();

  if (desc.includes('labor') || desc.includes('wage') || desc.includes('payroll')) {
    return 'labor_internal';
  }
  if (desc.includes('contractor') || desc.includes('subcontractor')) {
    return 'subcontractors';
  }
  if (desc.includes('material') || desc.includes('supply') || desc.includes('lumber')) {
    return 'materials';
  }
  if (desc.includes('equipment') || desc.includes('rental') || desc.includes('tool')) {
    return 'equipment';
  }
  if (desc.includes('permit') || desc.includes('fee') || desc.includes('license')) {
    return 'permits';
  }
  if (desc.includes('management') || desc.includes('admin') || desc.includes('office')) {
    return 'management';
  }

  return 'other';
}

function createExpenseKey(date: string | Date, amount: number, name: string): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.abs(amount).toFixed(2);
  const normalizedName = (name || '').toLowerCase().trim();
  return `${dateStr}|${normalizedAmount}|${normalizedName}`;
}

function createRevenueKey(
  amount: number,
  date: string | Date,
  invoiceNumber: string,
  name: string
): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmount = Math.round(Math.abs(amount) * 100) / 100;
  const normalizedName = (name || '').toLowerCase().trim();
  const normalizedInvoice = (invoiceNumber || '').toLowerCase().trim();
  return `rev|${normalizedAmount}|${dateStr}|${normalizedInvoice}|${normalizedName}`;
}

/**
 * Fetch existing expenses by QuickBooks transaction ID
 * This is the primary duplicate detection method for QB syncs
 */
async function fetchExistingExpensesByQBId(
  supabase: SupabaseClient
): Promise<Map<string, { id: string; description: string }>> {
  const { data: existingExpenses, error } = await supabase
    .from('expenses')
    .select('id, description, quickbooks_transaction_id')
    .not('quickbooks_transaction_id', 'is', null);

  if (error) {
    console.error('Error fetching existing expenses by QB ID:', error);
    return new Map();
  }

  const qbIdMap = new Map<string, { id: string; description: string }>();
  for (const expense of existingExpenses || []) {
    if (expense.quickbooks_transaction_id) {
      qbIdMap.set(expense.quickbooks_transaction_id, {
        id: expense.id,
        description: expense.description || ''
      });
    }
  }

  return qbIdMap;
}

/**
 * Fetch existing revenues by QuickBooks transaction ID
 * This is the primary duplicate detection method for QB syncs
 */
async function fetchExistingRevenuesByQBId(
  supabase: SupabaseClient
): Promise<Map<string, { id: string; description: string }>> {
  const { data: existingRevenues, error } = await supabase
    .from('project_revenues')
    .select('id, description, quickbooks_transaction_id')
    .not('quickbooks_transaction_id', 'is', null);

  if (error) {
    console.error('Error fetching existing revenues by QB ID:', error);
    return new Map();
  }

  const qbIdMap = new Map<string, { id: string; description: string }>();
  for (const revenue of existingRevenues || []) {
    if (revenue.quickbooks_transaction_id) {
      qbIdMap.set(revenue.quickbooks_transaction_id, {
        id: revenue.id,
        description: revenue.description || ''
      });
    }
  }

  return qbIdMap;
}

/**
 * Fetch existing expenses by date range and composite key
 * This is the fallback duplicate detection method for CSV imports
 */
async function fetchExistingExpenses(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string }>> {
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
    console.error('Error fetching existing expenses:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();

  for (const expense of existingExpenses || []) {
    let extractedName = '';
    if (expense.description) {
      const descMatch = expense.description.match(/^(?:bill|check|expense)\s*-\s*(.+?)(?:\s*\(|$)/i);
      if (descMatch) {
        let extracted = descMatch[1].trim();
        extracted = extracted.replace(/\s*\([^)]*\)\s*/g, '').trim();
        extractedName = extracted || '';
      }
    }

    const payeeName = (expense.payees as any)?.payee_name || '';
    if (!extractedName && payeeName && (!expense.description || expense.description.trim() === '')) {
      extractedName = payeeName;
    }

    const normalizedDate = expense.expense_date ? 
      new Date(expense.expense_date).toISOString().split('T')[0] : 
      expense.expense_date;

    const primaryKey = createExpenseKey(normalizedDate, expense.amount, extractedName);
    existingMap.set(primaryKey, {
      id: expense.id,
      description: expense.description || ''
    });

    if (payeeName && payeeName !== extractedName) {
      const payeeKey = createExpenseKey(normalizedDate, expense.amount, payeeName);
      existingMap.set(payeeKey, {
        id: expense.id,
        description: expense.description || ''
      });
    }
  }

  return existingMap;
}

/**
 * Fetch existing revenues by date range and composite key
 * This is the fallback duplicate detection method for CSV imports
 */
async function fetchExistingRevenues(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<Map<string, { id: string; description: string }>> {
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
    console.error('Error fetching existing revenues:', error);
    return new Map();
  }

  const existingMap = new Map<string, { id: string; description: string }>();

  for (const revenue of existingRevenues || []) {
    const clientName = (revenue.clients as any)?.client_name || '';
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
}
