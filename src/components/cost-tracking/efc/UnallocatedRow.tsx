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
  onAllocate,
}: {
  amount: number;
  onAllocate?: () => void;
}) {
  const isMobile = useIsMobile();
  if (amount <= 0) return null;
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
              Real spend in this category that isn&apos;t attributed to a specific line yet.
            </div>
          </div>
        </div>
        {onAllocate && (
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'border-amber-400 text-amber-800 hover:bg-amber-100',
              isMobile ? 'h-11 w-full' : 'h-9 shrink-0',
            )}
            onClick={onAllocate}
          >
            Allocate to lines
          </Button>
        )}
      </div>
    </div>
  );
}
