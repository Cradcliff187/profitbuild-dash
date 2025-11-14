import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Plus, Trash2, ExternalLink, FolderOpen, Grid, Table as TableIcon, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ClientSelector } from '@/components/ClientSelector';
import type { BranchBid } from '@/types/bid';

type DisplayMode = 'cards' | 'table';
type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

export default function BranchBids() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<BranchBid | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>(isMobile ? 'cards' : 'table');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');

  // Auto-switch to cards on mobile
  useEffect(() => {
    if (isMobile && displayMode === 'table') {
      setDisplayMode('cards');
    }
  }, [isMobile, displayMode]);

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
        
        // Map profiles to bids
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
      
      // Fetch user profile separately
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
      // Navigate to the detail page
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
      setShowDeleteDialog(false);
      setSelectedBid(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete bid', {
        description: error.message,
      });
    },
  });

  // Filter and sort bids
  const filteredAndSortedBids = useMemo(() => {
    let result = bids?.filter(bid => 
      bid.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.projects?.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.clients?.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bid.clients?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [bids, searchQuery, sortOption]);

  const handleCreateBid = () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the bid');
      return;
    }
    createMutation.mutate();
  };

  const handleDeleteClick = (bid: BranchBid) => {
    setSelectedBid(bid);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (selectedBid) {
      deleteMutation.mutate(selectedBid.id);
    }
  };

  if (isLoading) {
    return <BrandedLoader message="Loading bids..." />;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Bids</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-7 w-7" />
            Bids
          </h1>
          <p className="text-muted-foreground mt-1">
            Pre-estimate workspace for gathering project information
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Bid
        </Button>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search bids..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-md"
        />
        
        <div className="flex gap-2">
          {/* Sort */}
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          {!isMobile && (
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={displayMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('table')}
                className="h-8 px-3"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={displayMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('cards')}
                className="h-8 px-3"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bids List */}
      {filteredAndSortedBids.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-2">No bids found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? 'No bids match your search criteria'
                : 'Create your first bid to start gathering project information'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Bid
              </Button>
            )}
          </CardContent>
        </Card>
      ) : displayMode === 'table' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Linked Project</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedBids.map((bid) => (
                <TableRow 
                  key={bid.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/branch-bids/${bid.id}`)}
                >
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{bid.name}</div>
                      {bid.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {bid.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {bid.clients ? (
                      <div className="text-sm">
                        <div className="font-medium">{bid.clients.client_name}</div>
                        {bid.clients.company_name && (
                          <div className="text-xs text-muted-foreground">{bid.clients.company_name}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(bid.created_at), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {bid.projects ? (
                      <Badge variant="secondary" className="w-fit text-xs">
                        {bid.projects.project_number}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {bid.profiles?.full_name || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(bid);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedBids.map((bid) => (
            <Card key={bid.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/branch-bids/${bid.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{bid.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Created {format(new Date(bid.created_at), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(bid);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bid.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {bid.description}
                  </p>
                )}
                
                {bid.clients && (
                  <div className="text-sm">
                    <span className="font-medium">{bid.clients.client_name}</span>
                    {bid.clients.company_name && (
                      <span className="text-muted-foreground"> • {bid.clients.company_name}</span>
                    )}
                  </div>
                )}
                
                {bid.projects && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {bid.projects.project_number}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {bid.projects.project_name}
                    </span>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  By {bid.profiles?.full_name || 'Unknown'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              <ClientSelector
                value={clientId}
                onValueChange={(id) => setClientId(id)}
                placeholder="Select a client"
                required={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add any initial notes about this bid..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bid?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBid?.name}"? This action cannot be undone.
              All associated notes, media, and documents will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBid(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

