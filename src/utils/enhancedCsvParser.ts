import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { Expense, ExpenseCategory, TransactionType } from '@/types/expense';
import { ProjectRevenue, CreateProjectRevenueData } from '@/types/revenue';
import { fuzzyMatchPayee, PartialPayee } from '@/utils/fuzzyPayeeMatcher';
import { Client } from '@/types/client';

// Enhanced QB transaction interface
export interface QBTransaction {
  date: string;
  transaction_type: string;
  project_wo_number: string;
  amount: string;
  name: string;
  account_name?: string;
  account_full_name?: string;
  [key: string]: any;
}

// Client matching interfaces
export interface ClientMatchInfo {
  qbName: string;
  matchedClient: Partial<Client>;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'auto';
}

// Enhanced import result with dual streams
export interface EnhancedQBImportResult {
  total: number;
  revenue_transactions: number;
  expense_transactions: number;
  successful_revenues: number;
  successful_expenses: number;
  failed_revenues: number;
  failed_expenses: number;
  
  revenues: ProjectRevenue[];
  expenses: Expense[];
  
  // Project matching
  unmatched_projects: string[];
  project_mapping_used: Array<{
    qb_project: string;
    mapped_project_id: string;
    project_name: string;
  }>;
  
  // Entity matching
  client_matches: ClientMatchInfo[];
  payee_matches: Array<{
    qbName: string;
    matchedPayee: PartialPayee;
    confidence: number;
    matchType: 'exact' | 'fuzzy' | 'auto';
  }>;
  
  low_confidence_client_matches: Array<{
    qbName: string;
    suggestions: Array<{
      client: Partial<Client>;
      confidence: number;
    }>;
  }>;
  
  low_confidence_payee_matches: Array<{
    qbName: string;
    suggestions: Array<{
      payee: PartialPayee;
      confidence: number;
    }>;
  }>;
  
  // Line item correlation
  line_item_correlations: Array<{
    expense_id: string;
    correlation_type: 'estimated' | 'quoted' | 'unplanned' | 'change_order';
    confidence_score: number;
    estimate_line_item_id?: string;
    quote_id?: string;
  }>;
  
  duplicates: Array<{
    transaction: QBTransaction;
    reason: string;
  }>;
  
  errors: string[];
}

// Robust amount parser
const parseQuickBooksAmount = (amount: string | number): number => {
  if (typeof amount === 'number') return amount;
  if (!amount || typeof amount !== 'string') return 0;
  
  const cleanAmount = amount.replace(/[,"$\s]/g, '');
  const isNegative = cleanAmount.includes('(') || cleanAmount.startsWith('-');
  const numericString = cleanAmount.replace(/[()$€£¥-]/g, '');
  const parsedAmount = parseFloat(numericString) || 0;
  
  return isNegative ? -parsedAmount : parsedAmount;
};

// Enhanced CSV parsing for QuickBooks format
export const parseEnhancedQuickBooksCSV = (file: File): Promise<{
  data: QBTransaction[];
  errors: string[];
  headers: string[];
}> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        let data = results.data as QBTransaction[];
        let errors: string[] = [];
        
        // Handle QuickBooks format - skip metadata rows
        if (data.length > 0) {
          let skipRows = 0;
          
          // Check first few rows for QuickBooks metadata
          for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            const rowValues = Object.values(row);
            const hasQuickBooksMetadata = rowValues.some(val => 
              val?.toLowerCase().includes('quickbooks') || 
              val?.toLowerCase().includes('report') ||
              (!val || val.trim() === '') // Empty row
            );
            
            if (hasQuickBooksMetadata) {
              skipRows = i + 1;
            } else {
              break; // Found actual data row
            }
          }
          
          if (skipRows > 0) {
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
          
          // Clean the data to only include valid columns
          data = data.map(row => {
            const cleanedRow: QBTransaction = {} as QBTransaction;
            headers.forEach(header => {
              if (row[header as keyof QBTransaction] !== undefined) {
                (cleanedRow as any)[header] = row[header as keyof QBTransaction];
              }
            });
            return cleanedRow;
          });
        }
        
        // Add any Papa Parse errors
        if (results.errors && results.errors.length > 0) {
          errors.push(...results.errors.map(e => e.message));
        }
        
        resolve({ data, headers, errors });
      },
      error: (error) => {
        resolve({ data: [], headers: [], errors: [error.message] });
      }
    });
  });
};

// Fuzzy match clients similar to payee matching
const fuzzyMatchClient = (qbName: string, clients: Partial<Client>[]): {
  matches: Array<{ client: Partial<Client>; confidence: number; matchType: 'exact' | 'fuzzy' }>;
  bestMatch?: { client: Partial<Client>; confidence: number; matchType: 'exact' | 'fuzzy' };
} => {
  const matches: Array<{ client: Partial<Client>; confidence: number; matchType: 'exact' | 'fuzzy' }> = [];
  
  for (const client of clients) {
    // Check for exact match
    const exactMatch = client.client_name?.toLowerCase() === qbName.toLowerCase() ||
                      client.company_name?.toLowerCase() === qbName.toLowerCase();
    
    if (exactMatch) {
      matches.push({
        client,
        confidence: 100,
        matchType: 'exact'
      });
    } else {
      // Simple fuzzy matching based on string similarity
      const clientNames = [client.client_name, client.company_name].filter(Boolean);
      let maxConfidence = 0;
      
      for (const clientName of clientNames) {
        if (clientName) {
          const similarity = calculateStringSimilarity(qbName.toLowerCase(), clientName.toLowerCase());
          maxConfidence = Math.max(maxConfidence, similarity);
        }
      }
      
      if (maxConfidence >= 40) { // 40% threshold for suggestions
        matches.push({
          client,
          confidence: maxConfidence,
          matchType: 'fuzzy'
        });
      }
    }
  }
  
  matches.sort((a, b) => b.confidence - a.confidence);
  
  const result: {
    matches: Array<{ client: Partial<Client>; confidence: number; matchType: 'exact' | 'fuzzy' }>;
    bestMatch?: { client: Partial<Client>; confidence: number; matchType: 'exact' | 'fuzzy' };
  } = { matches };
  
  if (matches.length > 0 && matches[0].confidence >= 75) {
    result.bestMatch = matches[0];
  }
  
  return result;
};

// Simple string similarity calculation
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const distance = levenshteinDistance(longer, shorter);
  return ((longer.length - distance) / longer.length) * 100;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Categorize expenses with enhanced logic
const categorizeExpense = (description: string, accountPath?: string): ExpenseCategory => {
  const desc = description.toLowerCase();
  const account = accountPath?.toLowerCase() || '';
  
  // Account-based categorization (more reliable)
  if (account.includes('contract labor') || account.includes('subcontractor')) {
    return ExpenseCategory.SUBCONTRACTOR;
  }
  if (account.includes('supplies') || account.includes('materials')) {
    return ExpenseCategory.MATERIALS;
  }
  if (account.includes('equipment') || account.includes('rental')) {
    return ExpenseCategory.EQUIPMENT;
  }
  if (account.includes('office') || desc.includes('office')) {
    return ExpenseCategory.MANAGEMENT;
  }
  if (account.includes('vehicle') || account.includes('gas') || account.includes('fuel')) {
    return 'vehicle_expenses' as ExpenseCategory;
  }
  
  // Description-based fallback
  if (desc.includes('labor') || desc.includes('wage')) {
    return ExpenseCategory.LABOR;
  }
  if (desc.includes('contractor') || desc.includes('subcontractor')) {
    return ExpenseCategory.SUBCONTRACTOR;
  }
  if (desc.includes('material') || desc.includes('supply') || desc.includes('lumber')) {
    return ExpenseCategory.MATERIALS;
  }
  if (desc.includes('equipment') || desc.includes('rental') || desc.includes('tool')) {
    return ExpenseCategory.EQUIPMENT;
  }
  if (desc.includes('permit') || desc.includes('fee')) {
    return ExpenseCategory.PERMITS;
  }
  
  return ExpenseCategory.OTHER;
};

// Map QB transaction type to internal type
const mapQBTransactionType = (qbType: string): TransactionType => {
  const type = qbType.toLowerCase().trim();
  
  if (type.includes('bill')) return 'bill';
  if (type.includes('check')) return 'check';
  if (type.includes('credit card') || type.includes('expense')) return 'credit_card';
  if (type.includes('cash')) return 'cash';
  
  return 'expense';
};

// Enhanced project matching with hierarchical number support
const matchProject = (qbProjectNumber: string, projects: Array<{ id: string; project_number: string; project_name: string }>): {
  project?: { id: string; project_number: string; project_name: string };
  isDefaultProject: boolean;
} => {
  if (!qbProjectNumber || qbProjectNumber === 'TOOLS' || qbProjectNumber === 'SPLIT') {
    // Use default project for tools/split
    const defaultProject = projects.find(p => 
      p.project_name.toLowerCase().includes('misc') || 
      p.project_name.toLowerCase().includes('general') ||
      p.project_name.toLowerCase().includes('tool')
    );
    return { project: defaultProject || projects[0], isDefaultProject: true };
  }
  
  // Try exact match first
  let matchedProject = projects.find(p => 
    p.project_number.toLowerCase() === qbProjectNumber.toLowerCase()
  );
  
  // Try hierarchical matching (e.g., QB "125-244" to internal "125-144")
  if (!matchedProject) {
    const qbParts = qbProjectNumber.split('-');
    if (qbParts.length === 2) {
      const [prefix, suffix] = qbParts;
      matchedProject = projects.find(p => {
        const projectParts = p.project_number.split('-');
        return projectParts.length === 2 && projectParts[0] === prefix;
      });
    }
  }
  
  return { project: matchedProject, isDefaultProject: false };
};

// Correlate expenses with line items and quotes
const correlateExpenseWithLineItems = async (
  expense: Expense,
  projectId: string
): Promise<{
  correlation_type: 'estimated' | 'quoted' | 'unplanned' | 'change_order';
  confidence_score: number;
  estimate_line_item_id?: string;
  quote_id?: string;
}> => {
  try {
    // Get estimate line items and quotes for the project
    const [estimateResponse, quoteResponse] = await Promise.all([
      supabase
        .from('estimate_line_items')
        .select(`
          id, category, description, total, rate,
          estimate:estimates!inner(project_id, status)
        `)
        .eq('estimate.project_id', projectId)
        .eq('estimate.status', 'approved'),
      
      supabase
        .from('quotes')
        .select('id, total_amount, payee_id')
        .eq('project_id', projectId)
        .eq('status', 'accepted')
    ]);
    
    const estimateLineItems = estimateResponse.data || [];
    const quotes = quoteResponse.data || [];
    
    // Category-based correlation (estimated)
    const categoryMatch = estimateLineItems.find(item => 
      item.category === expense.category
    );
    
    if (categoryMatch) {
      const amountSimilarity = Math.abs(expense.amount - categoryMatch.total) / Math.max(expense.amount, categoryMatch.total);
      if (amountSimilarity < 0.2) { // Within 20% of estimated amount
        return {
          correlation_type: 'estimated',
          confidence_score: Math.round((1 - amountSimilarity) * 100),
          estimate_line_item_id: categoryMatch.id
        };
      }
    }
    
    // Quote-based correlation
    const quoteMatch = quotes.find(quote => 
      quote.payee_id === expense.payee_id && 
      Math.abs(expense.amount - quote.total_amount) / Math.max(expense.amount, quote.total_amount) < 0.1
    );
    
    if (quoteMatch) {
      return {
        correlation_type: 'quoted',
        confidence_score: 90,
        quote_id: quoteMatch.id,
        estimate_line_item_id: undefined // Quote-level correlation no longer uses this field
      };
    }
    
    // Check if expense exceeds budgeted amounts (change order)
    const totalEstimated = estimateLineItems
      .filter(item => item.category === expense.category)
      .reduce((sum, item) => sum + item.total, 0);
    
    if (expense.amount > totalEstimated * 1.2) { // 20% over budget
      return {
        correlation_type: 'change_order',
        confidence_score: 70
      };
    }
    
    // Default to unplanned
    return {
      correlation_type: 'unplanned',
      confidence_score: 50
    };
    
  } catch (error) {
    console.error('Error correlating expense:', error);
    return {
      correlation_type: 'unplanned',
      confidence_score: 30
    };
  }
};

// Main enhanced import function
export const processEnhancedQuickBooksImport = async (
  transactions: QBTransaction[],
  fileName: string
): Promise<EnhancedQBImportResult> => {
  const result: EnhancedQBImportResult = {
    total: transactions.length,
    revenue_transactions: 0,
    expense_transactions: 0,
    successful_revenues: 0,
    successful_expenses: 0,
    failed_revenues: 0,
    failed_expenses: 0,
    revenues: [],
    expenses: [],
    unmatched_projects: [],
    project_mapping_used: [],
    client_matches: [],
    payee_matches: [],
    low_confidence_client_matches: [],
    low_confidence_payee_matches: [],
    line_item_correlations: [],
    duplicates: [],
    errors: []
  };

  try {
    // Load reference data
    const [projectsResponse, payeesResponse, clientsResponse] = await Promise.all([
      supabase.from('projects').select('id, project_number, project_name'),
      supabase.from('payees').select('id, payee_name, full_name'),
      supabase.from('clients').select('id, client_name, company_name')
    ]);

    const projects = projectsResponse.data || [];
    const payees = payeesResponse.data || [];
    const clients = clientsResponse.data || [];

    // Separate revenue and expense transactions
    const revenueTransactions = transactions.filter(t => 
      t.transaction_type.toLowerCase() === 'invoice'
    );
    const expenseTransactions = transactions.filter(t => 
      t.transaction_type.toLowerCase() !== 'invoice'
    );

    result.revenue_transactions = revenueTransactions.length;
    result.expense_transactions = expenseTransactions.length;

    // Process revenue transactions
    for (const transaction of revenueTransactions) {
      try {
        const amount = parseQuickBooksAmount(transaction.amount);
        const invoiceDate = new Date(transaction.date);
        
        const projectMatch = matchProject(transaction.project_wo_number, projects);
        if (!projectMatch.project) {
          result.unmatched_projects.push(transaction.project_wo_number);
          continue;
        }

        // Match client
        let clientId: string | undefined;
        if (transaction.name) {
          const clientMatch = fuzzyMatchClient(transaction.name, clients);
          if (clientMatch.bestMatch) {
            clientId = clientMatch.bestMatch.client.id;
            result.client_matches.push({
              qbName: transaction.name,
              matchedClient: clientMatch.bestMatch.client,
              confidence: clientMatch.bestMatch.confidence,
              matchType: clientMatch.bestMatch.matchType
            });
          } else if (clientMatch.matches.length > 0) {
            result.low_confidence_client_matches.push({
              qbName: transaction.name,
              suggestions: clientMatch.matches.slice(0, 3).map(m => ({
                client: m.client,
                confidence: m.confidence
              }))
            });
          }
        }

        const revenue: CreateProjectRevenueData = {
          project_id: projectMatch.project.id,
          amount,
          invoice_date: invoiceDate,
          description: transaction.name,
          client_id: clientId,
          account_name: transaction.account_name,
          account_full_name: transaction.account_full_name,
          quickbooks_transaction_id: `${transaction.date}-${transaction.transaction_type}-${amount}`
        };

        // Convert to database format with string dates
        const revenueForDB = {
          ...revenue,
          invoice_date: invoiceDate.toISOString().split('T')[0]
        };

        // Save to database
        const { data: insertedRevenue, error } = await supabase
          .from('project_revenues')
          .insert([revenueForDB])
          .select()
          .single();

        if (error) throw error;

        result.revenues.push({
          ...insertedRevenue,
          invoice_date: new Date(insertedRevenue.invoice_date),
          created_at: new Date(insertedRevenue.created_at),
          updated_at: new Date(insertedRevenue.updated_at)
        });
        
        result.successful_revenues++;
        
      } catch (error) {
        result.failed_revenues++;
        result.errors.push(`Revenue transaction failed: ${error}`);
      }
    }

    // Process expense transactions
    for (const transaction of expenseTransactions) {
      try {
        const amount = Math.abs(parseQuickBooksAmount(transaction.amount)); // Ensure positive
        const expenseDate = new Date(transaction.date);
        
        const projectMatch = matchProject(transaction.project_wo_number, projects);
        if (!projectMatch.project) {
          result.unmatched_projects.push(transaction.project_wo_number);
          continue;
        }

        // Match payee
        let payeeId: string | undefined;
        if (transaction.name) {
          const payeeMatch = fuzzyMatchPayee(transaction.name, payees);
          if (payeeMatch.bestMatch) {
            payeeId = payeeMatch.bestMatch.payee.id;
            result.payee_matches.push({
              qbName: transaction.name,
              matchedPayee: payeeMatch.bestMatch.payee,
              confidence: payeeMatch.bestMatch.confidence,
              matchType: payeeMatch.bestMatch.matchType
            });
          } else if (payeeMatch.matches.length > 0) {
            result.low_confidence_payee_matches.push({
              qbName: transaction.name,
              suggestions: payeeMatch.matches.slice(0, 3).map(m => ({
                payee: m.payee,
                confidence: m.confidence
              }))
            });
          }
        }

        const category = categorizeExpense(transaction.name, transaction.account_full_name);
        const transactionType = mapQBTransactionType(transaction.transaction_type);

        const expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'> = {
          project_id: projectMatch.project.id,
          description: transaction.name,
          category,
          transaction_type: transactionType,
          amount,
          expense_date: expenseDate,
          payee_id: payeeId,
          account_name: transaction.account_name,
          account_full_name: transaction.account_full_name,
          is_planned: false
        };

        // Convert to database format with string dates
        const expenseForDB = {
          ...expense,
          expense_date: expenseDate.toISOString().split('T')[0]
        };

        // Save to database
        const { data: insertedExpense, error } = await supabase
          .from('expenses')
          .insert([expenseForDB])
          .select()
          .single();

        if (error) throw error;

        const fullExpense: Expense = {
          ...insertedExpense,
          category: insertedExpense.category as ExpenseCategory,
          expense_date: new Date(insertedExpense.expense_date),
          created_at: new Date(insertedExpense.created_at),
          updated_at: new Date(insertedExpense.updated_at)
        };

        result.expenses.push(fullExpense);

        // Correlate with line items
        const correlation = await correlateExpenseWithLineItems(fullExpense, projectMatch.project.id);
        result.line_item_correlations.push({
          expense_id: fullExpense.id,
          ...correlation
        });

        result.successful_expenses++;
        
      } catch (error) {
        result.failed_expenses++;
        result.errors.push(`Expense transaction failed: ${error}`);
      }
    }

    // Track unique project mappings
    result.project_mapping_used = Array.from(new Set(
      [...result.revenues, ...result.expenses].map(item => item.project_id)
    )).map(projectId => {
      const project = projects.find(p => p.id === projectId);
      return {
        qb_project: 'Various', // Could be enhanced to track specific QB project numbers
        mapped_project_id: projectId,
        project_name: project?.project_name || 'Unknown'
      };
    });

  } catch (error) {
    result.errors.push(`Import failed: ${error}`);
  }

  return result;
};