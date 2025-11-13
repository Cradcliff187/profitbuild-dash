import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Link as LinkIcon, Camera, Video, FileText } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { toast } from 'sonner';
import { BidNotesTimeline } from '@/components/BidNotesTimeline';
import { BidMediaGallery } from '@/components/BidMediaGallery';
import { BidDocumentUpload } from '@/components/BidDocumentUpload';
import type { BranchBid } from '@/types/bid';

export default function BranchBidDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [estimateId, setEstimateId] = useState<string>('');

  // Fetch bid details
  const { data: bid, isLoading } = useQuery({
    queryKey: ['branch-bid', id],
    queryFn: async () => {
      if (!id) throw new Error('No bid ID provided');

      const { data, error } = await supabase
        .from('branch_bids')
        .select(`
          *,
          projects:project_id (id, project_number, project_name, client_name),
          estimates:estimate_id (id, estimate_number)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;

      // Fetch user profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.created_by)
        .single();

      const bidWithProfile = { ...data, profiles: profile } as BranchBid;

      // Set form state from fetched data
      setName(bidWithProfile.name);
      setDescription(bidWithProfile.description || '');
      setProjectId(bidWithProfile.project_id || '');
      setEstimateId(bidWithProfile.estimate_id || '');

      return bidWithProfile;
    },
    enabled: !!id,
  });

  // Fetch available projects
  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name')
        .neq('project_number', 'SYS-000')
        .neq('project_number', '000-UNASSIGNED')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // Fetch available estimates
  const { data: estimates } = useQuery({
    queryKey: ['estimates-list', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('estimates')
        .select('id, estimate_number, status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No bid ID');

      const { error } = await supabase
        .from('branch_bids')
        .update({
          name,
          description: description || null,
          project_id: projectId || null,
          estimate_id: estimateId || null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-bid', id] });
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
      toast.success('Bid updated successfully');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update bid', {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the bid');
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading) {
    return <BrandedLoader message="Loading bid..." />;
  }

  if (!bid) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-2">Bid not found</h3>
            <Button onClick={() => navigate('/branch-bids')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bids
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/branch-bids">Bids</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{bid.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/branch-bids')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{bid.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Created by {bid.profiles?.full_name || 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>Edit Details</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                // Reset form state
                setName(bid.name);
                setDescription(bid.description || '');
                setProjectId(bid.project_id || '');
                setEstimateId(bid.estimate_id || '');
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bid Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bid Information</CardTitle>
          <CardDescription>Basic details and project links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Linked Project</Label>
              <Select
                value={projectId || undefined}
                onValueChange={(value) => {
                  setProjectId(value === 'none' ? '' : value);
                  setEstimateId(''); // Reset estimate when project changes
                }}
                disabled={!isEditing}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projectId && (
                    <SelectItem value="none">Clear selection</SelectItem>
                  )}
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_number} - {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="estimate">Linked Estimate</Label>
              <Select
                value={estimateId || undefined}
                onValueChange={(value) => setEstimateId(value === 'none' ? '' : value)}
                disabled={!isEditing || !projectId}
              >
                <SelectTrigger id="estimate">
                  <SelectValue placeholder={projectId ? "Select an estimate (optional)" : "Select a project first"} />
                </SelectTrigger>
                <SelectContent>
                  {estimateId && (
                    <SelectItem value="none">Clear selection</SelectItem>
                  )}
                  {estimates?.map((estimate) => (
                    <SelectItem key={estimate.id} value={estimate.id}>
                      {estimate.estimate_number} ({estimate.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isEditing}
                rows={4}
                placeholder="Add notes about this bid..."
              />
            </div>
          </div>

          {bid.projects && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LinkIcon className="h-4 w-4" />
                <span>
                  Linked to project: <strong>{bid.projects.project_number}</strong> - {bid.projects.project_name}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Add voice or text notes about this bid</CardDescription>
            </CardHeader>
            <CardContent>
              <BidNotesTimeline bidId={id!} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Photos & Videos</CardTitle>
                  <CardDescription>Capture site photos and videos</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/branch-bids/${id}/capture`)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Photo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/branch-bids/${id}/capture-video`)}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <BidMediaGallery bidId={id!} bidName={bid.name} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Upload PDFs, Word docs, Excel files, and other documents</CardDescription>
            </CardHeader>
            <CardContent>
              <BidDocumentUpload bidId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

