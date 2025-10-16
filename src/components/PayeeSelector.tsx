import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Payee, PayeeType } from "@/types/payee";
import { PayeeForm } from "./PayeeForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { PayeeSelectorMobile } from "./PayeeSelectorMobile";

interface PayeeSelectorProps {
  value?: string;
  onValueChange: (payeeId: string, payeeName?: string, payee?: Payee) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  label?: string;
  showLabel?: boolean;
  filterInternal?: boolean;
  filterLabor?: boolean;
  defaultPayeeType?: PayeeType;
  defaultIsInternal?: boolean;
  defaultProvidesLabor?: boolean;
}

export const PayeeSelector = ({ 
  value, 
  onValueChange,
  onBlur,
  placeholder = "Select a payee...",
  required = false,
  error = "",
  label = "Payee",
  showLabel = true,
  filterInternal = false,
  filterLabor = false,
  defaultPayeeType,
  defaultIsInternal,
  defaultProvidesLabor
}: PayeeSelectorProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [showPayeeForm, setShowPayeeForm] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!open) setSearchValue("");
  }, [open]);

  // Prevent hydration mismatch while detecting screen size
  if (isMobile === undefined) {
    return null;
  }

  // Use mobile-optimized drawer on small screens
  if (isMobile) {
    return (
      <PayeeSelectorMobile
        value={value}
        onValueChange={onValueChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        error={error}
        label={label}
        showLabel={showLabel}
        filterInternal={filterInternal}
        filterLabor={filterLabor}
        defaultPayeeType={defaultPayeeType}
        defaultIsInternal={defaultIsInternal}
        defaultProvidesLabor={defaultProvidesLabor}
      />
    );
  }

  const { data: payees = [], refetch } = useQuery({
    queryKey: ["payees", filterInternal, filterLabor],
    queryFn: async () => {
      let query = supabase
        .from("payees")
        .select("*")
        .eq("is_active", true);
      
      if (filterInternal) {
        query = query.eq("is_internal", true);
      }
      if (filterLabor) {
        query = query.eq("provides_labor", true);
      }
      
      const { data, error } = await query.order("payee_name");
      
      if (error) throw error;
      return data as Payee[];
    },
  });

  // Helper function to format payee type display name
  const formatPayeeType = (payeeType?: PayeeType) => {
    if (!payeeType) return 'Other';
    return payeeType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Helper function to get badge variant for payee type
  const getPayeeTypeBadgeVariant = (payeeType?: PayeeType) => {
    switch (payeeType) {
      case 'subcontractor':
        return 'default';
      case 'material_supplier':
        return 'secondary';
      case 'equipment_rental':
        return 'outline';
      case 'internal_labor':
        return 'default';
      case 'management':
        return 'secondary';
      case 'permit_authority':
        return 'destructive';
      case 'other':
      default:
        return 'outline';
    }
  };

  // Helper function to group payees by type
  const groupPayeesByType = (payees: Payee[]) => {
    const groups = payees.reduce((acc, payee) => {
      const type = payee.payee_type || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(payee);
      return acc;
    }, {} as Record<PayeeType | 'other', Payee[]>);

    // Sort groups - Internal Labor first, then alphabetically
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      if (a === 'internal_labor') return -1;
      if (b === 'internal_labor') return 1;
      return formatPayeeType(a as PayeeType).localeCompare(formatPayeeType(b as PayeeType));
    });

    return sortedGroups;
  };

  // Helper function to format payee display name
  const formatPayeeDisplayName = (payee: Payee) => {
    let name = payee.payee_name;
    if (payee.payee_type === 'internal_labor') {
      name += ' (Internal)';
    }
    return name;
  };

  const selectedPayee = payees.find(payee => payee.id === value);

  const handlePayeeCreated = async () => {
    setShowPayeeForm(false);
    
    // Refetch and get the updated data
    const { data: updatedPayees } = await refetch();
    
    // Auto-select the newly created payee (the most recently created one)
    if (updatedPayees && updatedPayees.length > 0) {
      const sortedPayees = [...updatedPayees].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const newestPayee = sortedPayees[0];
      onValueChange(newestPayee.id, newestPayee.payee_name, newestPayee);
    }
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            onBlur={onBlur}
            className={cn(
              "w-full justify-between",
              error && "border-destructive"
            )}
          >
            {selectedPayee ? (
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">
                  {formatPayeeDisplayName(selectedPayee)}
                </span>
                <Badge 
                  variant={getPayeeTypeBadgeVariant(selectedPayee.payee_type)}
                  className="text-xs"
                >
                  {formatPayeeType(selectedPayee.payee_type)}
                </Badge>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popper-anchor-width] p-0 z-50">
          <Command>
            <CommandInput 
              placeholder="Search payees..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2">
                  <p className="text-sm text-muted-foreground mb-2">No payees found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPayeeForm(true);
                      setOpen(false);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Payee
                  </Button>
                </div>
              </CommandEmpty>
              <CommandItem
                onSelect={() => {
                  setShowPayeeForm(true);
                  setOpen(false);
                }}
                className="font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Payee
              </CommandItem>
              {groupPayeesByType(payees).map(([type, groupPayees]) => (
                <CommandGroup key={type} heading={formatPayeeType(type as PayeeType)}>
                  {groupPayees
                    .sort((a, b) => a.payee_name.localeCompare(b.payee_name))
                    .map((payee) => (
                      <CommandItem
                        key={payee.id}
                        value={`${payee.payee_name} ${payee.email ?? ''} ${formatPayeeType(payee.payee_type)} ${payee.hourly_rate ?? ''}`}
                        onSelect={() => {
                          onValueChange(payee.id, payee.payee_name, payee);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === payee.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 truncate">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {formatPayeeDisplayName(payee)}
                            </span>
                            <Badge 
                              variant={getPayeeTypeBadgeVariant(payee.payee_type)}
                              className="text-xs"
                            >
                              {formatPayeeType(payee.payee_type)}
                            </Badge>
                          </div>
                          <div className="flex flex-col text-xs text-muted-foreground">
                            {payee.payee_type === 'internal_labor' && payee.hourly_rate && (
                              <span className="text-primary font-medium">
                                ${payee.hourly_rate}/hr
                              </span>
                            )}
                            {payee.email && payee.payee_type !== 'internal_labor' && (
                              <span>{payee.email}</span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))
                  }
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      {showPayeeForm && (
        <PayeeForm
          onSuccess={handlePayeeCreated}
          onCancel={() => setShowPayeeForm(false)}
          defaultPayeeType={defaultPayeeType}
          defaultIsInternal={defaultIsInternal}
          defaultProvidesLabor={defaultProvidesLabor}
        />
      )}
    </div>
  );
};