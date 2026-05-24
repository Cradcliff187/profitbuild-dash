import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { QuickAddPayee } from '@/components/QuickAddPayee';
import { PayeeType, Payee } from '@/types/payee';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayeeSelectorProps {
  value: string;
  onValueChange: (payeeId: string, payeeName?: string, payee?: Payee) => void;
  placeholder?: string;
  compact?: boolean;
  filterInternal?: boolean;
  filterLabor?: boolean;
  filterPayeeTypes?: PayeeType[];
  defaultPayeeType?: PayeeType;
  defaultProvidesLabor?: boolean;
  defaultIsInternal?: boolean;
  label?: string;
  showLabel?: boolean;
  required?: boolean;
  error?: string;
  onBlur?: () => void;
  sortByUsage?: boolean;
  usageSource?: 'receipts' | 'expenses' | 'both';
  isMobile?: boolean;
}

const formatPayeeType = (type?: PayeeType): string => {
  if (!type) return 'Other';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getPayeeTypeBadgeVariant = (type?: PayeeType) => {
  switch (type) {
    case PayeeType.SUBCONTRACTOR:
      return 'default';
    case PayeeType.MATERIAL_SUPPLIER:
      return 'secondary';
    case PayeeType.EQUIPMENT_RENTAL:
      return 'outline';
    case PayeeType.INTERNAL_LABOR:
      return 'default';
    default:
      return 'outline';
  }
};

export function PayeeSelector({
  value,
  onValueChange,
  placeholder = 'Select payee',
  compact = false,
  filterInternal,
  filterLabor,
  filterPayeeTypes,
  defaultPayeeType,
  defaultProvidesLabor,
  defaultIsInternal,
  label,
  showLabel,
  required,
  error,
  onBlur,
  sortByUsage = false,
  usageSource = 'receipts',
  isMobile = false,
}: PayeeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const { data: payees = [], isLoading } = useQuery({
    queryKey: ['payees', filterInternal, filterLabor, filterPayeeTypes],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      let query = supabase
        .from('payees')
        .select('id, payee_name, email, payee_type, is_internal, provides_labor, is_active')
        .eq('is_active', true)
        .order('payee_name');

      if (filterInternal === true) {
        query = query.eq('is_internal', true).eq('provides_labor', true);
      } else if (filterInternal === false) {
        query = query.eq('is_internal', false);
      }
      if (filterLabor !== undefined) {
        query = query.eq('provides_labor', filterLabor);
      }
      if (filterPayeeTypes && filterPayeeTypes.length > 0) {
        query = query.in('payee_type', filterPayeeTypes);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      return (data || []) as Payee[];
    },
  });

  // Server-side usage ranking (replaces the old pattern of pulling every receipts row to the client).
  const { data: usageStats } = useQuery({
    queryKey: ['payee-usage-counts', usageSource],
    enabled: sortByUsage,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('get_payee_usage_counts', { p_source: usageSource });
      if (rpcError) throw rpcError;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { payee_id: string; usage_count: number }) => {
        counts[row.payee_id] = Number(row.usage_count) || 0;
      });
      return counts;
    },
  });

  const selectedPayee = payees.find((p) => p.id === value);

  const orderedPayees = useMemo(() => {
    if (!sortByUsage || !usageStats) return payees;
    return [...payees].sort((a, b) => {
      const diff = (usageStats[b.id] || 0) - (usageStats[a.id] || 0);
      return diff !== 0 ? diff : a.payee_name.localeCompare(b.payee_name);
    });
  }, [payees, sortByUsage, usageStats]);

  const handleSelect = (payee: Payee) => {
    onValueChange(payee.id, payee.payee_name, payee);
    setOpen(false);
  };

  const handleCreated = (payee: Payee) => {
    setShowQuickAdd(false);
    onValueChange(payee.id, payee.payee_name, payee);
  };

  const triggerHeight = compact ? 'h-8 text-xs' : isMobile ? 'h-12 text-base' : 'h-9 text-sm';

  return (
    <div className={cn(showLabel && 'space-y-2')}>
      {label && showLabel !== false && (
        <Label
          className={cn(
            'text-sm font-medium',
            isMobile && 'text-base',
            required && "after:content-['*'] after:ml-0.5 after:text-destructive"
          )}
        >
          {label}
        </Label>
      )}

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              onBlur={onBlur}
              className={cn('flex-1 justify-between font-normal', triggerHeight, error && 'border-destructive')}
            >
              {selectedPayee ? (
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{selectedPayee.payee_name}</span>
                  <Badge
                    variant={getPayeeTypeBadgeVariant(selectedPayee.payee_type as PayeeType)}
                    className="h-4 text-[10px] px-1 shrink-0"
                  >
                    {formatPayeeType(selectedPayee.payee_type as PayeeType)}
                  </Badge>
                </span>
              ) : (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="z-[100] p-0 bg-background border shadow-md w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[calc(100vw-1.5rem)]"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search payees..." />
              <CommandList>
                {isLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Loading payees…</div>
                ) : (
                  <>
                    <CommandEmpty>No payees found.</CommandEmpty>
                    <CommandGroup>
                      {orderedPayees.map((payee) => (
                        <CommandItem
                          key={payee.id}
                          value={`${payee.payee_name} ${payee.email ?? ''} ${formatPayeeType(payee.payee_type as PayeeType)}`}
                          onSelect={() => handleSelect(payee)}
                        >
                          <Check className={cn('mr-2 h-4 w-4 shrink-0', value === payee.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="flex items-center justify-between w-full gap-2 min-w-0">
                            <span className="truncate">{payee.payee_name}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              <Badge
                                variant={getPayeeTypeBadgeVariant(payee.payee_type as PayeeType)}
                                className="h-4 text-[10px] px-1"
                              >
                                {formatPayeeType(payee.payee_type as PayeeType)}
                              </Badge>
                              {payee.is_internal && (
                                <Badge variant="outline" className="h-4 text-[10px] px-1">
                                  Int
                                </Badge>
                              )}
                            </span>
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="outline"
          size={compact ? 'sm' : 'default'}
          onClick={() => setShowQuickAdd(true)}
          className={cn(compact && 'h-8 px-3')}
          aria-label="Add new payee"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      <QuickAddPayee
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onCreated={handleCreated}
        defaultPayeeType={defaultPayeeType}
        defaultProvidesLabor={defaultProvidesLabor}
        defaultIsInternal={defaultIsInternal}
        isMobile={isMobile}
      />
    </div>
  );
}
