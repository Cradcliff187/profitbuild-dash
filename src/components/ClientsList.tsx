import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload } from "lucide-react";
import { Client, ClientType, CLIENT_TYPES } from "@/types/client";
import { useToast } from "@/hooks/use-toast";
import { EntityTableTemplate } from "./EntityTableTemplate";
import { ClientDetailsModal } from "./ClientDetailsModal";
import { ClientForm } from "./ClientForm";
import { ClientFilters } from "./ClientFilters";
import { ClientBulkActions } from "./ClientBulkActions";
import { ClientImportModal } from "./ClientImportModal";

export const ClientsList = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-2">
            Manage your client database and contact information
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      <EntityTableTemplate
        title="Client Directory"
        description={`Manage your clients and their information (${filteredClients.length} total)`}
        data={filteredClients}
        columns={columns}
        isLoading={isLoading}
        selectedItems={selectedClients}
        onSelectItem={handleSelectClient}
        onSelectAll={handleSelectAll}
        onView={handleViewClient}
        onEdit={handleEditClient}
        onDelete={handleDeleteClient}
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
};