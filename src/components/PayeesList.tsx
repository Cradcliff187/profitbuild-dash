import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit2, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [selectedPayees, setSelectedPayees] = useState<Payee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [servicesFilter, setServicesFilter] = useState("all");
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

  const handleSelectPayee = (payee: Payee, checked: boolean) => {
    if (checked) {
      setSelectedPayees(prev => [...prev, payee]);
    } else {
      setSelectedPayees(prev => prev.filter(p => p.id !== payee.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayees(filteredPayees);
    } else {
      setSelectedPayees([]);
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
  const isPayeeSelected = (payeeId: string) => selectedPayees.some(p => p.id === payeeId);
  const allFilteredSelected = filteredPayees.length > 0 && filteredPayees.every(p => isPayeeSelected(p.id));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading payees...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <PayeeFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        servicesFilter={servicesFilter}
        onServicesFilterChange={setServicesFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Bulk Actions */}
      <PayeeBulkActions
        selectedPayees={selectedPayees}
        onBulkDelete={handleBulkDelete}
        onBulkUpdateType={handleBulkUpdateType}
        onClearSelection={clearSelection}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payees ({filteredPayees.length})</span>
            {hasActiveFilters && (
              <Badge variant="outline" className="text-xs">
                Filtered from {payees.length} total
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center">Loading payees...</div>
          ) : filteredPayees.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {hasActiveFilters 
                ? "No payees match your current filters." 
                : "No payees found. Add your first payee to get started."
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all payees"
                    />
                  </TableHead>
                  <TableHead>Payee Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Business Info</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayees.map((payee) => (
                  <TableRow key={payee.id}>
                    <TableCell>
                      <Checkbox
                        checked={isPayeeSelected(payee.id)}
                        onCheckedChange={(checked) => handleSelectPayee(payee, !!checked)}
                        aria-label={`Select ${payee.payee_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{payee.payee_name}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>{payee.email || "-"}</TableCell>
                    <TableCell>{payee.phone_numbers || "-"}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(payee)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Payee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{payee.payee_name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(payee.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};