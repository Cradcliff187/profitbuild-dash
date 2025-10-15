import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MoreHorizontal, Eye, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityTableTemplate } from "./EntityTableTemplate";
import { PayeeDetailsModal } from "./PayeeDetailsModal";
import { PayeeBulkActions } from "@/components/PayeeBulkActions";
import { PayeeFilters } from "@/components/PayeeFilters";
import type { Payee } from "@/types/payee";
import { PayeeType } from "@/types/payee";
import { differenceInDays } from "date-fns";

interface PayeesListProps {
  onEdit: (payee: Payee) => void;
  refresh: boolean;
  onRefreshComplete: () => void;
}

export const PayeesList = ({ onEdit, refresh, onRefreshComplete }: PayeesListProps) => {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayees, setSelectedPayees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [servicesFilter, setServicesFilter] = useState("all");
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();

  const getPayeeTypeBadgeVariant = (payeeType: string) => {
    switch (payeeType) {
      case PayeeType.SUBCONTRACTOR:
        return "default"; // blue
      case PayeeType.MATERIAL_SUPPLIER:
        return "secondary"; // green
      case PayeeType.EQUIPMENT_RENTAL:
        return "outline"; // orange  
      case PayeeType.INTERNAL_LABOR:
        return "default"; // purple
      case PayeeType.MANAGEMENT:
        return "secondary"; // gray
      case PayeeType.PERMIT_AUTHORITY:
        return "destructive"; // red
      case PayeeType.OTHER:
      default:
        return "outline";
    }
  };

  const getPayeeTypeColor = (payeeType: string) => {
    switch (payeeType) {
      case PayeeType.MATERIAL_SUPPLIER:
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800";
      case PayeeType.EQUIPMENT_RENTAL:
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800";
      case PayeeType.INTERNAL_LABOR:
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800";
      case PayeeType.MANAGEMENT:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-400 dark:border-gray-800";
      default:
        return "";
    }
  };

  const isInsuranceExpiringSoon = (expirationDate: string) => {
    if (!expirationDate) return false;
    const daysUntilExpiration = differenceInDays(new Date(expirationDate), new Date());
    return daysUntilExpiration <= 30 && daysUntilExpiration >= 0;
  };

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

  useEffect(() => {
    if (refresh) {
      fetchPayees();
      onRefreshComplete();
    }
  }, [refresh, onRefreshComplete]);

  // Filtered payees based on search and filters
  const filteredPayees = useMemo(() => {
    return payees.filter(payee => {
      // Search filter
      const matchesSearch = payee.payee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payee.phone_numbers?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const matchesType = selectedType === "all" || payee.payee_type === selectedType;
      
      // Services filter
      let matchesServices = true;
      switch (servicesFilter) {
        case "labor":
          matchesServices = !!payee.provides_labor;
          break;
        case "materials":
          matchesServices = !!payee.provides_materials;
          break;
        case "1099":
          matchesServices = !!payee.requires_1099;
          break;
        case "internal":
          matchesServices = !!payee.is_internal;
          break;
        case "permit_issuer":
          matchesServices = !!payee.permit_issuer;
          break;
        default:
          matchesServices = true;
      }
      
      return matchesSearch && matchesType && matchesServices;
    });
  }, [payees, searchTerm, selectedType, servicesFilter]);

  const handleDelete = async (payeeId: string) => {
    try {
      const { error } = await supabase
        .from("payees")
        .update({ is_active: false })
        .eq("id", payeeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payee deleted successfully",
      });

      fetchPayees();
    } catch (error) {
      console.error("Error deleting payee:", error);
      toast({
        title: "Error",
        description: "Failed to delete payee",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async (payeeIds: string[]) => {
    try {
      const { error } = await supabase
        .from("payees")
        .update({ is_active: false })
        .in("id", payeeIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${payeeIds.length} payee(s) deleted successfully`,
      });

      fetchPayees();
    } catch (error) {
      console.error("Error bulk deleting payees:", error);
      toast({
        title: "Error",
        description: "Failed to delete payees",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdateType = async (payeeIds: string[], payeeType: PayeeType) => {
    try {
      const { error } = await supabase
        .from("payees")
        .update({ payee_type: payeeType })
        .in("id", payeeIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${payeeIds.length} payee(s) updated successfully`,
      });

      fetchPayees();
    } catch (error) {
      console.error("Error bulk updating payees:", error);
      toast({
        title: "Error",
        description: "Failed to update payees",
        variant: "destructive",
      });
    }
  };

  const handleViewPayee = (payee: Payee) => {
    setSelectedPayee(payee);
    setShowDetailsModal(true);
  };

  const handleSelectPayee = (payeeId: string) => {
    if (selectedPayees.includes(payeeId)) {
      setSelectedPayees(selectedPayees.filter(id => id !== payeeId));
    } else {
      setSelectedPayees([...selectedPayees, payeeId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPayees.length === filteredPayees.length) {
      setSelectedPayees([]);
    } else {
      setSelectedPayees(filteredPayees.map(p => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedPayees([]);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setServicesFilter("all");
  };

  const hasActiveFilters = searchTerm !== "" || selectedType !== "all" || servicesFilter !== "all";

  const columns = [
    {
      key: 'payee_name',
      label: 'Payee Name',
      render: (payee: Payee) => (
        <div className="font-medium">{payee.payee_name}</div>
      )
    },
    {
      key: 'payee_type',
      label: 'Type',
      render: (payee: Payee) => (
        <Badge 
          variant={getPayeeTypeBadgeVariant(payee.payee_type)} 
          className={getPayeeTypeColor(payee.payee_type)}
        >
          {(() => {
            switch (payee.payee_type) {
              case PayeeType.SUBCONTRACTOR:
                return "Subcontractor";
              case PayeeType.MATERIAL_SUPPLIER:
                return "Material Supplier";
              case PayeeType.EQUIPMENT_RENTAL:
                return "Equipment Rental";
              case PayeeType.INTERNAL_LABOR:
                return "Internal Labor";
              case PayeeType.MANAGEMENT:
                return "Management";
              case PayeeType.PERMIT_AUTHORITY:
                return "Permit Authority";
              case PayeeType.OTHER:
                return "Other";
              default:
                return payee.payee_type || "Subcontractor";
            }
          })()}
        </Badge>
      )
    },
    {
      key: 'email',
      label: 'Email'
    },
    {
      key: 'phone_numbers',
      label: 'Phone'
    },
    {
      key: 'services',
      label: 'Services',
      render: (payee: Payee) => (
        <div className="flex gap-1 flex-wrap">
          {payee.provides_labor && (
            <Badge variant="outline" className="text-xs">Labor</Badge>
          )}
          {payee.provides_materials && (
            <Badge variant="outline" className="text-xs">Materials</Badge>
          )}
          {payee.requires_1099 && (
            <Badge variant="outline" className="text-xs">1099</Badge>
          )}
        </div>
      )
    },
    {
      key: 'business_info',
      label: 'Business Info',
      render: (payee: Payee) => (
        <div className="space-y-1 text-sm">
          {payee.license_number && (
            <div className="text-muted-foreground">License: {payee.license_number}</div>
          )}
          {payee.hourly_rate && (
            <div className={
              payee.payee_type === PayeeType.INTERNAL_LABOR 
                ? "font-medium text-primary" 
                : "text-muted-foreground"
            }>
              ${payee.hourly_rate}/hr
              {payee.payee_type === PayeeType.INTERNAL_LABOR && (
                <span className="text-xs text-muted-foreground ml-1">(Internal)</span>
              )}
            </div>
          )}
          {payee.permit_issuer && <Badge variant="secondary" className="text-xs">Permit Issuer</Badge>}
          {payee.insurance_expires && (
            <div className={`text-xs flex items-center gap-1 ${
              isInsuranceExpiringSoon(payee.insurance_expires)
                ? "text-destructive font-medium"
                : "text-muted-foreground"
            }`}>
              {isInsuranceExpiringSoon(payee.insurance_expires) && (
                <AlertTriangle className="h-3 w-3" />
              )}
              Insurance expires: {new Date(payee.insurance_expires).toLocaleDateString()}
            </div>
          )}
        </div>
      )
    }
  ];

  const renderActions = (payee: Payee) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-input-compact w-input-compact p-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleViewPayee(payee)}>
            <Eye className="h-3 w-3 mr-2" />
            View Details
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => onEdit(payee)}>
            <Edit2 className="h-3 w-3 mr-2" />
            Edit Payee
          </DropdownMenuItem>
          
          {payee.insurance_expires && isInsuranceExpiringSoon(payee.insurance_expires) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-amber-600 focus:text-amber-600 cursor-default pointer-events-none">
                <AlertTriangle className="h-3 w-3 mr-2" />
                Insurance Expiring Soon
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => handleDelete(payee.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Deactivate Payee
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="dense-spacing">
      <EntityTableTemplate
        title="Payee Directory"
        description={`Manage your payees and contractors (${filteredPayees.length} total)`}
        data={filteredPayees}
        columns={columns}
        isLoading={isLoading}
        selectedItems={selectedPayees}
        onSelectItem={handleSelectPayee}
        onSelectAll={handleSelectAll}
        renderActions={renderActions}
        filters={
          <PayeeFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            servicesFilter={servicesFilter}
            onServicesFilterChange={setServicesFilter}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            resultCount={filteredPayees.length}
          />
        }
        bulkActions={
          selectedPayees.length > 0 ? (
            <PayeeBulkActions
              selectedPayees={payees.filter(p => selectedPayees.includes(p.id))}
              onBulkDelete={handleBulkDelete}
              onBulkUpdateType={handleBulkUpdateType}
              onClearSelection={clearSelection}
            />
          ) : null
        }
        emptyMessage="No payees found. Add your first payee to get started."
        noResultsMessage="No payees match your current filters."
      />

      <PayeeDetailsModal
        payee={selectedPayee}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPayee(null);
        }}
        onEdit={(payee) => {
          setShowDetailsModal(false);
          setSelectedPayee(null);
          onEdit(payee);
        }}
        onDelete={(payeeId) => {
          setShowDetailsModal(false);
          setSelectedPayee(null);
          handleDelete(payeeId);
        }}
      />
    </div>
  );
};