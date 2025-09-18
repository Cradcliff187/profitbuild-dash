import Papa from 'papaparse';
import { CSVRow, ColumnMapping, Expense, ExpenseCategory, TransactionType } from '@/types/expense';
import { QuickBooksAccountMapping } from '@/types/quickbooks';
import { PayeeType } from '@/types/payee';
import { supabase } from '@/integrations/supabase/client';
import { fuzzyMatchPayee, PartialPayee } from '@/utils/fuzzyPayeeMatcher';
import { QB_ACCOUNT_MAPPING, resolveQBAccountCategory } from '@/utils/quickbooksMapping';

// Robust amount parser for QuickBooks and other CSV formats
const parseQuickBooksAmount = (amount: string | number): number => {
  if (typeof amount === 'number') return amount;
  if (!amount || typeof amount !== 'string') return 0;
  
  const cleanAmount = amount.replace(/[,"$\s]/g, ''); // Remove quotes, commas, currency, spaces
  const isNegative = cleanAmount.includes('(') || cleanAmount.startsWith('-');
  const numericString = cleanAmount.replace(/[()$€£¥-]/g, ''); // Remove all non-numeric except decimal
  const parsedAmount = parseFloat(numericString) || 0;
  
  return isNegative ? -parsedAmount : parsedAmount;
};

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

    // Parse amount using robust parser
    const amount = parseQuickBooksAmount(amountStr);

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
      payee_id: mapping.payee_id && row[mapping.payee_id] ? row[mapping.payee_id].trim() : undefined,
      invoice_number: undefined,
      is_planned: false,
      created_at: new Date(),
      updated_at: new Date()
    };
  });
};

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

  // Priority 2: Static QB_ACCOUNT_MAPPING
  if (accountPath) {
    const staticMapping = resolveQBAccountCategory(accountPath);
    if (staticMapping !== ExpenseCategory.OTHER) return staticMapping;
  }

  // Priority 3: Description-based categorization (existing logic)
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
    
    if (mapping.amount && row[mapping.amount]) {
      const parsedAmount = parseQuickBooksAmount(row[mapping.amount]);
      if (isNaN(parsedAmount)) {
        errors.push(`Row ${index + 1}: Invalid amount format`);
      }
    }
  });

  return errors;
};

// QuickBooks-specific interfaces
export interface QBParseResult {
  data: QBTransaction[];
  errors: string[];
  headers: string[];
}

export interface QBTransaction {
  date: string;
  transaction_type: string;
  project_wo_number: string;
  amount: string;
  name: string;
  account_path?: string;
  [key: string]: string;
}

export interface PayeeMatchInfo {
  qbName: string;
  matchedPayee: PartialPayee;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'auto';
}

export interface QBImportResult {
  total: number;
  successful: number;
  failed: number;
  expenses: Expense[];
  unmatchedProjects: string[];
  unmatchedPayees: string[];
  fuzzyMatches: PayeeMatchInfo[];
  lowConfidenceMatches: Array<{
    qbName: string;
    suggestions: Array<{
      payee: PartialPayee;
      confidence: number;
    }>;
  }>;
  duplicates: Array<{
    transaction: QBTransaction;
    reason: string;
  }>;
  duplicatesDetected: number;
  mappingStats: {
    databaseMapped: number;
    staticMapped: number;
    descriptionMapped: number;
    unmapped: number;
  };
  unmappedAccounts: string[];
  autoCreatedPayees: Array<{
    qbName: string;
    payeeId: string;
    payeeType: PayeeType;
  }>;
  autoCreatedCount: number;
  errors: string[];
}

// Auto-detect payee type from QuickBooks account path
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

// Create a new payee from QuickBooks transaction
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
    console.error('Error creating payee:', error);
    return null;
  }
};

// Detect potential duplicates in transaction data
const detectDuplicates = (transactions: QBTransaction[]) => {
  const seen = new Map<string, QBTransaction>();
  const duplicates: Array<{ transaction: QBTransaction; reason: string }> = [];
  
  return transactions.filter(transaction => {
    // Create a unique key based on date, amount, and name
    const key = `${transaction.date}-${transaction.amount}-${transaction.name}`.toLowerCase();
    
    if (seen.has(key)) {
      duplicates.push({
        transaction,
        reason: `Duplicate of transaction: ${seen.get(key)?.name} on ${seen.get(key)?.date}`
      });
      return false; // Filter out duplicate
    }
    
    seen.set(key, transaction);
    return true; // Keep unique transaction
  });
};

// Parse QuickBooks CSV (skip first 4 rows)
export const parseQuickBooksCSV = (file: File): Promise<QBParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        // Skip first 4 rows (QuickBooks headers)
        const dataRows = results.data.slice(4);
        
        // Assume the 5th row contains column headers
        const headers = dataRows[0] as string[];
        const actualData = dataRows.slice(1);

        // Map to QB transaction format
        const transactions: QBTransaction[] = actualData.map((row: any) => {
          const transaction: QBTransaction = {} as QBTransaction;
          headers.forEach((header, index) => {
            const cleanHeader = header.toLowerCase().trim();
            if (cleanHeader.includes('date')) {
              transaction.date = row[index] || '';
            } else if (cleanHeader.includes('type') || cleanHeader.includes('transaction')) {
              transaction.transaction_type = row[index] || '';
            } else if (cleanHeader.includes('project') || cleanHeader.includes('job') || cleanHeader.includes('wo')) {
              transaction.project_wo_number = row[index] || '';
            } else if (cleanHeader.includes('amount') || cleanHeader.includes('total')) {
              transaction.amount = row[index] || '0';
            } else if (cleanHeader.includes('name') || cleanHeader.includes('payee') || cleanHeader.includes('vendor')) {
              transaction.name = row[index] || '';
            } else if (cleanHeader.includes('account')) {
              transaction.account_path = row[index] || '';
            }
            transaction[header] = row[index] || '';
          });
          return transaction;
        });

        resolve({
          data: transactions,
          errors: results.errors.map(error => `Row ${error.row}: ${error.message}`),
          headers
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

// Map QuickBooks transaction type to our internal type
const mapQBTransactionType = (qbType: string): TransactionType => {
  const type = qbType.toLowerCase().trim();
  
  if (type.includes('bill')) return 'bill';
  if (type.includes('check')) return 'check';
  if (type.includes('credit card') || type.includes('credit_card')) return 'credit_card';
  if (type.includes('cash')) return 'cash';
  
  return 'expense'; // default
};

// Map QuickBooks transactions to expenses
export const mapQuickBooksToExpenses = async (
  transactions: QBTransaction[],
  fileName: string
): Promise<QBImportResult> => {
  // Detect and filter duplicates
  const duplicates: Array<{ transaction: QBTransaction; reason: string }> = [];
  const uniqueTransactions = detectDuplicates(transactions);
  
  // Calculate duplicates by difference
  const duplicateCount = transactions.length - uniqueTransactions.length;
  
  const result: QBImportResult = {
    total: transactions.length,
    successful: 0,
    failed: 0,
    expenses: [],
    unmatchedProjects: [],
    unmatchedPayees: [],
    fuzzyMatches: [],
    lowConfidenceMatches: [],
    duplicates,
    duplicatesDetected: duplicateCount,
    mappingStats: {
      databaseMapped: 0,
      staticMapped: 0,
      descriptionMapped: 0,
      unmapped: 0
    },
    unmappedAccounts: [],
    autoCreatedPayees: [],
    autoCreatedCount: 0,
    errors: []
  };

  try {
    // Load projects, payees, and account mappings for matching
    const [projectsResponse, payeesResponse, mappingsResponse] = await Promise.all([
      supabase.from('projects').select('id, project_number, project_name'),
      supabase.from('payees').select('id, payee_name, full_name'),
      supabase.from('quickbooks_account_mappings').select('*').eq('is_active', true)
    ]);

    const projects = projectsResponse.data || [];
    const payees = payeesResponse.data || [];
    const dbMappings = mappingsResponse.data || [];

    // Find a default project for unmatched transactions
    let defaultProject = projects.find(p => p.project_name.toLowerCase().includes('misc') || p.project_name.toLowerCase().includes('general'));
    if (!defaultProject && projects.length > 0) {
      defaultProject = projects[0]; // Use first project as fallback
    }

    if (!defaultProject) {
      result.errors.push('No projects found in database. Please create at least one project before importing.');
      return result;
    }

    for (const transaction of uniqueTransactions) {
      try {
        // Parse date
        let expense_date = new Date();
        if (transaction.date) {
          const parsedDate = new Date(transaction.date);
          if (!isNaN(parsedDate.getTime())) {
            expense_date = parsedDate;
          }
        }

        // Parse amount using robust parser
        const amount = parseQuickBooksAmount(transaction.amount);

        // Match project
        let matchedProject = defaultProject;
        if (transaction.project_wo_number) {
          const foundProject = projects.find(p => 
            p.project_number.toLowerCase() === transaction.project_wo_number.toLowerCase()
          );
          if (foundProject) {
            matchedProject = foundProject;
          } else {
            if (!result.unmatchedProjects.includes(transaction.project_wo_number)) {
              result.unmatchedProjects.push(transaction.project_wo_number);
            }
          }
        }

        // Match payee with fuzzy matching
        let payeeId: string | undefined;
        if (transaction.name) {
          const matchResult = fuzzyMatchPayee(transaction.name, payees);
          
          if (matchResult.bestMatch) {
            payeeId = matchResult.bestMatch.payee.id;
            
            // Record the match info
            result.fuzzyMatches.push({
              qbName: transaction.name,
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
              result.lowConfidenceMatches.push({
                qbName: transaction.name,
                suggestions
              });
            }
          } else {
            // No matches found - attempt to auto-create payee
            const createdPayeeId = await createPayeeFromTransaction(transaction.name, transaction.account_path);
            if (createdPayeeId) {
              payeeId = createdPayeeId;
              const payeeType = detectPayeeTypeFromAccount(transaction.account_path);
              result.autoCreatedPayees.push({
                qbName: transaction.name,
                payeeId: createdPayeeId,
                payeeType
              });
              result.autoCreatedCount++;
            } else {
              // Auto-creation failed, add to unmatched
              if (!result.unmatchedPayees.includes(transaction.name)) {
                result.unmatchedPayees.push(transaction.name);
              }
            }
          }
        }

        // Categorize with enhanced logic
        const category = categorizeExpense(
          transaction.name || '',
          transaction.account_path,
          dbMappings
        );

        // Track mapping statistics
        if (transaction.account_path && dbMappings.some(m => 
          m.qb_account_full_path.toLowerCase() === transaction.account_path!.toLowerCase()
        )) {
          result.mappingStats.databaseMapped++;
        } else if (transaction.account_path && resolveQBAccountCategory(transaction.account_path) !== ExpenseCategory.OTHER) {
          result.mappingStats.staticMapped++;
        } else if (category !== ExpenseCategory.OTHER) {
          result.mappingStats.descriptionMapped++;
        } else {
          result.mappingStats.unmapped++;
          if (transaction.account_path && !result.unmappedAccounts.includes(transaction.account_path)) {
            result.unmappedAccounts.push(transaction.account_path);
          }
        }

        // Create expense
        const expense: Expense = {
          id: crypto.randomUUID(),
          project_id: matchedProject.id,
          description: `${transaction.name || 'QB Import'} - ${transaction.transaction_type}`,
          category,
          transaction_type: mapQBTransactionType(transaction.transaction_type),
          amount,
          expense_date,
          payee_id: payeeId,
          account_name: transaction.account_path,
          is_planned: false,
          created_at: new Date(),
          updated_at: new Date()
        };

        result.expenses.push(expense);
        result.successful++;

      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to process transaction: ${error}`);
      }
    }

  } catch (error) {
    result.errors.push(`Database error: ${error}`);
  }

  return result;
};