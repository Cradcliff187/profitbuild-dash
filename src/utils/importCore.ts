/**
 * Core CSV Import Utilities
 * Single source of truth for shared QuickBooks CSV import logic
 * 
 * This module consolidates common functions used across different import workflows
 * to ensure consistency in parsing, matching, and categorization.
 */

import { ExpenseCategory, TransactionType } from '@/types/expense';
import { PayeeType } from '@/types/payee';
import { jaroWinklerSimilarity, normalizeBusinessName, tokenSimilarity } from './fuzzyPayeeMatcher';
import { resolveQBAccountCategory } from './quickbooksMapping';

// Re-exports from existing utilities
export { resolveQBAccountCategory, QB_ACCOUNT_MAPPING } from './quickbooksMapping';
export { fuzzyMatchPayee, jaroWinklerSimilarity, tokenSimilarity, normalizeBusinessName } from './fuzzyPayeeMatcher';
export type { PartialPayee, FuzzyMatchResult } from './fuzzyPayeeMatcher';
export { parseCsvDateForDB, formatDateForDB } from './dateUtils';

// Type for QB account mapping (matches database schema)
export type QuickBooksAccountMapping = {
  qb_account_name: string;
  qb_account_full_path: string;
  app_category: string;
};

// Account mapping from QuickBooks account paths to expense categories
export const ACCOUNT_CATEGORY_MAP: Record<string, ExpenseCategory> = {
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
export const TRANSACTION_TYPE_MAP: Record<string, TransactionType> = {
  'bill': 'bill',
  'check': 'check',
  'expense': 'expense',
};

/**
 * Normalize an amount to a consistent string representation for use in composite keys.
 * Always returns absolute value with exactly 2 decimal places as a string.
 */
export const normalizeAmount = (amount: number): string => {
  return Math.abs(amount).toFixed(2);
};

/**
 * Robust amount parser for QuickBooks and other CSV formats
 * Handles various currency symbols and formatting conventions
 */
export const parseQuickBooksAmount = (amount: string | number): number => {
  if (typeof amount === 'number') return amount;
  if (!amount || typeof amount !== 'string') return 0;
  
  const cleanAmount = amount.replace(/[,"$\s]/g, ''); // Remove quotes, commas, currency, spaces
  const isNegative = cleanAmount.includes('(') || cleanAmount.startsWith('-');
  const numericString = cleanAmount.replace(/[()$€£¥-]/g, ''); // Remove all non-numeric except decimal
  const parsedAmount = parseFloat(numericString) || 0;
  
  return isNegative ? -parsedAmount : parsedAmount;
};

/**
 * Normalize string for matching and comparison
 * Removes all non-alphanumeric characters and converts to lowercase
 */
export const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Creates a composite key for expense matching
 * Uses normalized name (from QuickBooks) for consistency across imports
 * 
 * @param date - Transaction date
 * @param amount - Transaction amount
 * @param name - QuickBooks Name field (stable across imports)
 * @param accountFullName - Optional account full name for stronger deduplication (Phase 3)
 */
export const createExpenseKey = (
  date: string | Date,
  amount: number,
  name: string,
  accountFullName?: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmt = normalizeAmount(amount);
  const normalizedName = (name || '').toLowerCase().trim();
  const base = `${dateStr}|${normalizedAmt}|${normalizedName}`;
  return accountFullName ? `${base}|${accountFullName.toLowerCase().trim()}` : base;
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
export const createRevenueKey = (
  amount: number,
  date: string | Date,
  invoiceNumber: string,
  name: string
): string => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const normalizedAmt = normalizeAmount(amount);
  const normalizedName = (name || '').toLowerCase().trim();
  const normalizedInvoice = (invoiceNumber || '').toLowerCase().trim();
  return `rev|${normalizedAmt}|${dateStr}|${normalizedInvoice}|${normalizedName}`;
};

/**
 * Auto-detect payee type from QuickBooks account path
 * Uses keyword matching to infer the type of vendor/payee
 */
export const detectPayeeTypeFromAccount = (accountPath?: string): PayeeType => {
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
 * Maps QuickBooks account full name to expense category using static mapping
 */
export const mapAccountToCategory = (accountFullName: string): ExpenseCategory | null => {
  if (!accountFullName) return null;
  
  const normalized = accountFullName.toLowerCase().trim();
  return ACCOUNT_CATEGORY_MAP[normalized] || null;
};

/**
 * Maps QuickBooks transaction type to internal transaction type enum
 */
export const mapTransactionType = (transactionType: string): TransactionType => {
  if (!transactionType) return 'expense';
  
  const normalized = transactionType.toLowerCase().trim();
  return TRANSACTION_TYPE_MAP[normalized] || 'expense';
};

/**
 * Enhanced expense categorization with multi-tier logic
 * 
 * Priority order:
 * 1. User-defined database mappings (highest priority)
 * 2. Static ACCOUNT_CATEGORY_MAP
 * 3. resolveQBAccountCategory from quickbooksMapping
 * 4. Description-based keyword categorization
 * 5. Default fallback to OTHER
 */
export const categorizeExpense = (
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

// ==========================================
// Project Matching
// ==========================================

export interface PartialProject {
  id: string;
  project_number: string;
  project_name: string;
}

export interface ProjectAlias {
  id: string;
  project_id: string;
  alias: string;
  match_type: 'exact' | 'starts_with' | 'contains';
  is_active: boolean;
}

export interface ProjectMatchResult {
  project_id: string;
  confidence: number;
  matchType: 'exact_number' | 'exact_name' | 'alias_exact' | 'alias_starts_with' | 'alias_contains' | 'fuzzy' | 'regex';
}

/**
 * Fuzzy match a QuickBooks Project/WO# field against known projects and aliases.
 * 
 * Priority order:
 * 1. Exact match on project_number
 * 2. Exact match on project_name
 * 3. DB aliases (exact → starts_with → contains)
 * 4. Fuzzy match on project_number using Jaro-Winkler (≥85% threshold)
 * 5. Regex extraction of project number pattern (e.g. "24-001 Kitchen" → "24-001")
 * 6. Return null → UNASSIGNED
 */
export const fuzzyMatchProject = (
  qbProjectWO: string,
  projects: PartialProject[],
  aliases: ProjectAlias[]
): ProjectMatchResult | null => {
  if (!qbProjectWO || !qbProjectWO.trim()) return null;

  const normalized = qbProjectWO.trim().toLowerCase();

  // Priority 1: Exact match on project_number
  for (const p of projects) {
    if (p.project_number.toLowerCase().trim() === normalized) {
      return { project_id: p.id, confidence: 100, matchType: 'exact_number' };
    }
  }

  // Priority 2: Exact match on project_name
  for (const p of projects) {
    if (p.project_name.toLowerCase().trim() === normalized) {
      return { project_id: p.id, confidence: 100, matchType: 'exact_name' };
    }
  }

  // Priority 3: DB aliases (exact → starts_with → contains)
  const activeAliases = aliases.filter(a => a.is_active);

  // 3a: Exact alias match
  for (const alias of activeAliases) {
    if (alias.match_type === 'exact' && normalized === alias.alias.toLowerCase().trim()) {
      return { project_id: alias.project_id, confidence: 95, matchType: 'alias_exact' };
    }
  }

  // 3b: starts_with alias match
  const normalizedAlphaNum = normalized.replace(/[^a-z0-9]/g, '');
  for (const alias of activeAliases) {
    if (alias.match_type === 'starts_with' && normalizedAlphaNum.startsWith(alias.alias.toLowerCase().trim())) {
      return { project_id: alias.project_id, confidence: 90, matchType: 'alias_starts_with' };
    }
  }

  // 3c: contains alias match
  for (const alias of activeAliases) {
    if (alias.match_type === 'contains' && normalizedAlphaNum.includes(alias.alias.toLowerCase().trim())) {
      return { project_id: alias.project_id, confidence: 85, matchType: 'alias_contains' };
    }
  }

  // Priority 4: Fuzzy match on project_number using Jaro-Winkler (≥85%)
  let bestFuzzy: { project_id: string; confidence: number } | null = null;
  for (const p of projects) {
    const similarity = jaroWinklerSimilarity(normalized, p.project_number.toLowerCase().trim()) * 100;
    if (similarity >= 85 && (!bestFuzzy || similarity > bestFuzzy.confidence)) {
      bestFuzzy = { project_id: p.id, confidence: Math.round(similarity) };
    }
  }
  if (bestFuzzy) {
    return { ...bestFuzzy, matchType: 'fuzzy' };
  }

  // Priority 5: Regex extraction of project number pattern (e.g. "24-001 Kitchen" → "24-001")
  const projectNumberPattern = qbProjectWO.match(/^(\d{2,4}[-]\d{2,4})/);
  if (projectNumberPattern) {
    const extractedNumber = projectNumberPattern[1].toLowerCase();
    for (const p of projects) {
      if (p.project_number.toLowerCase().trim() === extractedNumber) {
        return { project_id: p.id, confidence: 80, matchType: 'regex' };
      }
    }
  }

  // Priority 6: No match
  return null;
};

// ==========================================
// Client Matching
// ==========================================

export interface PartialClient {
  id: string;
  client_name: string;
  company_name?: string;
}

export interface ClientMatchResult {
  client_id: string;
  confidence: number;
  matchedField: 'client_name' | 'company_name';
}

/**
 * Fuzzy match a QuickBooks Name field against known clients.
 * Matches against both client_name and company_name using Jaro-Winkler + token similarity.
 * 
 * @returns bestMatch (auto if >=75%), suggestions (>=40%), or null
 */
export const fuzzyMatchClient = (
  qbName: string,
  clients: PartialClient[]
): { bestMatch: ClientMatchResult | null; suggestions: Array<{ client: PartialClient; confidence: number }> } => {
  if (!qbName || !qbName.trim()) return { bestMatch: null, suggestions: [] };

  const normalizedQB = normalizeBusinessName(qbName);
  const suggestions: Array<{ client: PartialClient; confidence: number }> = [];
  let bestMatch: ClientMatchResult | null = null;
  let bestConfidence = 0;

  for (const client of clients) {
    // Check client_name
    const normalizedClientName = normalizeBusinessName(client.client_name);
    
    // Exact match on normalized
    if (normalizedQB === normalizedClientName) {
      return {
        bestMatch: { client_id: client.id, confidence: 100, matchedField: 'client_name' },
        suggestions: []
      };
    }

    const jwClient = jaroWinklerSimilarity(normalizedQB, normalizedClientName) * 100;
    const tkClient = tokenSimilarity(qbName, client.client_name) * 100;
    const clientScore = Math.max(jwClient, tkClient);

    // Check company_name if available
    let companyScore = 0;
    if (client.company_name) {
      const normalizedCompany = normalizeBusinessName(client.company_name);
      if (normalizedQB === normalizedCompany) {
        return {
          bestMatch: { client_id: client.id, confidence: 100, matchedField: 'company_name' },
          suggestions: []
        };
      }
      const jwCompany = jaroWinklerSimilarity(normalizedQB, normalizedCompany) * 100;
      const tkCompany = tokenSimilarity(qbName, client.company_name) * 100;
      companyScore = Math.max(jwCompany, tkCompany);
    }

    const topScore = Math.max(clientScore, companyScore);
    const matchedField = companyScore > clientScore ? 'company_name' : 'client_name';

    if (topScore >= 40) {
      suggestions.push({ client, confidence: Math.round(topScore) });
    }

    if (topScore >= 75 && topScore > bestConfidence) {
      bestConfidence = topScore;
      bestMatch = { client_id: client.id, confidence: Math.round(topScore), matchedField };
    }
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    bestMatch,
    suggestions: bestMatch ? suggestions.filter(s => s.client.id !== bestMatch!.client_id).slice(0, 3) : suggestions.slice(0, 5)
  };
};

// ==========================================
// Category Suggestion
// ==========================================

/**
 * Suggest an expense category from a QuickBooks account full name using keyword matching.
 * Returns null if no confident suggestion can be made.
 */
export const suggestCategoryFromAccountName = (accountFullName: string): ExpenseCategory | null => {
  if (!accountFullName) return null;
  
  const lower = accountFullName.toLowerCase();
  
  // Materials-related
  if (lower.includes('dumpster') || lower.includes('disposal') || lower.includes('material') || 
      lower.includes('supply') || lower.includes('supplies') || lower.includes('lumber') || 
      lower.includes('concrete') || lower.includes('aggregate')) {
    return ExpenseCategory.MATERIALS;
  }
  
  // Equipment-related
  if (lower.includes('tool') || lower.includes('safety') || lower.includes('equipment') || 
      lower.includes('rental') || lower.includes('machinery')) {
    return ExpenseCategory.EQUIPMENT;
  }
  
  // Management/overhead
  if (lower.includes('insurance') || lower.includes('bond') || lower.includes('office') || 
      lower.includes('admin') || lower.includes('management') || lower.includes('vehicle') || 
      lower.includes('fuel') || lower.includes('gas') || lower.includes('uniform') || 
      lower.includes('rent') || lower.includes('legal') || lower.includes('accounting')) {
    return ExpenseCategory.MANAGEMENT;
  }
  
  // Labor/subcontractor
  if (lower.includes('labor') || lower.includes('wage') || lower.includes('payroll')) {
    return ExpenseCategory.LABOR;
  }
  if (lower.includes('contract') || lower.includes('subcontract')) {
    return ExpenseCategory.SUBCONTRACTOR;
  }
  
  // Permits
  if (lower.includes('permit') || lower.includes('license') || lower.includes('fee')) {
    return ExpenseCategory.PERMITS;
  }
  
  return null;
};
