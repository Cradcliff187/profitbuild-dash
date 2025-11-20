import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { PayeeForm } from '@/components/PayeeForm';
import { PayeeType, Payee } from '@/types/payee';
import { Plus, Search, UserCog } from 'lucide-react';
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
}

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
}: PayeeSelectorProps) {
  const [showPayeeForm, setShowPayeeForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);

  const { data: payees, isLoading } = useQuery({
    queryKey: ['payees', filterInternal, filterLabor, filterPayeeTypes],
    queryFn: async () => {
      let query = supabase
        .from('payees')
        .select('*')
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

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Query usage statistics if sortByUsage is enabled
  const { data: usageStats } = useQuery({
    queryKey: ['payee-usage-stats', usageSource],
    queryFn: async () => {
      if (!sortByUsage) return null;
      
      const { data, error } = await supabase
        .from('receipts')
        .select('payee_id')
        .not('payee_id', 'is', null);
      
      if (error) throw error;
      
      // Count occurrences of each payee
      const counts: Record<string, number> = {};
      data?.forEach(item => {
        counts[item.payee_id] = (counts[item.payee_id] || 0) + 1;
      });
      
      return counts;
    },
    enabled: sortByUsage === true,
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

  const selectedPayee = payees?.find(p => p.id === value);

  // Filter payees based on search query and sort by usage if enabled
  const filteredPayees = useMemo(() => {
    if (!payees) return [];
    
    let result = payees;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(payee => 
        payee.payee_name.toLowerCase().includes(query) ||
        (payee.email && payee.email.toLowerCase().includes(query)) ||
        (payee.payee_type && formatPayeeType(payee.payee_type as PayeeType).toLowerCase().includes(query))
      );
    }
    
    // Apply usage-based sorting
    if (sortByUsage && usageStats) {
      result = [...result].sort((a, b) => {
        const aCount = usageStats[a.id] || 0;
        const bCount = usageStats[b.id] || 0;
        
        // Sort by usage count (descending), then alphabetically
        if (bCount !== aCount) {
          return bCount - aCount;
        }
        return a.payee_name.localeCompare(b.payee_name);
      });
    }
    
    return result;
  }, [payees, searchQuery, sortByUsage, usageStats]);

  const handlePayeeCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['payees'] });
    setShowPayeeForm(false);
  };

  return (
    <div className={cn(showLabel && "space-y-2")}>
      {label && (showLabel !== false) && (
        <Label className={cn(compact ? 'text-xs' : 'text-sm', required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          {label}
        </Label>
      )}
      
      <div className="flex gap-2">
        <Select
          value={value}
          onValueChange={(val) => {
            const payee = payees?.find(p => p.id === val);
            onValueChange(val, payee?.payee_name, payee as Payee);
          }}
        >
          <SelectTrigger 
            className={cn("flex-1", compact ? 'h-8 text-xs' : 'h-9 text-sm', error && "border-destructive")}
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
          <SelectContent>
            {/* Search Input INSIDE Dropdown */}
            <div className="flex items-center border-b px-3 pb-2 pt-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input
                placeholder="Search payees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>

            {isLoading ? (
              <SelectItem value="__loading__" disabled>Loading payees...</SelectItem>
            ) : filteredPayees.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No payees match your search' : 'No payees found'}
              </div>
            ) : (
              filteredPayees.map((payee) => (
                <SelectItem 
                  key={payee.id} 
                  value={payee.id}
                  className={compact ? 'text-xs' : 'text-sm'}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{payee.payee_name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={getPayeeTypeBadgeVariant(payee.payee_type as PayeeType)} className="h-4 text-[10px] px-1">
                        {formatPayeeType(payee.payee_type as PayeeType)}
                      </Badge>
                      {payee.is_internal && (
                        <Badge variant="outline" className="h-4 text-[10px] px-1">Int</Badge>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {/* Add New Payee Button */}
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={() => setShowPayeeForm(true)}
          className={cn(compact && "h-8 text-xs px-3")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      {/* Create Payee Sheet */}
      <Sheet open={showPayeeForm} onOpenChange={setShowPayeeForm}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
          <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
            <SheetTitle>Add New Payee</SheetTitle>
            <SheetDescription>
              Create a new payee for expenses, invoices, and payments.
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <PayeeForm
              onSuccess={handlePayeeCreated}
              onCancel={() => setShowPayeeForm(false)}
              defaultPayeeType={defaultPayeeType}
              defaultProvidesLabor={defaultProvidesLabor}
              defaultIsInternal={defaultIsInternal}
              isSubmittingRef={isSubmittingRef}
            />
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPayeeForm(false)}
              disabled={isSubmittingRef.current}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="payee-form"
              disabled={isSubmittingRef.current}
            >
              {isSubmittingRef.current ? "Saving..." : "Add Payee"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
