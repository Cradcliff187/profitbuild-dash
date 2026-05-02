import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Link as LinkIcon, FileText, StickyNote, Image, Rocket, Package } from 'lucide-react';
import { AppBreadcrumbs } from '@/components/layout/AppBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { PageHeader } from '@/components/ui/page-header';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { toast } from 'sonner';
import { BidNotesTimeline } from '@/components/BidNotesTimeline';
import { BidMediaGallery } from '@/components/BidMediaGallery';
import { BidDocumentUpload } from '@/components/BidDocumentUpload';
import { BidMediaBulkUpload } from '@/components/BidMediaBulkUpload';
import { BidQuickActionBar } from '@/components/bids/BidQuickActionBar';
import { ClientSelector } from '@/components/ClientSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBidNotes } from '@/hooks/useBidNotes';
import { useBidMedia } from '@/hooks/useBidMedia';
import { cn } from '@/lib/utils';
import type { BranchBid } from '@/types/bid';
import { generateProjectNumber } from '@/types/project';

export default function BranchBidDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [address, setAddress] = useState('');
  const [projectType, setProjectType] = useState<'construction_project' | 'work_order'>('construction_project');
  const [jobType, setJobType] = useState('');

  // Tab counts — fed into the mobile tab strip + desktop pills as badges
  const { notes: bidNotes } = useBidNotes(id || '');
  const { media: bidMediaAll } = useBidMedia(id || '');
  const notesCount = bidNotes.length;
  const mediaCount = bidMediaAll.filter(m => m.file_type === 'image' || m.file_type === 'video').length;
  const documentsCount = bidMediaAll.filter(m => m.file_type === 'document').length;

  type TabKey = 'notes' | 'media' | 'documents';
  const tabOptions: { value: TabKey; label: string; icon: typeof StickyNote; count: number }[] = [
    { value: 'notes', label: 'Notes', icon: StickyNote, count: notesCount },
    { value: 'media', label: 'Media', icon: Image, count: mediaCount },
    { value: 'documents', label: 'Docs', icon: FileText, count: documentsCount },
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

      const bidWithProfile = {
        ...data as any,
        profiles: profile,
      } as BranchBid;

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
      toast.success('Lead updated successfully');
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
      if (!bid) throw new Error('Lead not found');

      // Validate required fields
      if (!name.trim()) throw new Error('Lead name is required');
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

  if (isLoading) {
    return <BrandedLoader message="Loading bid..." />;
  }

  if (!bid) {
    return (
      <MobilePageWrapper>
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-2">Lead not found</h3>
            <Button onClick={() => navigate('/leads')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </CardContent>
        </Card>
      </MobilePageWrapper>
    );
  }

  const headerActions = (
    <>
      {/* Convert to Project Button - only show if not already linked */}
      {!bid.projects && (
        <Button
          onClick={handleConvertToProject}
          disabled={convertToProjectMutation.isPending}
          variant="default"
          size="sm"
          className="gap-2"
        >
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">
            {convertToProjectMutation.isPending ? 'Creating...' : 'Convert to Project'}
          </span>
          <span className="sm:hidden">
            {convertToProjectMutation.isPending ? 'Creating...' : 'Convert'}
          </span>
        </Button>
      )}

      {!isEditing ? (
        <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
          Edit Details
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(false);
              setName(bid.name);
              setDescription(bid.description || '');
              setClientId(bid.client_id || '');
              setAddress(bid.address || '');
              setProjectType(bid.project_type || 'construction_project');
              setJobType(bid.job_type || '');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      <MobilePageWrapper className={isMobile ? 'pb-20' : undefined}>
      {/* Breadcrumb */}
      <AppBreadcrumbs
        items={[
          { label: 'Leads', href: '/leads' },
          { label: bid.name },
        ]}
      />

      {/* Header */}
      <PageHeader
        icon={Package}
        title={bid.name}
        description={`Created by ${bid.profiles?.full_name || 'Unknown'}`}
        actions={headerActions}
      />

      {/* Mobile action strip — PageHeader hides actions on mobile, so surface
          them here instead. Gated by the same useIsMobile hook PageHeader uses
          so there's no gap at the 640-768px breakpoint. */}
      {isMobile && (
        <div className="mb-4 flex flex-wrap gap-2">{headerActions}</div>
      )}

      <div className="space-y-4">
      {/* Bid Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
          <CardDescription>Basic details and project links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Lead Name *</Label>
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
            {/* Mobile horizontal tab strip with count badges — same pattern as
                MobileScheduleView so Project and Lead detail pages share shape. */}
            <div className="sm:hidden flex items-center gap-1 bg-muted/40 rounded-xl p-1">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      'flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg transition-all min-h-[44px]',
                      isActive
                        ? 'bg-background shadow-sm text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs whitespace-nowrap">{tab.label}</span>
                    {tab.count > 0 && (
                      <Badge
                        variant={isActive ? 'default' : 'secondary'}
                        className="h-4 min-w-[16px] px-1 text-[9px] font-medium shrink-0"
                      >
                        {tab.count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Desktop Tabs */}
            <TabsList className="hidden w-full flex-wrap justify-start gap-2 rounded-full bg-muted/50 p-1 sm:flex">
              {tabOptions.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-4 min-w-[16px] px-1 text-[9px] font-medium data-[state=active]:bg-primary-foreground data-[state=active]:text-primary"
                      >
                        {tab.count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Bulk Upload — desktop only. On mobile the BidQuickActionBar's
              Attach button (input multiple, accept image+video+docs) is the
              single capture/attach affordance; surfacing this card alongside
              it would duplicate the same action with worse ergonomics
              (smaller hit target, less reachable). Hide on mobile so the
              Media tab has one clean header row. */}
          {activeTab === 'media' && !isMobile && (
            <div className="flex flex-wrap gap-2">
              <BidMediaBulkUpload
                bidId={id!}
                onUploadComplete={() => {
                  // Gallery will auto-refresh via query invalidation
                }}
              />
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
              {/* On mobile, the BidQuickActionBar's Note button is the sole
                  composer entry — hide the inline one so we don't show two. */}
              <BidNotesTimeline bidId={id!} hideComposer={isMobile} />
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
              <BidMediaGallery bidId={id!} />
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

    </MobilePageWrapper>

    {/* Mobile Quick Action Bar — Note / Camera / Attach. Rendered as a sibling
        of MobilePageWrapper (not inside) so position:fixed anchors to the
        viewport — mirrors how FieldQuickActionBar is mounted in
        ProjectDetailView. Content above has pb-20 so the bar doesn't cover
        the last card. */}
    {isMobile && id && (
      <BidQuickActionBar
        bidId={id}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />
    )}
    </>
  );
}

