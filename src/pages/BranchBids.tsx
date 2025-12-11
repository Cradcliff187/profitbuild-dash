import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Plus, Download, FileText, Users, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, Package } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { toast } from 'sonner';
import { ClientSelector } from '@/components/ClientSelector';
import { BidExportModal } from '@/components/BidExportModal';
import { BidFilters, BidSearchFilters } from '@/components/BidFilters';
import { BidsTableView } from '@/components/BidsTableView';
import { BidBulkActions } from '@/components/BidBulkActions';
import { ColumnSelector } from '@/components/ui/column-selector';
import type { BranchBid } from '@/types/bid';

// Define column metadata for selector
const columnDefinitions = [
  { key: "name", label: "Bid Name", required: true, sortable: true },
  { key: "client_name", label: "Client", required: false, sortable: true },
  { key: "created_at", label: "Created", required: false, sortable: true },
  { key: "project", label: "Linked Project", required: false, sortable: false },
  { key: "created_by", label: "Created By", required: false, sortable: true },
  { key: "actions", label: "Actions", required: true },
];

export default function BranchBids() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem("bids-visible-columns");
    if (saved) {
      return JSON.parse(saved);
    }
    return ["name", "client_name", "created_at", "project", "created_by", "actions"];
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("bids-column-order");
    if (saved) {
      const savedOrder = JSON.parse(saved);
      const validOrder = savedOrder.filter((key: string) => columnDefinitions.some((col) => col.key === key));
      const newColumns = columnDefinitions.map((col) => col.key).filter((key) => !validOrder.includes(key));
      return [...validOrder, ...newColumns];
    }
    return columnDefinitions.map((col) => col.key);
  });

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem("bids-visible-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem("bids-column-order", JSON.stringify(columnOrder));
  }, [columnOrder]);

  const [filters, setFilters] = useState<BidSearchFilters>({
    searchText: "",
    clientName: [],
    hasProject: null,
    dateRange: { start: null, end: null },
  });

  // Fetch all bids
  const { data: bids, isLoading } = useQuery({
    queryKey: ['branch-bids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_bids')
        .select(`
          *,
          clients:client_id (id, client_name, company_name),
          projects:project_id (project_number, project_name, client_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(bid => bid.created_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        return data.map(bid => ({
          ...bid as any,
          profiles: profiles?.find(p => p.id === bid.created_by),
        })) as BranchBid[];
      }
      
      return (data || []).map(bid => ({
        ...bid as any,
      })) as BranchBid[];
    },
  });

  // Load clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_name')
        .eq('is_active', true)
        .order('client_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('branch_bids')
        .insert({
          name,
          description: description || null,
          client_id: clientId || null,
          created_by: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();
      
      return { ...data, profiles: profile };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
      toast.success('Bid created successfully');
      setShowCreateDialog(false);
      setName('');
      setDescription('');
      setClientId('');
      navigate(`/branch-bids/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create bid', {
        description: error.message,
      });
    },
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (bidId: string) => {
      const { error } = await supabase
        .from('branch_bids')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', bidId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
      toast.success('Bid deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete bid', {
        description: error.message,
      });
    },
  });

  // Calculate statistics
  const statistics = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalBids = bids?.length || 0;
    const pendingBids = bids?.filter(bid => !bid.project_id).length || 0;
    const withClients = bids?.filter(bid => bid.client_id).length || 0;
    const thisMonth = bids?.filter(bid => {
      const createdAt = new Date(bid.created_at);
      return createdAt >= monthStart;
    }).length || 0;

    return {
      totalBids,
      pendingBids,
      withClients,
      thisMonth,
    };
  }, [bids]);

  // Filter bids based on search criteria
  const filteredBids = useMemo(() => {
    return bids?.filter(bid => {
      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesSearch = 
          bid.name.toLowerCase().includes(searchLower) ||
          bid.description?.toLowerCase().includes(searchLower) ||
          bid.clients?.client_name?.toLowerCase().includes(searchLower) ||
          bid.clients?.company_name?.toLowerCase().includes(searchLower) ||
          bid.projects?.project_name?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Client name filter
      if (filters.clientName.length > 0 && bid.clients) {
        if (!filters.clientName.includes(bid.clients.client_name)) {
          return false;
        }
      }

      // Has project filter
      if (filters.hasProject !== null) {
        if (filters.hasProject && !bid.project_id) return false;
        if (!filters.hasProject && bid.project_id) return false;
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const bidDate = new Date(bid.created_at);
        if (filters.dateRange.start && bidDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && bidDate > filters.dateRange.end) return false;
      }

      return true;
    }) || [];
  }, [bids, filters]);

  // Sort bids
  const sortedBids = useMemo(() => {
    if (!sortColumn) return filteredBids;

    return [...filteredBids].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortColumn) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'client_name':
          aVal = a.clients?.client_name || '';
          bVal = b.clients?.client_name || '';
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'created_by':
          aVal = a.profiles?.full_name || '';
          bVal = b.profiles?.full_name || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredBids, sortColumn, sortDirection]);

  const handleSort = (columnKey: string) => {
    const column = columnDefinitions.find(col => col.key === columnKey);
    if (!column?.sortable) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (columnKey: string) => {
    const column = columnDefinitions.find(col => col.key === columnKey);
    if (!column?.sortable) return null;
    
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" /> 
      : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sortedBids.map((bid) => bid.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('branch_bids')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} ${selectedIds.length === 1 ? 'bid' : 'bids'} deleted successfully`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
    } catch (error: any) {
      console.error('Error deleting bids:', error);
      toast.error(error.message || "Failed to delete bids");
    }
  };

  const handleCreateBid = () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the bid');
      return;
    }
    createMutation.mutate();
  };

  if (isLoading) {
    return <BrandedLoader message="Loading bids..." />;
  }

  return (
    <MobilePageWrapper noPadding className="space-y-2">
      <PageHeader
        icon={Package}
        title="Bids"
        description="Track and manage project bids"
        actions={
          <>
            <div className="hidden sm:flex items-center gap-2">
              <ColumnSelector 
                columns={columnDefinitions}
                visibleColumns={visibleColumns}
                onVisibilityChange={setVisibleColumns}
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
              />
              <Button 
                onClick={() => setShowExportModal(true)} 
                variant="outline" 
                size="sm"
                disabled={!bids || bids.length === 0}
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-3 w-3 mr-1" />
              New Bid
            </Button>
          </>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Bids</p>
                <p className="text-xl font-bold">{statistics.totalBids}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{statistics.pendingBids}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">With Clients</p>
                <p className="text-xl font-bold">{statistics.withClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-xl font-bold">{statistics.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <BidFilters
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filteredBids.length}
        clients={clients}
      />

      {/* Bulk Actions */}
      <BidBulkActions
        selectedCount={selectedIds.length}
        onDelete={() => setBulkDeleteDialogOpen(true)}
        onCancel={() => setSelectedIds([])}
      />

      {/* Table */}
      <BidsTableView
        bids={sortedBids}
        onDelete={(id) => deleteMutation.mutate(id)}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        visibleColumns={visibleColumns}
        columnOrder={columnOrder}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        renderSortIcon={renderSortIcon}
      />

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Bid</DialogTitle>
            <DialogDescription>
              Start gathering information for a new project estimate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Smith Residence Renovation"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add any notes or details about this bid..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client (Optional)</Label>
              <ClientSelector
                value={clientId}
                onValueChange={setClientId}
                placeholder="Select a client..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBid} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Bid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} {selectedIds.length === 1 ? 'Bid' : 'Bids'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} selected {selectedIds.length === 1 ? 'bid' : 'bids'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Modal */}
      {showExportModal && (
        <BidExportModal
          isOpen={showExportModal}
          bids={bids || []}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </MobilePageWrapper>
  );
}
