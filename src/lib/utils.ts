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
