import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Payee, PayeeType } from "@/types/payee";
import { PayeeForm } from "./PayeeForm";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PayeeSelectorMobileProps {
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

export const PayeeSelectorMobile = ({ 
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
}: PayeeSelectorMobileProps) => {
  const [open, setOpen] = useState(false);
  const [showPayeeForm, setShowPayeeForm] = useState(false);

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

  const formatPayeeType = (payeeType?: PayeeType) => {
    if (!payeeType) return 'Other';
    return payeeType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

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

  const groupPayeesByType = (payees: Payee[]) => {
    const groups = payees.reduce((acc, payee) => {
      const type = payee.payee_type || 'other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(payee);
      return acc;
    }, {} as Record<PayeeType | 'other', Payee[]>);

    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
      if (a === 'internal_labor') return -1;
      if (b === 'internal_labor') return 1;
      return formatPayeeType(a as PayeeType).localeCompare(formatPayeeType(b as PayeeType));
    });

    return sortedGroups;
  };

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
    
    const { data: updatedPayees } = await refetch();
    
    if (updatedPayees && updatedPayees.length > 0) {
      const sortedPayees = [...updatedPayees].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const newestPayee = sortedPayees[0];
      onValueChange(newestPayee.id, newestPayee.payee_name, newestPayee);
      setOpen(true);
    }
  };

  const handleAddNewPayee = () => {
    setOpen(false);
    setTimeout(() => setShowPayeeForm(true), 200);
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className={cn(required && "after:content-['*'] after:ml-0.5 after:text-destructive")}>
          {label}
        </Label>
      )}
      
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        onBlur={onBlur}
        className={cn(
          "w-full justify-between h-12 text-base",
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
      </Button>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-lg">Select Payee</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="p-4">
            <Button
              onClick={handleAddNewPayee}
              className="w-full h-12 text-base mb-4"
              variant="outline"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Payee
            </Button>

            <ScrollArea className="h-[calc(85vh-180px)]">
              <div className="space-y-6">
                {groupPayeesByType(payees).map(([type, groupPayees]) => (
                  <div key={type}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                      {formatPayeeType(type as PayeeType)}
                    </h3>
                    <div className="space-y-2">
                      {groupPayees
                        .sort((a, b) => a.payee_name.localeCompare(b.payee_name))
                        .map((payee) => (
                          <button
                            key={payee.id}
                            onClick={() => {
                              onValueChange(payee.id, payee.payee_name, payee);
                              setOpen(false);
                            }}
                            className={cn(
                              "w-full min-h-[56px] p-3 rounded-lg border-2 transition-colors text-left",
                              "active:scale-[0.98] active:bg-muted/50",
                              value === payee.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                value === payee.id
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              )}>
                                {value === payee.id && (
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-base">
                                    {formatPayeeDisplayName(payee)}
                                  </span>
                                  <Badge 
                                    variant={getPayeeTypeBadgeVariant(payee.payee_type)}
                                    className="text-xs"
                                  >
                                    {formatPayeeType(payee.payee_type)}
                                  </Badge>
                                </div>
                                {payee.payee_type === 'internal_labor' && payee.hourly_rate && (
                                  <span className="text-sm text-primary font-medium">
                                    ${payee.hourly_rate}/hr
                                  </span>
                                )}
                                {payee.email && payee.payee_type !== 'internal_labor' && (
                                  <span className="text-sm text-muted-foreground">
                                    {payee.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>

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
