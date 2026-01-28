import { format } from 'date-fns';

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Format date as "11th day of June, 2025"
 */
export function formatAgreementDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate();
  const ordinal = getOrdinalSuffix(day);
  const month = format(d, 'MMMM');
  const year = format(d, 'yyyy');
  return `${day}${ordinal} day of ${month}, ${year}`;
}

/**
 * Format date as "M/D/YYYY"
 */
export function formatProjectDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'M/d/yyyy');
}

/**
 * Format currency as "$63,323.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format project name/number as "[225-005] UC Neuro Suite 301 - UC Health"
 */
export function formatProjectNameNumber(
  projectNumber: string | null,
  projectName: string | null,
  clientName?: string | null
): string {
  const parts: string[] = [];
  if (projectNumber) parts.push(`[${projectNumber}]`);
  if (projectName) parts.push(projectName);
  if (clientName && projectName && !projectName.includes(clientName)) {
    parts.push(`- ${clientName}`);
  }
  return parts.join(' ');
}

/**
 * Format legal form for contract body e.g. "[KY] [LLC]"
 */
export function formatLegalForm(state: string, legalForm: string): string {
  return `[${state}] [${legalForm}]`;
}

/**
 * Generate unique contract number. Format: {ClientInitials}{ProjectNumber} or with suffix if duplicate.
 */
export function generateContractNumber(
  projectNumber: string,
  clientName: string,
  existingNumbers: string[]
): string {
  const initials = clientName
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 3);
  const baseNumber = `${initials}${projectNumber.replace(/-/g, '')}`;
  let candidate = baseNumber;
  let suffix = 0;
  while (existingNumbers.includes(candidate)) {
    suffix++;
    candidate = `${baseNumber}-${suffix}`;
  }
  return candidate;
}
