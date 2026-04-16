import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BucketEmptyStateProps {
  /** Total spend in this bucket that has no matching estimate line item ($0 = neutral empty) */
  unmatchedSpend: number;
  /** Bucket display name e.g. "Other" */
  bucketName: string;
}

/**
 * Rendered inside an expanded bucket that has no line items.
 *
 * Two states:
 *   - unmatchedSpend === 0: neutral "no line items" message (e.g. permits estimated but no spend yet)
 *   - unmatchedSpend > 0:   amber data-hygiene warning with dollar amount + recategorize CTA copy
 *
 * This is the surface the bucket view exists to make impossible to miss
 * (see plan, Step 1, "category exists in spend but not in estimate" handling).
 */
export function BucketEmptyState({ unmatchedSpend, bucketName }: BucketEmptyStateProps) {
  if (unmatchedSpend === 0) {
    return (
      <div className="px-3 py-4 text-sm text-muted-foreground italic">
        No line items in the estimate for {bucketName}.
      </div>
    );
  }

  return (
    <div className="flex gap-2 m-2 px-3 py-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          No matching line items in the estimate.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
          {formatCurrency(unmatchedSpend)} sits here uncategorized — recategorize the underlying expenses to track against an estimate line.
        </p>
      </div>
    </div>
  );
}
