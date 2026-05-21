import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle } from 'lucide-react';

/**
 * Surfaces spend in a category that isn't yet attributed to a specific line.
 * This is the data-hygiene signal the old bucket view hid inside the header
 * total. Clicking opens the allocation sheet scoped to this category.
 */
export function UnallocatedRow({
  amount,
  hasLines = true,
  onAllocate,
  onRecategorize,
}: {
  amount: number;
  /** Does this category have any estimate/CO lines to allocate to? */
  hasLines?: boolean;
  onAllocate?: () => void;
  onRecategorize?: () => void;
}) {
  const isMobile = useIsMobile();
  if (amount <= 0) return null;

  // A category with no lines (e.g. "Other") has nothing to allocate against —
  // the only way to attribute this spend is to recategorize it into a category
  // that has lines. Offering "Allocate to lines" there is a dead end (it opens
  // a sheet that finds nothing), so swap the CTA for "Recategorize".
  const recategorizeMode = !hasLines;
  const btnClass = cn(
    'border-amber-400 text-amber-800 hover:bg-amber-100',
    isMobile ? 'h-11 w-full' : 'h-9 shrink-0',
  );

  return (
    <div className="px-3 py-3 border-b last:border-b-0 bg-amber-50/60 border-l-2 border-l-amber-400">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-amber-900">
              {formatCurrency(amount)} not assigned to a line
            </div>
            <div className="text-xs text-amber-700">
              {recategorizeMode
                ? "No estimate line in this category to allocate to. Recategorize these expenses to track them against a line."
                : "Real spend in this category that isn't attributed to a specific line yet."}
            </div>
          </div>
        </div>
        {recategorizeMode
          ? onRecategorize && (
              <Button size="sm" variant="outline" className={btnClass} onClick={onRecategorize}>
                Recategorize
              </Button>
            )
          : onAllocate && (
              <Button size="sm" variant="outline" className={btnClass} onClick={onAllocate}>
                Allocate to lines
              </Button>
            )}
      </div>
    </div>
  );
}
