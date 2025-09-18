import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Payee, PayeeType } from "@/types/payee";

interface PayeeSelectorProps {
  selectedPayeeId?: string;
  onSelect: (payee: Payee) => void;
  onAddNew?: () => void;
  placeholder?: string;
  label?: string;
}

export const PayeeSelector = ({ 
  selectedPayeeId, 
  onSelect,
  onAddNew, 
  placeholder = "Select a vendor...",
  label = "Vendor"
}: PayeeSelectorProps) => {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("payees")
        .select("*")
        .eq("is_active", true)
        .order("payee_name");

      if (error) throw error;
      setPayees(data as Payee[] || []);
    } catch (error) {
      console.error("Error fetching payees:", error);
      toast({
        title: "Error",
        description: "Failed to load payees",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayees();
  }, []);

  // Helper function to get badge variant for payee type
  const getPayeeTypeBadgeVariant = (payeeType?: PayeeType) => {
    switch (payeeType) {
      case 'subcontractor':
        return 'default'; // blue/primary
      case 'material_supplier':
        return 'secondary'; // green
      case 'equipment_rental':
        return 'outline'; // orange/warning  
      case 'internal_labor':
        return 'default'; // purple
      case 'management':
        return 'secondary'; // gray
      case 'permit_authority':
        return 'destructive'; // red
      case 'other':
      default:
        return 'outline';
    }
  };

  // Helper function to format payee type display name
  const formatPayeeType = (payeeType?: PayeeType) => {
    if (!payeeType) return 'Other';
    return payeeType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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

  const handleValueChange = (payeeId: string) => {
    const payee = payees.find(p => p.id === payeeId);
    if (payee) {
      onSelect(payee);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {onAddNew && (
          <Button variant="outline" size="sm" onClick={onAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        )}
      </div>
      
      <Select
        value={selectedPayeeId || ""}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading payees..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {payees.length === 0 && !isLoading ? (
            <SelectItem value="no-payees" disabled>
              No payees available
            </SelectItem>
          ) : (
            groupPayeesByType(payees).map(([type, groupPayees]) => (
              <SelectGroup key={type}>
                <SelectLabel className="px-2 py-1.5 text-sm font-semibold">
                  {formatPayeeType(type as PayeeType)}
                </SelectLabel>
                {groupPayees
                  .sort((a, b) => a.payee_name.localeCompare(b.payee_name))
                  .map((payee) => (
                    <SelectItem key={payee.id} value={payee.id}>
                      <div className="flex flex-col w-full">
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
                    </SelectItem>
                  ))
                }
              </SelectGroup>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};