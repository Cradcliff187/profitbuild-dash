import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn, formatCurrency } from '@/lib/utils';
import { ExpenseCategory } from '@/types/expense';
import { EFCCategory, EFCLaborOpportunity } from '@/hooks/useProjectEFC';
import { EFCLineRow } from './EFCLineRow';
import { LaborOpportunityPanel } from './LaborOpportunityPanel';
import { UnallocatedRow } from './UnallocatedRow';

export function EFCCategorySection({
  category,
  laborOpportunity,
  defaultOpen,
  onAllocate,
  onRecategorize,
}: {
  category: EFCCategory;
  laborOpportunity: EFCLaborOpportunity | null;
  defaultOpen?: boolean;
  onAllocate?: (category: ExpenseCategory) => void;
  onRecategorize?: (category: ExpenseCategory) => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const isLabor = category.category === ExpenseCategory.LABOR;
  const hasLines = category.lines.length > 0;
  const over = category.expectedCost - category.subtotal.plan;
  const hasPlan = category.subtotal.plan > 0;

  const deltaColor =
    over > 0.005 ? 'text-destructive' : over < -0.005 ? 'text-success' : 'text-muted-foreground';

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-md">
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-muted/30 transition-colors',
            open && 'border-b'
          )}
        >
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm uppercase tracking-wide">{category.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {category.lines.length} {category.lines.length === 1 ? 'line' : 'lines'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm tabular-nums">
              <span className="text-muted-foreground">{hasPlan ? `${formatCurrency(category.subtotal.plan)} → ` : ''}</span>
              <span className="font-semibold">{formatCurrency(category.expectedCost)}</span>
            </div>
            {hasPlan && Math.abs(over) > 0.005 && (
              <div className={cn('text-xs font-medium', deltaColor)}>
                {over > 0 ? '+' : ''}{formatCurrency(over)} {over > 0 ? 'over' : 'under'}
              </div>
            )}
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="bg-muted/5">
        {isLabor && laborOpportunity && <LaborOpportunityPanel labor={laborOpportunity} />}

        {category.lines.map((line) => (
          <EFCLineRow key={line.id} line={line} />
        ))}

        <UnallocatedRow
          amount={category.unallocated}
          hasLines={hasLines}
          onAllocate={hasLines && onAllocate ? () => onAllocate(category.category) : undefined}
          onRecategorize={!hasLines && onRecategorize ? () => onRecategorize(category.category) : undefined}
        />

        {category.lines.length > 0 && (
          <div className="flex items-center gap-4 px-3 py-2 bg-muted/30 text-xs font-medium">
            <div className="flex-1">Subtotal</div>
            <div className="w-20 text-right tabular-nums text-muted-foreground">{formatCurrency(category.subtotal.plan)}</div>
            <div className="w-24 text-right tabular-nums text-muted-foreground">{category.subtotal.committed > 0 ? formatCurrency(category.subtotal.committed) : '—'}</div>
            <div className="w-24 text-right tabular-nums text-muted-foreground">{category.subtotal.actual > 0 ? formatCurrency(category.subtotal.actual) : '—'}</div>
            <div className="w-24 text-right tabular-nums font-semibold">{formatCurrency(category.expectedCost)}</div>
            <div className="w-24" />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
