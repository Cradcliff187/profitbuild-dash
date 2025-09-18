import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Payee } from "@/types/payee";

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
        .order("vendor_name");

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
            payees.map((payee) => (
              <SelectItem key={payee.id} value={payee.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{payee.vendor_name}</span>
                  {payee.email && (
                    <span className="text-xs text-muted-foreground">{payee.email}</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};