import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | null | undefined, 
  options?: { showCents?: boolean; useAccountingFormat?: boolean }
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  
  const useAccounting = options?.useAccountingFormat !== false;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: options?.showCents === false ? 0 : 2,
    maximumFractionDigits: options?.showCents === false ? 0 : 2,
    signDisplay: 'never'
  }).format(absAmount);
  
  return useAccounting && isNegative ? `(${formatted})` : formatted;
}

export function getExpensePayeeLabel(expense: { 
  payee_name?: string | null; 
  description?: string | null;
}): string {
  if (expense.payee_name) {
    return expense.payee_name.trim();
  }
  
  if (!expense.description) {
    return 'Unknown Payee';
  }
  
  const description = expense.description.trim();
  const parts = description.split(' - ').map(p => p.trim());
  
  if (parts.length === 1) {
    return description;
  }
  
  const transactionTypes = ['expense', 'bill', 'check', 'credit card', 'credit_card', 'cash'];
  
  const filtered = parts.filter(part => 
    !transactionTypes.some(type => 
      part.toLowerCase().replace('_', ' ') === type
    )
  );
  
  return filtered.length > 0 ? filtered[0] : description;
}

/**
 * Parse a date string extracting only the date portion to avoid timezone shifts.
 * Handles both ISO format (2025-12-17T00:00:00) and space format (2025-12-17 00:00:00+00).
 * Returns a local date at midnight for the given calendar date.
 */
export function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString) return new Date();
  // Extract just the date part (YYYY-MM-DD) regardless of format
  const datePart = dateString.split('T')[0].split(' ')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}
