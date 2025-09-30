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
