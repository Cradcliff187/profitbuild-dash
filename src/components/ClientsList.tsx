import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Plus, Upload, MoreHorizontal, Eye, Edit2, Trash2, ChevronDown, Mail, Phone, MapPin, Building2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Client, ClientType, CLIENT_TYPES } from "@/types/client";
import { useToast } from "@/hooks/use-toast";
import { EntityTableTemplate } from "./EntityTableTemplate";
import { ClientDetailsModal } from "./ClientDetailsModal";
import { ClientForm } from "./ClientForm";
import { ClientFilters } from "./ClientFilters";
import { ClientBulkActions } from "./ClientBulkActions";
import { ClientImportModal } from "./ClientImportModal";

interface ClientsListProps {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
}

export interface ClientsListRef {
  openNewForm: () => void;
}

export const ClientsList = forwardRef<ClientsListRef, ClientsListProps>(({ showForm, setShowForm, showImportModal, setShowImportModal }, ref) => {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Expose function to open new form (resets editingClient)
  useImperativeHandle(ref, () => ({
    openNewForm: () => {
      setEditingClient(null);
      setShowForm(true);
    }
  }));

  const toggleCard = (clientId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const toggleClientSelection = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("client_name");
      
      if (error) throw error;
      return data as Client[];
    },
  });

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || client.client_type === typeFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && client.is_active) ||
                         (statusFilter === "inactive" && !client.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c.id));
    }
  };

  const handleSelectClient = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Client deleted",
        description: "Client has been successfully deactivated."
      });

      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "Failed to delete client. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingClient(null);
  };

  const handleSaveComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    handleCloseForm();
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    setShowImportModal(false);
  };

  const getClientTypeLabel = (type: ClientType) => {
    return CLIENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getClientTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'commercial': return 'default';
      case 'residential': return 'secondary';
      case 'government': return 'outline';
      case 'nonprofit': return 'outline';
      default: return 'secondary';
    }
  };

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load clients",
      variant: "destructive",
    });
  }

  const columns = [
    {
      key: 'client_name',
      label: 'Name',
      render: (client: Client) => (
        <div className="font-medium">{client.client_name}</div>
      )
    },
    {
      key: 'company_name',
      label: 'Company'
    },
    {
      key: 'client_type',
      label: 'Type',
      render: (client: Client) => (
        <Badge variant={getClientTypeBadgeVariant(client.client_type) as any}>
          {getClientTypeLabel(client.client_type)}
        </Badge>
      )
    },
    {
      key: 'contact_person',
      label: 'Contact Person'
    },
    {
      key: 'email',
      label: 'Email'
    },
    {
      key: 'phone',
      label: 'Phone'
    },
    {
      key: 'billing_address',
      label: 'Address'
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (client: Client) => (
        <Badge variant={client.is_active ? 'default' : 'secondary'}>
          {client.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  const renderActions = (client: Client) => {
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
          <DropdownMenuItem onClick={() => handleViewClient(client)}>
            <Eye className="h-3 w-3 mr-2" />
            View Details
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleEditClient(client)}>
            <Edit2 className="h-3 w-3 mr-2" />
            Edit Client
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => handleDeleteClient(client.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            {client.is_active ? 'Deactivate' : 'Delete'} Client
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
          title="Client Directory"
          description={`Manage your clients and their information (${filteredClients.length} total)`}
          data={filteredClients}
          columns={columns}
          isLoading={isLoading}
          selectedItems={selectedClients}
          onSelectItem={handleSelectClient}
          onSelectAll={handleSelectAll}
          renderActions={renderActions}
          filters={
            <ClientFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              resultCount={filteredClients.length}
            />
          }
          bulkActions={
            selectedClients.length > 0 ? (
              <ClientBulkActions
                selectedClientIds={selectedClients}
                onSelectionChange={(newSet) => setSelectedClients(Array.from(newSet))}
                onComplete={() => {
                  setSelectedClients([]);
                  queryClient.invalidateQueries({ queryKey: ["clients"] });
                }}
              />
            ) : null
          }
          emptyMessage="No clients found. Add your first client to get started."
          noResultsMessage="No clients match your current filters."
        />
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3 pb-24 w-full max-w-full min-w-0 px-3">
        <ClientFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          resultCount={filteredClients.length}
        />

        {/* Bulk Actions */}
        {selectedClients.length > 0 && (
          <ClientBulkActions
            selectedClientIds={selectedClients}
            onSelectionChange={(newSet) => setSelectedClients(Array.from(newSet))}
            onComplete={() => {
              setSelectedClients([]);
              queryClient.invalidateQueries({ queryKey: ["clients"] });
            }}
          />
        )}

        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {clients.length === 0 ? "No clients found. Add your first client to get started." : "No clients match your current filters."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredClients.map((client) => {
              const isExpanded = expandedCards.has(client.id);
              const isInactive = !client.is_active;

              return (
                <Card key={client.id} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCard(client.id)}>
                    {/* Collapsed Header */}
                    <CardHeader className="p-3 bg-gradient-to-r from-primary/5 to-transparent">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() => toggleClientSelection(client.id)}
                          className="mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-sm font-medium truncate">
                              {client.client_name}
                            </CardTitle>
                            <div className="flex items-center gap-1 shrink-0">
                              {isInactive && (
                                <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-orange-500 text-orange-700">
                                  Inactive
                                </Badge>
                              )}
                              <Badge 
                                variant={getClientTypeBadgeVariant(client.client_type) as any}
                                className="h-4 px-1.5 text-[10px]"
                              >
                                {getClientTypeLabel(client.client_type)}
                              </Badge>
                            </div>
                          </div>
                          {client.company_name && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{client.company_name}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="truncate">{client.phone}</span>
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
                          {client.contact_person && (
                            <span className="text-xs text-muted-foreground">Contact: {client.contact_person}</span>
                          )}
                          {client.tax_exempt && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Tax Exempt</Badge>
                          )}
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>

                    {/* Expanded Content */}
                    <CollapsibleContent>
                      <CardContent className="p-3 space-y-3 pt-2">
                        {/* Additional Details */}
                        {client.billing_address && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Billing Address</div>
                            <div className="flex items-start gap-1.5 text-xs">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              <span>{client.billing_address}</span>
                            </div>
                          </div>
                        )}

                        {client.mailing_address && client.mailing_address !== client.billing_address && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Mailing Address</div>
                            <div className="flex items-start gap-1.5 text-xs">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              <span>{client.mailing_address}</span>
                            </div>
                          </div>
                        )}

                        {client.payment_terms && (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">Payment Terms</div>
                            <div className="text-xs">{client.payment_terms}</div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleViewClient(client)}
                          >
                            <Eye className="h-3 w-3 mr-1.5" />
                            View
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditClient(client)}
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

      <ClientDetailsModal
        client={selectedClient}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedClient(null);
        }}
        onEdit={(client) => {
          setShowDetailsModal(false);
          setSelectedClient(null);
          handleEditClient(client);
        }}
        onDelete={(clientId) => {
          setShowDetailsModal(false);
          setSelectedClient(null);
          handleDeleteClient(clientId);
        }}
      />

      {showForm && (
        <ClientForm
          client={editingClient}
          onSave={handleSaveComplete}
          onCancel={handleCloseForm}
        />
      )}

      <ClientImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
});