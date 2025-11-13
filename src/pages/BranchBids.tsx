import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Plus, Trash2, ExternalLink, FolderOpen } from 'lucide-react';
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
import { toast } from 'sonner';
import type { BranchBid } from '@/types/bid';

export default function BranchBids() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<BranchBid | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Fetch all bids
  const { data: bids, isLoading } = useQuery({
    queryKey: ['branch-bids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_bids')
        .select(`
          *,
          projects:project_id (project_number, project_name, client_name),
          estimates:estimate_id (estimate_number)
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
          ...bid,
          profiles: profiles?.find(p => p.id === bid.created_by)
        })) as BranchBid[];
      }
      
      return data as BranchBid[];
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

  // Filter bids based on search query
  const filteredBids = bids?.filter(bid => 
    bid.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bid.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bid.projects?.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search bids..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Bids List */}
      {filteredBids.length === 0 ? (
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBids.map((bid) => (
            <Card key={bid.id} className="hover:shadow-md transition-shadow">
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
                    onClick={() => handleDeleteClick(bid)}
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
                
                {bid.projects && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {bid.projects.project_number}
                    </Badge>
                  </div>
                )}

                {bid.estimates && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {bid.estimates.estimate_number}
                    </Badge>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  By {bid.profiles?.full_name || 'Unknown'}
                </div>

                <Button
                  className="w-full"
                  onClick={() => navigate(`/branch-bids/${bid.id}`)}
                >
                  View Details
                </Button>
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

