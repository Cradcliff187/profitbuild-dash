import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface BucketEmptyStateProps {
  /** Total spend in this bucket that has no matching estimate line item ($0 = neutral empty) */
  unmatchedSpend: number;
  /** Bucket display name e.g. "Other" */
  bucketName: string;
  /**
   * When provided (and unmatchedSpend > 0), a "Recategorize these expenses" button
   * is rendered that fires this callback. Caller opens a sheet listing the expenses
   * and lets the admin bulk-move them. See CostBucketView.
   */
  onRecategorize?: () => void;
}

/**
 * Rendered inside an expanded bucket that has no line items.
 *
 * Two states:
 *   - unmatchedSpend === 0: neutral "no line items" message (e.g. permits estimated but no spend yet)
 *   - unmatchedSpend > 0:   amber data-hygiene warning with dollar amount. If the caller
 *                            passed `onRecategorize`, a CTA button is rendered that opens
 *                            the bulk-recategorize sheet. Without the callback the amber
 *                            copy renders alone (e.g. overhead/system projects where the
 *                            Rule 6a trigger would silently rewrite any change anyway).
 */
export function BucketEmptyState({ unmatchedSpend, bucketName, onRecategorize }: BucketEmptyStateProps) {
  if (unmatchedSpend === 0) {
    return (
      <div className="px-3 py-4 text-sm text-muted-foreground italic">
        No line items in the estimate for {bucketName}.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 m-2 px-3 py-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
      <div className="flex gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            No matching line items in the estimate.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
            {formatCurrency(unmatchedSpend)} sits here uncategorized
            {onRecategorize
              ? '. Move them to a category that matches an estimate line:'
              : ' — recategorize the underlying expenses to track against an estimate line.'}
          </p>
        </div>
      </div>

      {onRecategorize && (
        <Button
          variant="outline"
          size="sm"
          className="self-start ml-6 bg-white dark:bg-transparent"
          onClick={onRecategorize}
        >
          Recategorize these expenses
        </Button>
      )}
    </div>
  );
}
