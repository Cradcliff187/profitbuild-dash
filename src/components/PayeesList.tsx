import { useState, useMemo, useImperativeHandle, forwardRef, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertTriangle, MoreHorizontal, Eye, Edit2, Trash2, ChevronDown, Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { PayeeForm } from "@/components/PayeeForm";
import { PayeeImportModal } from "@/components/PayeeImportModal";
import type { Payee } from "@/types/payee";
import { PayeeType } from "@/types/payee";
import { differenceInDays } from "date-fns";

interface PayeesListProps {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
}

export interface PayeesListRef {
  openNewForm: () => void;
}

export const PayeesList = forwardRef<PayeesListRef, PayeesListProps>(({ showForm, setShowForm, showImportModal, setShowImportModal }, ref) => {
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
  const [selectedPayees, setSelectedPayees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [servicesFilter, setServicesFilter] = useState("all");
  const [selectedPayee, setSelectedPayee] = useState<Payee | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);

  // Expose function to open new form (resets editingPayee)
  useImperativeHandle(ref, () => ({
    openNewForm: () => {
      setEditingPayee(null);
      setShowForm(true);
    }
  }));

  const toggleCard = (payeeId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(payeeId)) {
        newSet.delete(payeeId);
      } else {
        newSet.add(payeeId);
      }
      return newSet;
    });
  };

  const togglePayeeSelection = (payeeId: string) => {
    if (selectedPayees.includes(payeeId)) {
      setSelectedPayees(selectedPayees.filter(id => id !== payeeId));
    } else {
      setSelectedPayees([...selectedPayees, payeeId]);
    }
  };

  const getPayeeTypeLabel = (payeeType: string) => {
    switch (payeeType) {
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
        return payeeType.replace('_', ' ');
    }
  };

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

  const { data: payees = [], isLoading, error } = useQuery({
    queryKey: ["payees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payees")
        .select("*")
        .eq("is_active", true)
        .order("payee_name");
      
      if (error) throw error;
      return data as Payee[];
    },
  });

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load payees",
      variant: "destructive",
    });
  }

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

      queryClient.invalidateQueries({ queryKey: ["payees"] });
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

      queryClient.invalidateQueries({ queryKey: ["payees"] });
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

      queryClient.invalidateQueries({ queryKey: ["payees"] });
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

  const handleEditPayee = (payee: Payee) => {
    setEditingPayee(payee);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPayee(null);
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["payees"] });
    handleCloseForm();
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["payees"] });
    setShowImportModal(false);
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
          
          <DropdownMenuItem onClick={() => handleEditPayee(payee)}>
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
      {/* Desktop Table View */}
      <div className="hidden sm:block">
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
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3 pb-24 w-full max-w-full min-w-0 px-3">
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

        {/* Bulk Actions */}
        {selectedPayees.length > 0 && (
          <PayeeBulkActions
            selectedPayees={payees.filter(p => selectedPayees.includes(p.id))}
            onBulkDelete={handleBulkDelete}
            onBulkUpdateType={handleBulkUpdateType}
            onClearSelection={clearSelection}
          />
        )}

        {filteredPayees.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {payees.length === 0 ? "No payees found. Add your first payee to get started." : "No payees match your current filters."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredPayees.map((payee) => {
              const isExpanded = expandedCards.has(payee.id);
              const isInsuranceExpiring = payee.insurance_expires && isInsuranceExpiringSoon(payee.insurance_expires);

              return (
                <Card key={payee.id} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCard(payee.id)}>
                    {/* Collapsed Header */}
                    <CardHeader className="p-3 bg-gradient-to-r from-primary/5 to-transparent">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedPayees.includes(payee.id)}
                          onCheckedChange={() => togglePayeeSelection(payee.id)}
                          className="mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-medium truncate flex-1 min-w-0">
                              {payee.payee_name}
                            </CardTitle>
                            {isInsuranceExpiring && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            )}
                          </div>
                          {payee.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{payee.email}</span>
                            </div>
                          )}
                          {payee.phone_numbers && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="truncate">{payee.phone_numbers}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {/* Collapsible Trigger */}
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50 border-t"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            variant={getPayeeTypeBadgeVariant(payee.payee_type)} 
                            className="h-5 px-1.5 text-[10px]"
                          >
                            {getPayeeTypeLabel(payee.payee_type)}
                          </Badge>
                          {payee.provides_labor && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Labor</Badge>
                          )}
                          {payee.provides_materials && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Materials</Badge>
                          )}
                          {payee.is_internal && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Internal</Badge>
                          )}
                          {payee.requires_1099 && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">1099</Badge>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>

                    {/* Expanded Content */}
                    <CollapsibleContent>
                      <CardContent className="p-3 space-y-3 pt-2">
                        {/* Additional Details */}
                        {payee.billing_address && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Address</div>
                            <div className="flex items-start gap-1.5 text-xs">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              <span>{payee.billing_address}</span>
                            </div>
                          </div>
                        )}

                        {payee.license_number && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">License</div>
                            <div className="text-xs">{payee.license_number}</div>
                          </div>
                        )}

                        {payee.insurance_expires && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Insurance Expires</div>
                            <div className="text-xs">
                              {new Date(payee.insurance_expires).toLocaleDateString()}
                              {isInsuranceExpiring && (
                                <Badge variant="outline" className="ml-2 h-5 px-1.5 text-[10px] border-amber-500 text-amber-700">
                                  Expiring Soon
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedPayee(payee);
                              setShowDetailsModal(true);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1.5" />
                            View
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditPayee(payee)}
                          >
                            <Edit2 className="h-3 w-3 mr-1.5" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
          handleEditPayee(payee);
        }}
        onDelete={(payeeId) => {
          setShowDetailsModal(false);
          setSelectedPayee(null);
          handleDelete(payeeId);
        }}
      />

      {/* Edit/Add Payee Sheet */}
      {showForm && (
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
            <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
              <SheetTitle>{editingPayee ? 'Edit Payee' : 'Add New Payee'}</SheetTitle>
              <SheetDescription>
                {editingPayee 
                  ? 'Update payee information and save changes' 
                  : 'Create a new payee for expenses, invoices, and payments'}
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <PayeeForm
                payee={editingPayee || undefined}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseForm}
                isSubmittingRef={isSubmittingRef}
              />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                disabled={isSubmittingRef.current}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="payee-form"
                disabled={isSubmittingRef.current}
              >
                {isSubmittingRef.current ? "Saving..." : (editingPayee ? "Update Payee" : "Add Payee")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <PayeeImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
});