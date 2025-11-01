import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel as SelectGroupLabel,
  SelectSeparator,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PayeeForm } from '@/components/PayeeForm';
import { PayeeType, Payee } from '@/types/payee';
import { Plus } from 'lucide-react';

interface PayeeSelectorProps {
  value: string;
  onValueChange: (payeeId: string, payeeName?: string, payee?: Payee) => void;
  placeholder?: string;
  compact?: boolean;
  filterInternal?: boolean;
  filterLabor?: boolean;
  defaultPayeeType?: PayeeType;
  defaultProvidesLabor?: boolean;
  defaultIsInternal?: boolean;
  label?: string;
  showLabel?: boolean;
  required?: boolean;
  error?: string;
  onBlur?: () => void;
}

export function PayeeSelector({
  value,
  onValueChange,
  placeholder = 'Select payee',
  compact = false,
  filterInternal,
  filterLabor,
  defaultPayeeType,
  defaultProvidesLabor,
  defaultIsInternal,
  label,
  showLabel,
  required,
  error,
  onBlur,
}: PayeeSelectorProps) {
  const [showPayeeForm, setShowPayeeForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: payees, isLoading } = useQuery({
    queryKey: ['payees', filterInternal, filterLabor],
    queryFn: async () => {
      let query = supabase
        .from('payees')
        .select('*')
        .eq('is_active', true)
        .order('payee_name');

      if (filterInternal !== undefined) {
        query = query.eq('is_internal', filterInternal);
      }
      if (filterLabor !== undefined) {
        query = query.eq('provides_labor', filterLabor);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const formatPayeeType = (type?: PayeeType): string => {
    if (!type) return 'Other';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getPayeeTypeBadgeVariant = (type?: PayeeType) => {
    switch (type) {
      case PayeeType.SUBCONTRACTOR: return 'default';
      case PayeeType.MATERIAL_SUPPLIER: return 'secondary';
      case PayeeType.EQUIPMENT_RENTAL: return 'outline';
      case PayeeType.INTERNAL_LABOR: return 'default';
      default: return 'outline';
    }
  };

  const groupPayeesByType = () => {
    if (!payees) return {};
    return payees.reduce((acc, payee) => {
      const type = payee.payee_type || PayeeType.OTHER;
      if (!acc[type]) acc[type] = [];
      acc[type].push(payee);
      return acc;
    }, {} as Record<PayeeType, typeof payees>);
  };

  const selectedPayee = payees?.find(p => p.id === value);
  const groupedPayees = groupPayeesByType();

  const handleValueChange = (val: string) => {
    if (val === '__add_new__') {
      setShowPayeeForm(true);
    } else {
      const payee = payees?.find(p => p.id === val);
      onValueChange(val, payee?.payee_name, payee as Payee);
    }
  };

  return (
    <div className="space-y-1">
      {label && (showLabel !== false) && (
        <Label className={compact ? 'text-xs' : 'text-sm'}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <Select
        value={value}
        onValueChange={handleValueChange}
      >
        <SelectTrigger 
          className={compact ? 'h-8 text-xs' : 'h-9 text-sm'}
          onBlur={onBlur}
        >
          <SelectValue placeholder={placeholder}>
            {selectedPayee && (
              <div className="flex items-center gap-1.5">
                <span className="truncate">{selectedPayee.payee_name}</span>
                <Badge variant={getPayeeTypeBadgeVariant(selectedPayee.payee_type as PayeeType)} className="h-4 text-[10px] px-1">
                  {formatPayeeType(selectedPayee.payee_type as PayeeType)}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={compact ? 'text-xs' : 'text-sm'}>
          {isLoading ? (
            <SelectItem value="__loading__" disabled>Loading...</SelectItem>
          ) : Object.keys(groupedPayees).length === 0 ? (
            <SelectItem value="__empty__" disabled>No payees found</SelectItem>
          ) : (
            <>
              {(Object.entries(groupedPayees) as Array<[string, any[]]>).map(([type, payeeList], idx) => (
                <div key={type}>
                  {idx > 0 && <SelectSeparator />}
                  <SelectGroup>
                    <SelectGroupLabel className={compact ? 'text-[10px] py-1' : 'text-xs'}>
                      {formatPayeeType(type as PayeeType)}
                    </SelectGroupLabel>
                    {payeeList.map((payee) => (
                      <SelectItem 
                        key={payee.id} 
                        value={payee.id}
                        className={compact ? 'text-xs py-1.5' : 'text-sm'}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{payee.payee_name}</span>
                          {payee.is_internal && (
                            <span className="text-[10px] text-muted-foreground">(Internal)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </div>
              ))}
              <SelectSeparator />
              <SelectItem value="__add_new__" className={compact ? 'text-xs py-1.5' : 'text-sm'}>
                <div className="flex items-center gap-1.5">
                  <Plus className="h-3 w-3" />
                  <span>Add New Payee</span>
                </div>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      <Dialog open={showPayeeForm} onOpenChange={setShowPayeeForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Payee</DialogTitle>
          </DialogHeader>
          <PayeeForm
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['payees'] });
              setShowPayeeForm(false);
            }}
            onCancel={() => setShowPayeeForm(false)}
            defaultPayeeType={defaultPayeeType}
            defaultProvidesLabor={defaultProvidesLabor}
            defaultIsInternal={defaultIsInternal}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
