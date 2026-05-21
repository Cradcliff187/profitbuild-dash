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

const EXPENSE_TO_LINE_CATEGORY: Record<ExpenseCategory, LineItemCategory[]> = {
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

export type AllocationReason =
  | 'payee_quote_match'   // expense payee matches an accepted-quote / CO line vendor
  | 'sole_category_line'  // exactly one line in the category — only place it can go
  | 'name_keyword_match'; // a word from the line description appears in the payee name

export interface AllocationSuggestion {
  lineItemId: string;
  confidence: number;
  reason: AllocationReason;
}

/**
 * Single source of truth for expense → line-item matching.
 *
 * Principle: HIGH PRECISION, LOW RECALL. Only return a suggestion when there is
 * a defensible signal pointing at ONE line. When the category has multiple lines
 * and nothing disambiguates them, return null — the caller surfaces a manual
 * picker. We never make an arbitrary guess (the old behavior pointed ambiguous
 * expenses at projectMatchingItems[0]), because a wrong allocation silently
 * corrupts per-line actuals — worse than no allocation.
 *
 * Deliberately NO amount-similarity selector: a partial progress bill on a large
 * line coincidentally matches a small line's total and would be mis-attributed.
 */
export function matchExpenseToLine(
  expense: EnhancedExpense,
  lineItems: LineItemForMatching[]
): AllocationSuggestion | null {
  const matchingCategories = EXPENSE_TO_LINE_CATEGORY[expense.category] || [];

  const candidates = lineItems.filter(item =>
    item.project_id === expense.project_id &&
    matchingCategories.includes(item.category)
  );

  if (candidates.length === 0) return null;

  // TIER 1: payee fuzzy match against quote / change-order line items.
  // The most specific signal — this exact vendor was committed to this line.
  if (expense.payee_name) {
    const payeeLineItems = candidates.filter(item =>
      (item.type === 'quote' || item.type === 'change_order') && item.payee_name
    );
    if (payeeLineItems.length > 0) {
      const lineItemPayees: PartialPayee[] = payeeLineItems.map(item => ({
        id: item.id,
        payee_name: item.payee_name!,
        full_name: item.payee_name
      }));
      const fuzzy = fuzzyMatchPayee(expense.payee_name, lineItemPayees);
      if (fuzzy.bestMatch && fuzzy.bestMatch.confidence >= 75) {
        return {
          lineItemId: fuzzy.bestMatch.payee.id,
          confidence: fuzzy.bestMatch.confidence >= 90 ? 95 : 85,
          reason: 'payee_quote_match'
        };
      }
    }
  }

  // TIER 2: sole line in the category. If there's exactly one place the expense
  // can go, that's near-certain regardless of other signals.
  if (candidates.length === 1) {
    return { lineItemId: candidates[0].id, confidence: 85, reason: 'sole_category_line' };
  }

  // TIER 3: a >=4-char word from a line description appears in the payee name,
  // and exactly one line matches that way ("Rebco Electric" -> "Electric").
  if (expense.payee_name) {
    const payeeLc = expense.payee_name.toLowerCase();
    const kwMatches = candidates.filter(item =>
      item.description
        .toLowerCase()
        .split(/\s+/)
        .some(w => w.length >= 4 && payeeLc.includes(w))
    );
    if (kwMatches.length === 1) {
      return { lineItemId: kwMatches[0].id, confidence: 65, reason: 'name_keyword_match' };
    }
  }

  // Ambiguous — multiple candidate lines, no disambiguating signal. No guess.
  return null;
}

/**
 * Candidate line items for an expense: same project, category-compatible.
 * Used by the allocation sheet to populate the manual line picker.
 */
export function lineCandidatesForExpense(
  expense: EnhancedExpense,
  lineItems: LineItemForMatching[]
): LineItemForMatching[] {
  const matchingCategories = EXPENSE_TO_LINE_CATEGORY[expense.category] || [];
  return lineItems.filter(item =>
    item.project_id === expense.project_id &&
    matchingCategories.includes(item.category)
  );
}

/** Back-compat: returns the suggested line-item id, or undefined when ambiguous. */
export function suggestLineItemAllocation(
  expense: EnhancedExpense,
  lineItems: LineItemForMatching[]
): string | undefined {
  return matchExpenseToLine(expense, lineItems)?.lineItemId;
}

/** Back-compat: returns the suggestion confidence (0 when there's no confident match). */
export function calculateMatchConfidence(
  expense: EnhancedExpense,
  lineItems: LineItemForMatching[]
): number {
  return matchExpenseToLine(expense, lineItems)?.confidence ?? 0;
}

