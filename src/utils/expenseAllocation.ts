import { ExpenseCategory, ExpenseSplit } from '@/types/expense';
import { LineItemCategory } from '@/types/estimate';
import { ProjectCategory } from '@/types/project';
import { fuzzyMatchPayee, type PartialPayee } from '@/utils/fuzzyPayeeMatcher';

export interface LineItemForMatching {
  id: string;
  type: 'estimate' | 'quote' | 'change_order';
  source_id: string; // estimate_id, quote_id, or change_order_id
  project_id: string;
  project_name: string;
  category: LineItemCategory;
  description: string;
  total: number;
  allocated_amount: number;
  payee_name?: string; // For quotes and change orders
  change_order_number?: string;
  change_order_status?: string;
}

export interface EnhancedExpense {
  id: string;
  amount: number;
  expense_date: Date;
  description?: string;
  category: ExpenseCategory; // Expense category (equipment, gas, etc.)
  payee_id?: string;
  payee_name?: string;
  project_id: string;
  project_name?: string;
  project_number?: string;
  project_category?: ProjectCategory; // Project category (construction, overhead, system)
  match_status: 'unallocated' | 'allocated_to_estimate' | 'allocated_to_quote' | 'allocated_to_change_order';
  suggested_line_item_id?: string;
  suggested_quote_id?: string;
  confidence_score?: number;
  is_split?: boolean;
  splits?: ExpenseSplit[]; // Add splits property
}

export function suggestLineItemAllocation(expense: EnhancedExpense, lineItems: LineItemForMatching[]): string | undefined {
  const categoryMap: Record<ExpenseCategory, LineItemCategory[]> = {
    [ExpenseCategory.LABOR]: [LineItemCategory.LABOR],
    [ExpenseCategory.SUBCONTRACTOR]: [LineItemCategory.SUBCONTRACTOR],
    [ExpenseCategory.MATERIALS]: [LineItemCategory.MATERIALS],
    [ExpenseCategory.EQUIPMENT]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.PERMITS]: [LineItemCategory.PERMITS],
    [ExpenseCategory.MANAGEMENT]: [LineItemCategory.MANAGEMENT],
    [ExpenseCategory.TOOLS]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.SOFTWARE]: [LineItemCategory.MANAGEMENT],
    [ExpenseCategory.VEHICLE_MAINTENANCE]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.GAS]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.MEALS]: [LineItemCategory.MANAGEMENT],
    [ExpenseCategory.OFFICE_EXPENSES]: [LineItemCategory.MANAGEMENT],
    [ExpenseCategory.VEHICLE_EXPENSES]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.OTHER]: [LineItemCategory.OTHER]
  };

  const matchingCategories = categoryMap[expense.category] || [];
  
  // Filter to same project + matching category
  const projectMatchingItems = lineItems.filter(item => 
    item.project_id === expense.project_id && 
    matchingCategories.includes(item.category)
  );
  
  if (projectMatchingItems.length === 0) {
    return undefined;
  }
  
  // PRIORITY 1: If expense has payee, try fuzzy match on quotes/change orders
  if (expense.payee_name) {
    const payeeLineItems = projectMatchingItems.filter(item => 
      (item.type === 'quote' || item.type === 'change_order') && item.payee_name
    );
    
    if (payeeLineItems.length > 0) {
      const lineItemPayees: PartialPayee[] = payeeLineItems.map(item => ({
        id: item.id,
        payee_name: item.payee_name!,
        full_name: item.payee_name
      }));
      
      const fuzzyResult = fuzzyMatchPayee(expense.payee_name, lineItemPayees);
      
      // If high confidence payee match, suggest that quote/CO line item
      if (fuzzyResult.bestMatch && fuzzyResult.bestMatch.confidence >= 75) {
        return fuzzyResult.bestMatch.payee.id; // This is the line item ID
      }
    }
  }
  
  // PRIORITY 2: Try amount similarity within project matches
  const closestAmountMatch = projectMatchingItems.reduce((best, item) => {
    const itemTotal = item.total || 0;
    if (itemTotal === 0) return best;
    
    const percentDiff = Math.abs((expense.amount - itemTotal) / itemTotal) * 100;
    
    if (percentDiff < best.percentDiff) {
      return { item, percentDiff };
    }
    return best;
  }, { item: null as LineItemForMatching | null, percentDiff: Infinity });
  
  // If amount is within 10%, suggest that one
  if (closestAmountMatch.item && closestAmountMatch.percentDiff <= 10) {
    return closestAmountMatch.item.id;
  }
  
  // PRIORITY 3: Fallback to first category match (prefer quotes > change orders > estimates)
  const quoteMatch = projectMatchingItems.find(item => item.type === 'quote');
  if (quoteMatch) return quoteMatch.id;
  
  const coMatch = projectMatchingItems.find(item => item.type === 'change_order');
  if (coMatch) return coMatch.id;
  
  return projectMatchingItems[0].id; // Estimate fallback
}

export function calculateMatchConfidence(expense: EnhancedExpense, lineItems: LineItemForMatching[]): number {
  let confidence = 0;
  
  const categoryMap: Record<ExpenseCategory, LineItemCategory[]> = {
    [ExpenseCategory.LABOR]: [LineItemCategory.LABOR],
    [ExpenseCategory.SUBCONTRACTOR]: [LineItemCategory.SUBCONTRACTOR],
    [ExpenseCategory.MATERIALS]: [LineItemCategory.MATERIALS],
    [ExpenseCategory.EQUIPMENT]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.PERMITS]: [LineItemCategory.PERMITS],
    [ExpenseCategory.MANAGEMENT]: [LineItemCategory.MANAGEMENT],
    [ExpenseCategory.TOOLS]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.SOFTWARE]: [LineItemCategory.MANAGEMENT],
    [ExpenseCategory.VEHICLE_MAINTENANCE]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.GAS]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.MEALS]: [LineItemCategory.MANAGEMENT],
    [ExpenseCategory.OFFICE_EXPENSES]: [LineItemCategory.MANAGEMENT],
    [ExpenseCategory.VEHICLE_EXPENSES]: [LineItemCategory.EQUIPMENT],
    [ExpenseCategory.OTHER]: [LineItemCategory.OTHER]
  };

  const matchingCategories = categoryMap[expense.category] || [];
  
  // Filter to matching category line items in same project
  const projectMatchingItems = lineItems.filter(item => 
    item.project_id === expense.project_id && 
    matchingCategories.includes(item.category)
  );
  
  // Same project + same category (50 points)
  if (projectMatchingItems.length > 0) {
    confidence += 50;
  }
  
  // Payee fuzzy matching (0-30 points) - only for quotes/change orders
  if (expense.payee_name && projectMatchingItems.length > 0) {
    const payeeLineItems = projectMatchingItems.filter(item => 
      item.type === 'quote' || item.type === 'change_order'
    );
    
    if (payeeLineItems.length > 0) {
      // Build list of payees from line items
      const lineItemPayees: PartialPayee[] = payeeLineItems
        .filter(item => item.payee_name)
        .map(item => ({
          id: item.id,
          payee_name: item.payee_name!,
          full_name: item.payee_name
        }));
      
      if (lineItemPayees.length > 0) {
        const fuzzyResult = fuzzyMatchPayee(expense.payee_name, lineItemPayees);
        
        if (fuzzyResult.bestMatch) {
          const matchConfidence = fuzzyResult.bestMatch.confidence;
          if (matchConfidence >= 90) confidence += 30;
          else if (matchConfidence >= 75) confidence += 20;
          else if (matchConfidence >= 60) confidence += 10;
        }
      }
    }
  }
  
  // Amount similarity (0-15 points)
  if (projectMatchingItems.length > 0) {
    const closestAmountMatch = projectMatchingItems.reduce((best, item) => {
      const itemTotal = item.total || 0;
      if (itemTotal === 0) return best;
      
      const percentDiff = Math.abs((expense.amount - itemTotal) / itemTotal) * 100;
      
      if (percentDiff < best.percentDiff) {
        return { item, percentDiff };
      }
      return best;
    }, { item: null as LineItemForMatching | null, percentDiff: Infinity });
    
    if (closestAmountMatch.item) {
      if (closestAmountMatch.percentDiff <= 5) confidence += 15;
      else if (closestAmountMatch.percentDiff <= 10) confidence += 10;
      else if (closestAmountMatch.percentDiff <= 20) confidence += 5;
    }
  }
  
  // Description keyword matching (0-5 points)
  if (expense.description && projectMatchingItems.length > 0) {
    const expenseWords = new Set(
      expense.description
        .toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3 && !['the', 'and', 'for', 'with', 'from'].includes(word))
    );
    
    const hasDescriptionMatch = projectMatchingItems.some(item => {
      const itemWords = item.description
        .toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3);
      
      const commonWords = itemWords.filter((word: string) => expenseWords.has(word));
      return commonWords.length > 0;
    });
    
    if (hasDescriptionMatch) confidence += 5;
  }
  
  return Math.min(confidence, 100);
}

