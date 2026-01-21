import React from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { TableRow, TableCell } from '@/components/ui/table';

interface EstimateTotalsRowProps {
  totalCost: number;
  totalMarkup: number;
  avgMarkupPercent: number;
  subtotal: number;
  className?: string;
}

/**
 * EstimateTotalsRow - A summary row that aligns with LineItemTable columns
 * Shows aggregated totals for Cost/Unit, Markup%, Markup $, and Total columns
 */
export const EstimateTotalsRow: React.FC<EstimateTotalsRowProps> = ({
  totalCost,
  totalMarkup,
  avgMarkupPercent,
  subtotal,
  className,
}) => {
  return (
    <TableRow className={cn(
      "border-t-2 border-slate-400 bg-slate-100 hover:bg-slate-100 font-semibold",
      className
    )}>
      {/* Cat column - empty */}
      <TableCell className="p-2"></TableCell>
      
      {/* Description column - spans to include Qty and Unit */}
      <TableCell 
        colSpan={3} 
        className="p-2 text-right text-sm font-bold text-slate-700 uppercase tracking-wide"
      >
        TOTALS
      </TableCell>
      
      {/* Cost/Unit column - shows total cost */}
      <TableCell className="p-2 text-right font-mono text-sm font-bold">
        {formatCurrency(totalCost)}
      </TableCell>
      
      {/* Markup% column - shows average markup percentage */}
      <TableCell className="p-2 text-right font-mono text-sm font-bold">
        {avgMarkupPercent.toFixed(1)}%
      </TableCell>
      
      {/* Markup $ column - shows total markup amount */}
      <TableCell className="p-2 text-right font-mono text-sm font-bold">
        {formatCurrency(totalMarkup)}
      </TableCell>
      
      {/* Total column - shows subtotal */}
      <TableCell className="p-2 text-right font-mono text-base font-bold text-primary">
        {formatCurrency(subtotal)}
      </TableCell>
      
      {/* Actions column - empty */}
      <TableCell className="p-2"></TableCell>
    </TableRow>
  );
};
