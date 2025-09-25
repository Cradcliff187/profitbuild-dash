import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | null | undefined, 
  options?: { showCents?: boolean }
): string {
  if (amount === null || amount === undefined) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: options?.showCents === false ? 0 : 2,
    maximumFractionDigits: options?.showCents === false ? 0 : 2,
  }).format(amount);
}
