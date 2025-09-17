import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Vendor } from "@/types/vendor";

interface VendorSelectorProps {
  selectedVendorId?: string;
  onSelect: (vendor: Vendor) => void;
  onAddNew?: () => void;
  placeholder?: string;
  label?: string;
}

export const VendorSelector = ({ 
  selectedVendorId, 
  onSelect, 
  onAddNew, 
  placeholder = "Select a vendor...",
  label = "Vendor"
}: VendorSelectorProps) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchVendors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("is_active", true)
        .order("vendor_name");

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleValueChange = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      onSelect(vendor);
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
        value={selectedVendorId || ""}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading vendors..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {vendors.length === 0 && !isLoading ? (
            <SelectItem value="no-vendors" disabled>
              No vendors available
            </SelectItem>
          ) : (
            vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{vendor.vendor_name}</span>
                  {vendor.email && (
                    <span className="text-xs text-muted-foreground">{vendor.email}</span>
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