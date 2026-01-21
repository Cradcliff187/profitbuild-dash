import React from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';

interface EstimateSummaryCardProps {
  subtotal: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  contingencyPercent: number;
  contingencyAmount: number;
  totalWithContingency: number;
  laborCushion?: number;
  // Detailed labor breakdown props
  laborHours?: number;
  laborActualCost?: number;
  laborBillingTotal?: number;
  laborClientPrice?: number;
  laborStandardMarkup?: number;
  laborAvgActualRate?: number;
  laborAvgBillingRate?: number;
  // Cushion hours capacity props
  cushionHoursCapacity?: number;
  totalLaborCapacity?: number;
  scheduleBufferPercent?: number;
  onContingencyChange?: (percent: number) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * EstimateSummaryCard - Professional financial-style summary card
 * Shows estimate totals, contingency, and optional labor cushion in a stacked layout
 */
export const EstimateSummaryCard: React.FC<EstimateSummaryCardProps> = ({
  subtotal,
  totalCost,
  grossProfit,
  grossMarginPercent,
  contingencyPercent,
  contingencyAmount,
  totalWithContingency,
  laborCushion,
  laborHours,
  laborActualCost,
  laborBillingTotal,
  laborClientPrice,
  laborStandardMarkup,
  laborAvgActualRate,
  laborAvgBillingRate,
  cushionHoursCapacity,
  totalLaborCapacity,
  scheduleBufferPercent,
  onContingencyChange,
  readOnly = false,
  className,
}) => {
  // True profit = hidden (cushion) + visible (markup)
  const trueProfitMargin = laborCushion ? grossProfit + laborCushion : null;
  
  // True profit margin should be calculated against ACTUAL labor cost (not billing cost)
  // to show the real margin percentage on what it actually costs you
  const trueProfitPercent = trueProfitMargin && laborActualCost && laborActualCost > 0
    ? (trueProfitMargin / laborActualCost) * 100 
    : null;
  
  const laborCushionPerHour = laborAvgBillingRate && laborAvgActualRate 
    ? laborAvgBillingRate - laborAvgActualRate 
    : 0;

  return (
    <Card className={cn("border-2 border-slate-300", className)}>
      <CardHeader className="p-4 bg-slate-50 border-b-2 border-slate-300">
        <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Estimate Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {/* Main Metrics Section */}
        <div className="space-y-3">
          <SummaryRow
            label="Subtotal"
            value={formatCurrency(subtotal)}
          />
          <SummaryRow
            label="Total Estimated Cost"
            value={formatCurrency(totalCost)}
          />
          <SummaryRow
            label="Estimated Gross Profit"
            value={formatCurrency(grossProfit)}
            valueClassName={grossProfit < 0 ? "text-destructive" : "text-success"}
          />
          
          {/* Labor Opportunity - shown as separate line */}
          {laborCushion && laborCushion > 0 && (
            <SummaryRow
              label="Labor Opportunity"
              value={formatCurrency(laborCushion)}
              valueClassName="text-amber-600 font-semibold"
            />
          )}
          
          {/* Max Gross Profit Potential */}
          {trueProfitMargin !== null && (
            <div className="pt-2 border-t-2 border-slate-300">
              <SummaryRow
                label="Max Gross Profit Potential"
                value={formatCurrency(trueProfitMargin)}
                valueClassName="text-green-600 font-bold"
                labelClassName="font-semibold"
              />
            </div>
          )}
          
          <SummaryRow
            label="Estimated Gross Margin"
            value={`${grossMarginPercent.toFixed(1)}%`}
            valueClassName={
              grossMarginPercent < 0 
                ? "text-destructive" 
                : grossMarginPercent < 20 
                  ? "text-warning" 
                  : "text-success"
            }
          />
          
          {/* Max Potential Margin */}
          {trueProfitPercent !== null && laborActualCost && laborActualCost > 0 && (
            <SummaryRow
              label="Max Potential Margin"
              value={`${trueProfitPercent.toFixed(1)}%`}
              valueClassName="text-green-600 font-semibold"
            />
          )}
        </div>

        {/* Contingency Section */}
        <div className="pt-3 border-t border-slate-300">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 font-medium">
                Contingency
              </span>
              {!readOnly && onContingencyChange && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">(</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={contingencyPercent}
                    onChange={(e) => onContingencyChange(parseFloat(e.target.value) || 0)}
                    className="w-16 h-7 text-xs font-mono text-right px-2"
                  />
                  <span className="text-xs text-muted-foreground">%)</span>
                </div>
              )}
              {(readOnly || !onContingencyChange) && (
                <span className="text-xs text-muted-foreground">
                  ({contingencyPercent}%)
                </span>
              )}
            </div>
            <span className="font-mono font-semibold text-sm">
              {formatCurrency(contingencyAmount)}
            </span>
          </div>
        </div>

        {/* Final Total Section */}
        <div className="pt-3 border-t-2 border-slate-400 bg-slate-50 -mx-6 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-slate-900 uppercase tracking-wide">
              Total with Contingency
            </span>
            <span className="font-mono font-bold text-xl text-primary">
              {formatCurrency(totalWithContingency)}
            </span>
          </div>
        </div>

        {/* Labor Details (Collapsible Internal Reference) */}
        {laborCushion && laborCushion > 0 && laborHours && (
          <div className="pt-4 border-t border-slate-300">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-4 py-3 cursor-pointer hover:bg-slate-100 text-sm font-medium text-slate-700 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Labor Financial Details (Internal Reference)
              </summary>
              <div className="px-4 py-3 border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Scheduled Hours</div>
                    <div className="font-mono font-semibold">{laborHours.toFixed(1)} hrs</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Avg Billing Rate</div>
                    <div className="font-mono font-semibold">{formatCurrency(laborAvgBillingRate || 0)}/hr</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Avg Actual Cost</div>
                    <div className="font-mono font-semibold">{formatCurrency(laborAvgActualRate || 0)}/hr</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Cushion Per Hour</div>
                    <div className="font-mono font-semibold text-amber-600">{formatCurrency(laborCushionPerHour)}/hr</div>
                  </div>
                </div>
                
                {/* Hours Capacity Analysis */}
                {cushionHoursCapacity !== undefined && cushionHoursCapacity > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                      <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">
                        📊 Hours Capacity Analysis
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-800">Scheduled Hours:</span>
                          <span className="font-mono font-semibold text-amber-900">{laborHours.toFixed(1)} hrs</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-800">+ Cushion Capacity:</span>
                          <span className="font-mono font-semibold text-amber-900">
                            {cushionHoursCapacity.toFixed(1)} hrs
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-700 italic ml-4 -mt-1">
                          (Cushion covers {cushionHoursCapacity.toFixed(1)} extra hours @ actual cost)
                        </div>
                        <div className="border-t-2 border-amber-300 pt-2 mt-2 flex items-center justify-between">
                          <span className="font-semibold text-amber-900">Total Capacity:</span>
                          <div className="text-right">
                            <div className="font-mono font-bold text-base text-amber-900">
                              {totalLaborCapacity?.toFixed(1)} hrs
                            </div>
                            {scheduleBufferPercent !== undefined && (
                              <div className="text-[10px] font-mono text-amber-800">
                                ({scheduleBufferPercent.toFixed(0)}% schedule buffer)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-amber-200 text-xs text-amber-700 italic">
                        💡 You can absorb up to {totalLaborCapacity?.toFixed(1)} hours before touching markup profit
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-3 border-t border-slate-200 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Actual Cost:</span>
                    <span className="font-mono">{formatCurrency(laborActualCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Billing Base:</span>
                    <span className="font-mono">{formatCurrency(laborBillingTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Standard Markup:</span>
                    <span className="font-mono">{formatCurrency(laborStandardMarkup || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-slate-300">
                    <span className="text-slate-700">Total to Client:</span>
                    <span className="font-mono">{formatCurrency(laborClientPrice || 0)}</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * SummaryRow - Reusable row component for summary metrics
 */
interface SummaryRowProps {
  label: string;
  value: string;
  labelClassName?: string;
  valueClassName?: string;
  compact?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  value,
  labelClassName,
  valueClassName,
  compact = false,
}) => {
  return (
    <div className={cn(
      "flex items-center justify-between",
      compact ? "py-1" : "py-2",
      !compact && "border-b border-slate-200 last:border-0"
    )}>
      <span className={cn(
        "text-slate-600",
        compact ? "text-xs" : "text-sm",
        labelClassName
      )}>
        {label}
      </span>
      <span className={cn(
        "font-mono font-semibold",
        compact ? "text-xs" : "text-sm",
        valueClassName
      )}>
        {value}
      </span>
    </div>
  );
};
