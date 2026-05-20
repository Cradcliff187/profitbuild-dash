import React from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Percent, DollarSign } from 'lucide-react';

export type DiscountType = 'percent' | 'fixed' | null;

interface DiscountInputProps {
  type: DiscountType;
  value: number;
  subtotal: number;
  onChange: (type: DiscountType, value: number) => void;
  readOnly?: boolean;
  className?: string;
}

export function computeDiscountAmount(type: DiscountType, value: number, subtotal: number): number {
  if (!type || !value || subtotal <= 0) return 0;
  if (type === 'percent') return Math.round(subtotal * (value / 100) * 100) / 100;
  return Math.min(value, subtotal);
}

export const DiscountInput: React.FC<DiscountInputProps> = ({
  type,
  value,
  subtotal,
  onChange,
  readOnly = false,
  className,
}) => {
  const computed = computeDiscountAmount(type, value, subtotal);

  if (readOnly) {
    if (!type || computed === 0) return null;
    const label = type === 'percent' ? `${value}% off` : 'Fixed';
    return (
      <div className={cn("flex items-center justify-between py-2", className)}>
        <span className="text-sm text-slate-600">Discount <span className="text-xs text-muted-foreground">({label})</span></span>
        <span className="font-mono font-semibold text-sm text-destructive">-{formatCurrency(computed)}</span>
      </div>
    );
  }

  const handleTypeChange = (next: string) => {
    if (next === '') {
      onChange(null, 0);
      return;
    }
    onChange(next as DiscountType, value || 0);
  };

  const handleValueChange = (raw: string) => {
    const parsed = parseFloat(raw);
    onChange(type, isNaN(parsed) ? 0 : Math.max(0, parsed));
  };

  return (
    <div className={cn("flex items-center justify-between py-2 gap-3", className)}>
      <span className="text-sm text-slate-600 font-medium shrink-0">Discount</span>
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          size="sm"
          value={type ?? ''}
          onValueChange={handleTypeChange}
          className="bg-muted/50 rounded-md p-0.5"
        >
          <ToggleGroupItem
            value="percent"
            aria-label="Percent discount"
            className="h-7 w-8 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <Percent className="h-3.5 w-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="fixed"
            aria-label="Fixed dollar discount"
            className="h-7 w-8 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <DollarSign className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
        {type && (
          <Input
            type="number"
            step={type === 'percent' ? '0.1' : '1'}
            min="0"
            max={type === 'percent' ? '100' : undefined}
            value={value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="0"
            className="w-20 h-7 text-xs font-mono text-right px-2"
          />
        )}
        <span className={cn(
          "font-mono font-semibold text-sm tabular-nums w-24 text-right",
          computed > 0 ? "text-destructive" : "text-muted-foreground"
        )}>
          {computed > 0 ? `-${formatCurrency(computed)}` : '—'}
        </span>
      </div>
    </div>
  );
};
