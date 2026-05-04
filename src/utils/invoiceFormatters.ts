import { format, addDays, isValid } from 'date-fns';
import { formatCurrency, formatProjectNameNumber } from '@/utils/contractFormatters';

// Re-export for ergonomic callers (formatters can be a one-stop import).
export { formatCurrency, formatProjectNameNumber };

/**
 * Format an invoice date for display: "May 4, 2026".
 */
export function formatInvoiceDateDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'MMMM d, yyyy');
}

/**
 * Format a date as ISO YYYY-MM-DD (the canonical persistence form on
 * `invoices.invoice_date` / `invoices.due_date`).
 */
export function formatInvoiceDateIso(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}

/**
 * Compute an invoice due date from an issue date + payment terms in days.
 * Defaults to NET 30 when terms are missing or unparseable.
 */
export function computeDueDate(
  invoiceDate: Date | string,
  paymentTerms?: string | null
): Date {
  const issued = typeof invoiceDate === 'string' ? new Date(invoiceDate) : invoiceDate;
  const days = parsePaymentTermsDays(paymentTerms) ?? 30;
  return addDays(issued, days);
}

/**
 * Parse a `payment_terms` text value (e.g. "Net 30", "30", "NET 45 days")
 * into a day count. Returns null if no number is found.
 */
export function parsePaymentTermsDays(terms?: string | null): number | null {
  if (!terms) return null;
  const m = terms.match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse a one-line address into street + city/state/zip pair. Mirrors the
 * heuristic used inside `generate-contract` (street suffixes + 2-letter state +
 * 5/9-digit ZIP). Returns the original string in `street` and an empty
 * `cityStateZip` when no state/zip can be parsed.
 */
export function parseAddressOneLine(addr?: string | null): {
  street: string;
  cityStateZip: string;
} {
  if (!addr) return { street: '', cityStateZip: '' };
  const cleaned = String(addr).replace(/\s+/g, ' ').trim();
  if (!cleaned) return { street: '', cityStateZip: '' };

  const stateZipMatch = cleaned.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (!stateZipMatch) {
    return { street: cleaned, cityStateZip: '' };
  }

  const state = stateZipMatch[1];
  const zip = stateZipMatch[2];
  const before = cleaned.substring(0, stateZipMatch.index!).trim();

  const streetSuffixes =
    /\b(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Circle|Cir|Parkway|Pkwy|Place|Pl|Highway|Hwy|Route|Rt)\b/i;
  const suffixMatch = before.match(streetSuffixes);

  if (suffixMatch && suffixMatch.index !== undefined) {
    const endOfStreet = suffixMatch.index + suffixMatch[0].length;
    const street = before.substring(0, endOfStreet).trim();
    const city = before.substring(endOfStreet).replace(/^[,\s]+/, '').trim();
    return {
      street,
      cityStateZip: city ? `${city}, ${state} ${zip}` : `${state} ${zip}`,
    };
  }

  // Fallback: assume last word before the state is the city.
  const parts = before.split(/\s+/);
  if (parts.length >= 2) {
    const city = parts[parts.length - 1];
    const street = parts.slice(0, -1).join(' ');
    return { street, cityStateZip: `${city}, ${state} ${zip}` };
  }

  return { street: cleaned, cityStateZip: `${state} ${zip}` };
}

/**
 * Generate the auto invoice internal reference. Format: `INV-{INITIALS}-{NNN}-{NN}`.
 *  - INITIALS = first 2-3 chars of client name (uppercase, alpha only).
 *  - NNN     = bare project number with dashes removed.
 *  - NN      = zero-padded version (1-based, derived from existing count + 1).
 *
 * `existingReferences` is the list of `internal_reference` values already on
 * other invoices for the same project; this lets us pick a non-colliding
 * suffix when re-generating for the same revenue.
 */
export function generateInvoiceInternalReference(
  clientName: string | null,
  projectNumber: string | null,
  existingReferences: string[]
): string {
  const initials = clientNameInitials(clientName);
  const projPart = (projectNumber ?? 'NEW').replace(/-/g, '');
  const base = `INV-${initials}-${projPart}`;

  // Find next free version starting from existing count + 1.
  const usedSuffixes = new Set(
    existingReferences
      .map((ref) => {
        const m = ref.match(new RegExp(`^${escapeRegExp(base)}-(\\d{2,})$`));
        return m ? parseInt(m[1], 10) : NaN;
      })
      .filter((n) => Number.isFinite(n)) as number[]
  );

  let v = 1;
  while (usedSuffixes.has(v)) v++;
  return `${base}-${String(v).padStart(2, '0')}`;
}

function clientNameInitials(name?: string | null): string {
  if (!name) return 'XX';
  const cleaned = String(name).replace(/[&,.'"\-_]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const initials = words
    .map((w) => (w[0] ?? '').toUpperCase())
    .filter((c) => /[A-Z]/.test(c))
    .join('');
  return initials.slice(0, 3) || 'XX';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
