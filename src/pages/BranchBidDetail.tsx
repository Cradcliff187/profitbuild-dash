import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileText, StickyNote, Image, Package, Pencil, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { AppBreadcrumbs } from '@/components/layout/AppBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { PageHeader } from '@/components/ui/page-header';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { BidNotesTimeline } from '@/components/BidNotesTimeline';
import { BidMediaGallery } from '@/components/BidMediaGallery';
import { BidDocumentUpload } from '@/components/BidDocumentUpload';
import { BidMediaBulkUpload } from '@/components/BidMediaBulkUpload';
import { BidQuickActionBar } from '@/components/bids/BidQuickActionBar';
import { LeadHero } from '@/components/bids/LeadHero';
import { LeadEditSheet } from '@/components/bids/LeadEditSheet';
import { LinkProjectDialog } from '@/components/bids/LinkProjectDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBidNotes } from '@/hooks/useBidNotes';
import { useBidMedia } from '@/hooks/useBidMedia';
import { useLeadProjectLinks } from '@/hooks/useLeadProjectLinks';
import { useRoles } from '@/contexts/RoleContext';
import { cn } from '@/lib/utils';
import type { BranchBid } from '@/types/bid';

/**
 * Lead detail — hero (stage · source · client · address · linked jobs) + the
 * Notes / Media / Docs tabs. A lead is LINKED to existing jobs; the old
 * "Convert to Project" button (which minted a project number from here) is
 * gone for good — see CLAUDE.md Rule 42.
 */
export default function BranchBidDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAdmin, isManager } = useRoles();
  const canEdit = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState('notes');
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  // Tab counts — fed into the mobile tab strip + desktop pills as badges
  const { notes: bidNotes } = useBidNotes(id || '');
  const { media: bidMediaAll } = useBidMedia(id || '');
  const notesCount = bidNotes.length;
  const mediaCount = bidMediaAll.filter((m) => m.file_type === 'image' || m.file_type === 'video').length;
  const documentsCount = bidMediaAll.filter((m) => m.file_type === 'document').length;

  type TabKey = 'notes' | 'media' | 'documents';
  const tabOptions: { value: TabKey; label: string; icon: typeof StickyNote; count: number }[] = [
    { value: 'notes', label: 'Notes', icon: StickyNote, count: notesCount },
    { value: 'media', label: 'Media', icon: Image, count: mediaCount },
    { value: 'documents', label: 'Docs', icon: FileText, count: documentsCount },
  ];

  const { links, linkProjects, isLinking, unlinkProject, isUnlinking } = useLeadProjectLinks(id);

  const { data: bid, isLoading } = useQuery({
    queryKey: ['branch-bid', id],
    queryFn: async (): Promise<BranchBid> => {
      if (!id) throw new Error('No lead id provided');

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.created_by)
        .single();

      return { ...(data as unknown as BranchBid), profiles: profile ?? undefined };
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <BrandedLoader message="Loading lead..." />;
  }

  if (!bid) {
    return (
      <MobilePageWrapper>
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Lead not found</h3>
            <Button onClick={() => navigate('/leads')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>
          </CardContent>
        </Card>
      </MobilePageWrapper>
    );
  }

  const createdLine = `Created ${format(new Date(bid.created_at), 'MMM d, yyyy')} by ${bid.profiles?.full_name || 'Unknown'}`;

  const headerActions = canEdit ? (
    <>
      <Button onClick={() => setLinkOpen(true)} variant="outline" size="sm" className="gap-1.5">
        <LinkIcon className="h-4 w-4" />
        Link to job
      </Button>
      <Button onClick={() => setEditOpen(true)} variant="outline" size="sm" className="gap-1.5">
        <Pencil className="h-4 w-4" />
        Edit details
      </Button>
    </>
  ) : undefined;

  return (
    <>
      {/* pb covers BidQuickActionBar height + the iOS home-indicator inset the
          bar's `.pb-safe` really carries now (live utility since Aug 2026). */}
      <MobilePageWrapper className={isMobile ? 'pb-[calc(5rem_+_env(safe-area-inset-bottom))]' : undefined}>
        <AppBreadcrumbs
          items={[
            { label: 'Leads', href: '/leads' },
            { label: bid.name },
          ]}
        />

        {/* Rule 23: desktop gets the buttons, mobile gets the ⋮ kebab — no
            hand-rolled mobile strip, no hidden actions. */}
        <PageHeader
          icon={Package}
          title={bid.name}
          description={createdLine}
          actions={headerActions}
          mobileActions={
            canEdit
              ? [
                  { label: 'Link to job', icon: LinkIcon, onClick: () => setLinkOpen(true) },
                  { label: 'Edit details', icon: Pencil, onClick: () => setEditOpen(true) },
                ]
              : []
          }
        />

        <div className="space-y-4">
          <LeadHero
            bid={bid}
            links={links}
            canEdit={canEdit}
            onLinkJob={() => setLinkOpen(true)}
            onUnlink={(linkId) => unlinkProject(linkId)}
            onEdit={() => setEditOpen(true)}
            isUnlinking={isUnlinking}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:w-auto">
                {/* Mobile horizontal tab strip with count badges — same pattern as
                    MobileScheduleView so Project and Lead detail pages share shape. */}
                <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1 sm:hidden">
                  {tabOptions.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                          'flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-1 py-2.5 transition-all',
                          isActive
                            ? 'bg-background font-medium text-primary shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap text-xs">{tab.label}</span>
                        {tab.count > 0 && (
                          <Badge
                            variant={isActive ? 'default' : 'secondary'}
                            className="h-4 min-w-[16px] shrink-0 px-1 text-[9px] font-medium"
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
                        className="flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
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

              {/* Bulk Upload — desktop only (Rule 22: mobile Media is single-affordance
                  via the bottom bar's Attach). */}
              {activeTab === 'media' && !isMobile && (
                <div className="flex flex-wrap gap-2">
                  <BidMediaBulkUpload bidId={id!} onUploadComplete={() => {}} />
                </div>
              )}
            </div>

            <TabsContent value="notes" className="mt-0">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  {/* On mobile, the BidQuickActionBar's Note button is the sole
                      composer entry — hide the inline one so we don't show two. */}
                  <BidNotesTimeline bidId={id!} hideComposer={isMobile} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="mt-0">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <BidMediaGallery bidId={id!} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <BidDocumentUpload bidId={id!} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MobilePageWrapper>

      {/* Mobile Quick Action Bar — sibling of MobilePageWrapper (Gotcha #41). */}
      {isMobile && id && (
        <BidQuickActionBar bidId={id} onNavigateToTab={(tab) => setActiveTab(tab)} />
      )}

      <LeadEditSheet bid={bid} open={editOpen} onOpenChange={setEditOpen} />
      <LinkProjectDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        linkedProjectIds={links.map((l) => l.project_id)}
        onLink={linkProjects}
        isLinking={isLinking}
        leadName={bid.name}
      />
    </>
  );
}
