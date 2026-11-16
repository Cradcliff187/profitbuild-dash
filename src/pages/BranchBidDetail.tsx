import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calculator, FileText, History, Image, Link as LinkIcon, Package } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { AppBreadcrumbs } from '@/components/layout/AppBreadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HubRow } from '@/components/ui/hub-row';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { PageHeader } from '@/components/ui/page-header';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { BidMediaGallery } from '@/components/BidMediaGallery';
import { BidDocumentUpload } from '@/components/BidDocumentUpload';
import { BidQuickActionBar } from '@/components/bids/BidQuickActionBar';
import { LeadFactsCard } from '@/components/bids/LeadFactsCard';
import { LeadEditSheet } from '@/components/bids/LeadEditSheet';
import { LinkProjectDialog } from '@/components/bids/LinkProjectDialog';
import { LinkedJobsCard } from '@/components/bids/LinkedJobsCard';
import { LeadEstimatesCard } from '@/components/bids/LeadEstimatesCard';
import { NextStepCard } from '@/components/bids/NextStepCard';
import { TouchComposer } from '@/components/bids/TouchComposer';
import { LeadTimeline } from '@/components/bids/LeadTimeline';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLeadProjectLinks } from '@/hooks/useLeadProjectLinks';
import { useLeadTimeline } from '@/hooks/useLeadTimeline';
import { useRoles } from '@/contexts/RoleContext';
import { TOUCH_KINDS, type BranchBid } from '@/types/bid';

/**
 * Lead record (docs/LEADS_CRM_PLAN.md §4.2 / §4.3).
 *
 * Desktop: a CRM record, not tabs — facts on the left, ONE timeline with ONE
 * composer in the center, what's-next on the right (next step · linked jobs ·
 * estimates). Mobile: a hub + drill-downs (Rule 37), same shape as the project
 * hub: hero (person · stage · next step · Call/Text/Directions), peer rows,
 * `?tab=` sub-pages, and the bottom bar (Log touch · Camera · Attach).
 *
 * One home per verb: Edit = the pencil on the facts card; Link to job = the
 * Linked jobs card; stage = the pill. The header carries no actions.
 * A lead never takes a project number — see Rule 42.
 */
type SubPage = 'activity' | 'media' | 'documents' | 'jobs';
const SUB_PAGES: { id: SubPage; label: string; blurb: string; icon: typeof History }[] = [
  { id: 'activity', label: 'Activity', blurb: 'Calls, notes, emails, stage changes', icon: History },
  { id: 'media', label: 'Photos & video', blurb: 'Site photos and walkthroughs', icon: Image },
  { id: 'documents', label: 'Documents', blurb: 'Plans, RFPs, anything they sent', icon: FileText },
  { id: 'jobs', label: 'Linked jobs & estimates', blurb: 'Where the number lives', icon: LinkIcon },
];
/** Pre-record tab names still deep-linked from older bookmarks. */
const LEGACY_TAB_ALIASES: Record<string, SubPage> = { notes: 'activity', docs: 'documents' };

export default function BranchBidDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isManager } = useRoles();
  const canEdit = isAdmin || isManager;

  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const { links, linkProjects, isLinking, unlinkProject, isUnlinking } = useLeadProjectLinks(id);
  const { entries, isLoading: timelineLoading, deleteEntry } = useLeadTimeline(id);

  const { data: bid, isLoading } = useQuery({
    queryKey: ['branch-bid', id],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<BranchBid> => {
      if (!id) throw new Error('No lead id provided');
      const { data, error } = await supabase
        .from('branch_bids')
        .select(`
          *,
          clients:client_id (id, client_name, company_name, email, phone),
          projects:project_id (id, project_number, project_name, client_name),
          contacts:contact_id (id, name, title, email, phone, client_id)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;

      const ids = [...new Set([data.created_by, data.owner_user_id].filter(Boolean))] as string[];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      const creator = byId.get(data.created_by);
      const owner = data.owner_user_id ? byId.get(data.owner_user_id) : undefined;
      return {
        ...(data as unknown as BranchBid),
        profiles: creator ? { full_name: creator.full_name, email: creator.email } : undefined,
        owner_name: owner ? owner.full_name || owner.email : null,
      };
    },
    enabled: !!id,
  });

  const counts = useMemo(() => {
    const touches = entries.filter((e) => (TOUCH_KINDS as readonly string[]).includes(e.kind) || e.kind === 'stage_change' || e.kind === 'link').length;
    const media = entries.filter((e) => e.attachments.some((a) => a.file_type === 'image' || a.file_type === 'video')).length;
    const docs = entries.filter((e) => e.attachments.some((a) => a.file_type === 'document')).length;
    return { activity: touches, media, documents: docs, jobs: links.length };
  }, [entries, links.length]);

  const urlTab = searchParams.get('tab');
  const resolvedTab = urlTab ? (LEGACY_TAB_ALIASES[urlTab] ?? urlTab) : null;
  const subPage: SubPage | null = SUB_PAGES.some((p) => p.id === resolvedTab) ? (resolvedTab as SubPage) : null;
  const openSubPage = (tab: SubPage) =>
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', tab); return n; }, { replace: false });
  const closeSubPage = () =>
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('tab'); return n; }, { replace: false });

  if (isLoading) return <BrandedLoader message="Loading lead..." />;

  if (!bid) {
    return (
      <MobilePageWrapper>
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
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
  const currentNextStep = { text: bid.next_step, due: bid.next_step_due };
  const dialogs = (
    <>
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

  // ------------------------------------------------------------------ mobile
  if (isMobile) {
    return (
      <>
        <MobilePageWrapper className="pb-[calc(5rem_+_env(safe-area-inset-bottom))]">

          {subPage ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10 shrink-0" onClick={closeSubPage} aria-label="Back to lead">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold">{SUB_PAGES.find((p) => p.id === subPage)!.label}</h2>
              </div>
              {subPage === 'activity' && (
                <LeadTimeline entries={entries} isLoading={timelineLoading} canDelete={canEdit} onDelete={deleteEntry} emptyHint="Nothing logged yet. Tap Log touch below." />
              )}
              {subPage === 'media' && <BidMediaGallery bidId={bid.id} />}
              {subPage === 'documents' && <BidDocumentUpload bidId={bid.id} hideUploader />}
              {subPage === 'jobs' && (
                <div className="space-y-4">
                  <LinkedJobsCard links={links} canEdit={canEdit} onLinkJob={() => setLinkOpen(true)} onUnlink={(linkId) => unlinkProject(linkId)} isUnlinking={isUnlinking} />
                  <LeadEstimatesCard links={links} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* AppLayout's mobile header says "Lead Details" for the whole
                  /leads/* tree; the lead's own name has to be on the page. */}
              <div className="px-1">
                <h1 className="text-xl font-semibold leading-tight break-words">{bid.name}</h1>
                <p className="text-xs text-muted-foreground">{createdLine}</p>
              </div>
              <LeadFactsCard bid={bid} hasLinkedJobs={links.length > 0} canEdit={canEdit} onEdit={() => setEditOpen(true)} compact />
              <NextStepCard bid={bid} canEdit={canEdit} onLogTouch={() => setComposerOpen(true)} />
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">On this lead</h2>
                <div className="overflow-hidden rounded-xl border bg-card">
                  {SUB_PAGES.map((p, i) => (
                    <HubRow key={p.id} icon={p.icon} label={p.label} blurb={p.blurb} count={counts[p.id]} withDivider={i > 0} onClick={() => openSubPage(p.id)} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </MobilePageWrapper>

        {/* Sibling of MobilePageWrapper (Gotcha #41). */}
        <BidQuickActionBar
          bidId={bid.id}
          currentNextStep={currentNextStep}
          onUploaded={(kind) => openSubPage(kind === 'documents' ? 'documents' : 'media')}
        />
        <TouchComposer bidId={bid.id} presentation="sheet" open={composerOpen} onOpenChange={setComposerOpen} currentNextStep={currentNextStep} autoFocus />
        {dialogs}
      </>
    );
  }

  // ----------------------------------------------------------------- desktop
  return (
    <MobilePageWrapper>
      <AppBreadcrumbs items={[{ label: 'Leads', href: '/leads' }, { label: bid.name }]} />
      <PageHeader icon={Package} title={bid.name} description={createdLine} mobileActions={[]} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,320px)] xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)_minmax(0,340px)]">
        {/* Left — the facts */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <LeadFactsCard bid={bid} hasLinkedJobs={links.length > 0} canEdit={canEdit} onEdit={() => setEditOpen(true)} />
        </div>

        {/* Center — the story. Order on tablets: facts, next step, then the timeline. */}
        <div className="order-3 lg:order-none">
          <Card>
            <CardContent className="space-y-5 p-4 sm:p-5">
              {canEdit && (
                <TouchComposer bidId={bid.id} presentation="inline" currentNextStep={currentNextStep} />
              )}
              <LeadTimeline entries={entries} isLoading={timelineLoading} canDelete={canEdit} onDelete={deleteEntry} />
            </CardContent>
          </Card>
        </div>

        {/* Right — what's next */}
        <div className="order-2 space-y-4 lg:order-none lg:sticky lg:top-4 lg:self-start">
          <NextStepCard bid={bid} canEdit={canEdit} />
          <LinkedJobsCard links={links} canEdit={canEdit} onLinkJob={() => setLinkOpen(true)} onUnlink={(linkId) => unlinkProject(linkId)} isUnlinking={isUnlinking} />
          <LeadEstimatesCard links={links} />
          {links.length > 0 && (
            <p className="px-1 text-[11px] text-muted-foreground">
              <Calculator className="mr-1 inline h-3 w-3" aria-hidden />
              Numbers live on the job. The lead keeps the conversation.
            </p>
          )}
        </div>
      </div>

      {dialogs}
    </MobilePageWrapper>
  );
}
