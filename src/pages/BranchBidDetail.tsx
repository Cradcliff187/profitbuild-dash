import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Link as LinkIcon, Camera, Video, FileText, StickyNote, Image, Rocket } from 'lucide-react';
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
import { ClientSelector } from '@/components/ClientSelector';
import type { BranchBid } from '@/types/bid';
import { generateProjectNumber } from '@/types/project';

export default function BranchBidDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [address, setAddress] = useState('');
  const [projectType, setProjectType] = useState<'construction_project' | 'work_order'>('construction_project');
  const [jobType, setJobType] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  // Tab options
  const tabOptions = [
    { value: 'notes', label: 'Notes', icon: StickyNote },
    { value: 'media', label: 'Media', icon: Image },
    { value: 'documents', label: 'Documents', icon: FileText },
  ];

  // Fetch bid details
  const { data: bid, isLoading } = useQuery({
    queryKey: ['branch-bid', id],
    queryFn: async () => {
      if (!id) throw new Error('No bid ID provided');

      const { data, error } = await supabase
        .from('branch_bids')
        .select(`
          *,
          clients:client_id (id, client_name, company_name, email, phone),
          projects:project_id (id, project_number, project_name, client_name)
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
      setClientId(bidWithProfile.client_id || '');
      setAddress(bidWithProfile.address || '');
      setProjectType(bidWithProfile.project_type || 'construction_project');
      setJobType(bidWithProfile.job_type || '');

      return bidWithProfile;
    },
    enabled: !!id,
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
          client_id: clientId || null,
          address: address || null,
          project_type: projectType || null,
          job_type: jobType || null,
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

  // Convert to project mutation
  const convertToProjectMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No bid ID');
      if (!bid) throw new Error('Bid not found');

      // Validate required fields
      if (!name.trim()) throw new Error('Bid name is required');
      if (!clientId) throw new Error('Client is required to create a project');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('client_name')
        .eq('id', clientId)
        .single();

      if (clientError || !client) throw new Error('Client not found');

      // Generate project number
      const projectNumber = await generateProjectNumber();

      // Create the project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          project_number: projectNumber,
          project_name: name,
          client_id: clientId,
          client_name: client.client_name,
          address: address || null,
          project_type: projectType,
          job_type: jobType || null,
          status: 'estimating',
          notes: description || null,
        })
        .select('*')
        .single();

      if (projectError) throw projectError;

      // Link the bid to the new project
      const { error: updateError } = await supabase
        .from('branch_bids')
        .update({ project_id: newProject.id })
        .eq('id', id);

      if (updateError) throw updateError;

      return newProject;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['branch-bid', id] });
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
      toast.success('Project created successfully!');
      // Navigate to the new project
      navigate(`/projects/${newProject.id}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create project', {
        description: error.message,
      });
    },
  });

  const handleConvertToProject = () => {
    if (!clientId) {
      toast.error('Please select a client before creating a project');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter a bid name');
      return;
    }
    convertToProjectMutation.mutate();
  };

  const handleDocumentUpload = (url: string, fileName: string) => {
    setDocumentUrl(url);
    toast.success('Document uploaded successfully');
  };

>>>>>>> fix/bid-workflow
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
          {/* Convert to Project Button - only show if not already linked */}
          {!bid.projects && (
            <Button 
              onClick={handleConvertToProject} 
              disabled={convertToProjectMutation.isPending}
              variant="default"
              className="gap-2"
            >
              <Rocket className="h-4 w-4" />
              {convertToProjectMutation.isPending ? 'Creating...' : 'Convert to Project'}
            </Button>
          )}
          
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">Edit Details</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                // Reset form state
                setName(bid.name);
                setDescription(bid.description || '');
                setClientId(bid.client_id || '');
                setAddress(bid.address || '');
                setProjectType(bid.project_type || 'construction_project');
                setJobType(bid.job_type || '');
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
              <Label htmlFor="name">Bid Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g., Smith Residence Renovation"
              />
            </div>

            <div className="space-y-2">
              <Label>Client</Label>
              {isEditing ? (
                <ClientSelector
                  value={clientId}
                  onValueChange={(id) => setClientId(id)}
                  placeholder="Select a client"
                  showLabel={false}
                />
              ) : (
                <div className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm items-center">
                  {bid.clients ? (
                    <span className="truncate">
                      {bid.clients.client_name}
                      {bid.clients.company_name && ` (${bid.clients.company_name})`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No client selected</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Project Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g., 123 Main St, Cincinnati, OH 45202"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type</Label>
              <Select
                value={projectType}
                onValueChange={(value) => setProjectType(value as 'construction_project' | 'work_order')}
                disabled={!isEditing}
              >
                <SelectTrigger id="projectType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="construction_project">Construction Project</SelectItem>
                  <SelectItem value="work_order">Work Order</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobType">Job Type (Optional)</Label>
              <Input
                id="jobType"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g., Renovation, New Construction"
              />
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
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium text-sm">Converted to Project</div>
                  <div className="text-sm text-muted-foreground">
                    <strong>{bid.projects.project_number}</strong> - {bid.projects.project_name}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/projects/${bid.project_id}`)}
                  className="ml-auto"
                >
                  View Project
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="w-full sm:w-auto">
            {/* Mobile Dropdown */}
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <SelectItem key={tab.value} value={tab.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Tabs */}
            <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/40 p-1 sm:flex">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Action Buttons for Media Tab */}
          {activeTab === 'media' && (
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
          )}
        </div>

        <TabsContent value="notes" className="mt-0">
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

        <TabsContent value="media" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Photos & Videos</CardTitle>
              <CardDescription>Capture site photos and videos</CardDescription>
            </CardHeader>
            <CardContent>
              <BidMediaGallery bidId={id!} bidName={bid.name} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
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

