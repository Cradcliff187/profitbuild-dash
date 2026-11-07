import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Download, ChevronUp, ChevronDown, ChevronsUpDown, Handshake, Flag, CalendarClock, AlertTriangle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
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
import { BID_COLUMN_DEFINITIONS, DEFAULT_BID_FILTERS } from '@/components/bids/leadListConfig';
import { LeadSourceFields } from '@/components/bids/LeadSourceFields';
import { ContactPicker } from '@/components/bids/ContactPicker';
import { NativeSelect } from '@/components/ui/native-select';
import { useAuth } from '@/contexts/AuthContext';
import { useMentionableUsers } from '@/hooks/useMentionableUsers';
import { LEAD_SIZE_BANDS, LEAD_SIZE_BAND_LABELS, type LeadContact, type LeadSizeBand, type LeadSource } from '@/types/bid';
import { formatLeadStage } from '@/utils/leadLabels';
import {
  compareLeadsByAttention,
  getLeadAttention,
  nextBusinessDay,
  summarizeLeadPipeline,
  toDueDateString,
} from '@/utils/leadAttention';
import { cn } from '@/lib/utils';
import { BidBulkActions } from '@/components/BidBulkActions';
import { ColumnSelector } from '@/components/ui/column-selector';
import { usePagination } from '@/hooks/usePagination';
import type { BranchBid } from '@/types/bid';

// Column metadata lives in BidsTableView (single copy — Gotcha #50).
const columnDefinitions = [...BID_COLUMN_DEFINITIONS];
// v3 (Nov 7 2026): Next step / Last contact / Owner / Person columns. A saved
// older visibility list can't tell "user hid it" from "never existed", so the
// key is bumped (v2 added Stage + Source the same way).
const VISIBLE_COLUMNS_KEY = "bids-visible-columns-v3";
const COLUMN_ORDER_KEY = "bids-column-order-v3";
const DEFAULT_VISIBLE_COLUMNS = ["name", "stage", "next_step", "last_contact", "owner", "contact", "client_name", "project", "actions"];

export default function BranchBids() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(50);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState<LeadSource | ''>('');
  const [sourceDetail, setSourceDetail] = useState('');
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [contact, setContact] = useState<LeadContact | null>(null);
  const [sizeBand, setSizeBand] = useState<LeadSizeBand | ''>('');
  // Default first step: reply, by the next business day (the New-stage clock).
  // A default in a form a person submits is not automation — they can change it.
  const [nextStep, setNextStep] = useState('Reply and set up a call');
  const [nextStepDue, setNextStepDue] = useState(() => toDueDateString(nextBusinessDay(new Date())));
  const { data: people = [] } = useMentionableUsers();

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(VISIBLE_COLUMNS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(COLUMN_ORDER_KEY);
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
    localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder));
  }, [columnOrder]);

  const [filters, setFilters] = useState<BidSearchFilters>({ ...DEFAULT_BID_FILTERS });

  // Fetch all bids
  const { data: bids, isLoading } = useQuery({
    queryKey: ['branch-bids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_bids')
        .select(`
          *,
          clients:client_id (id, client_name, company_name, email, phone),
          projects:project_id (project_number, project_name, client_name),
          contacts:contact_id (id, name, title, email, phone, client_id),
          branch_bid_projects (id, branch_bid_id, project_id, created_at, created_by, projects:project_id (id, project_number, project_name, client_name, status))
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(0, 999);

      if (error) throw error;
      
      // Fetch user profiles separately (creators + owners in one read)
      if (data && data.length > 0) {
        const userIds = [...new Set(data.flatMap(bid => [bid.created_by, bid.owner_user_id]).filter(Boolean))] as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        return (data as unknown as BranchBid[]).map(bid => {
          const owner = bid.owner_user_id ? profiles?.find(p => p.id === bid.owner_user_id) : undefined;
          return {
            ...bid,
            profiles: profiles?.find(p => p.id === bid.created_by),
            owner_name: owner ? owner.full_name || owner.email : null,
          };
        });
      }

      return (data || []) as unknown as BranchBid[];
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

  // Create mutation — a lead, never a project (Rule 42).
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user found');
      if (!source) throw new Error('Pick how the lead came in');

      const { data, error } = await supabase
        .from('branch_bids')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          client_id: clientId || null,
          address: address.trim() || null,
          source,
          source_detail: sourceDetail.trim() || null,
          created_by: user.id,
          contact_id: contact?.id ?? null,
          size_band: sizeBand || null,
          owner_user_id: user.id,
          next_step: nextStep.trim() || null,
          next_step_due: nextStepDue || null,
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
      toast.success('Lead created');
      setShowCreateDialog(false);
      resetCreateForm();
      navigate(`/leads/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error('Could not create the lead', {
        description: error.message,
      });
    },
  });

  const resetCreateForm = () => {
    setName('');
    setDescription('');
    setClientId('');
    setAddress('');
    setSource('');
    setSourceDetail('');
    setSourceError(null);
    setContact(null);
    setSizeBand('');
    setNextStep('Reply and set up a call');
    setNextStepDue(toDueDateString(nextBusinessDay(new Date())));
  };

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
      toast.success('Lead deleted');
    },
    onError: (error: Error) => {
      toast.error('Could not delete the lead', {
        description: error.message,
      });
    },
  });

  // Pipeline at a glance — what needs eyes, not vanity totals. Derived flags
  // only (leadAttention.ts); nothing here changes a stage.
  const statistics = useMemo(() => summarizeLeadPipeline(bids ?? []), [bids]);

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
          bid.contacts?.name?.toLowerCase().includes(searchLower) ||
          bid.contacts?.email?.toLowerCase().includes(searchLower) ||
          bid.contacts?.phone?.toLowerCase().includes(searchLower) ||
          bid.next_step?.toLowerCase().includes(searchLower) ||
          bid.projects?.project_name?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Open / closed (closed hidden by default)
      if (filters.openState === 'open' && bid.stage === 'closed') return false;
      if (filters.openState === 'closed' && bid.stage !== 'closed') return false;

      // Stage / source facets
      if (filters.stage.length > 0 && !filters.stage.includes(bid.stage)) return false;
      if (filters.source.length > 0 && !filters.source.includes(bid.source)) return false;
      if (filters.attention.length > 0 && !filters.attention.includes(getLeadAttention(bid))) return false;
      if (filters.owner.length > 0 && !filters.owner.includes(bid.owner_user_id ?? '')) return false;

      // Client name filter
      if (filters.clientName.length > 0 && bid.clients) {
        if (!filters.clientName.includes(bid.clients.client_name)) {
          return false;
        }
      }

      // Has job filter (any link counts)
      if (filters.hasProject !== null) {
        const linked = !!bid.project_id || (bid.branch_bid_projects?.length ?? 0) > 0;
        if (filters.hasProject && !linked) return false;
        if (!filters.hasProject && linked) return false;
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
    // No explicit column = attention order: overdue → due today → new
    // unanswered → stale → no next step → the rest, newest first.
    if (!sortColumn) return [...filteredBids].sort((a, b) => compareLeadsByAttention(a, b));

    return [...filteredBids].sort((a, b) => {
      let aVal: string | number, bVal: string | number;

      switch (sortColumn) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'stage':
          aVal = formatLeadStage(a.stage);
          bVal = formatLeadStage(b.stage);
          break;
        case 'source':
          aVal = a.source;
          bVal = b.source;
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
        case 'next_step':
          aVal = a.next_step_due ?? '9999-99-99';
          bVal = b.next_step_due ?? '9999-99-99';
          break;
        case 'last_contact':
          aVal = a.last_contact_at ? new Date(a.last_contact_at).getTime() : 0;
          bVal = b.last_contact_at ? new Date(b.last_contact_at).getTime() : 0;
          break;
        case 'owner':
          aVal = a.owner_name || '';
          bVal = b.owner_name || '';
          break;
        case 'contact':
          aVal = a.contacts?.name || '';
          bVal = b.contacts?.name || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredBids, sortColumn, sortDirection]);

  // Pagination
  const pagination = usePagination({
    totalItems: sortedBids.length,
    pageSize,
    initialPage: 1,
  });

  const paginatedBids = useMemo(() => {
    return sortedBids.slice(pagination.startIndex, pagination.endIndex);
  }, [sortedBids, pagination.startIndex, pagination.endIndex]);

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
      setSelectedIds(paginatedBids.map((bid) => bid.id));
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

      toast.success(`${selectedIds.length} ${selectedIds.length === 1 ? 'lead' : 'leads'} deleted`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast.error(error instanceof Error ? error.message : "Could not delete the leads");
    }
  };

  const handleCreateBid = () => {
    if (!name.trim()) {
      toast.error('Give the lead a name');
      return;
    }
    if (!source) {
      setSourceError('Required — pick how this lead came in');
      return;
    }
    setSourceError(null);
    createMutation.mutate();
  };

  if (isLoading) {
    return <BrandedLoader message="Loading leads..." />;
  }

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={Handshake}
        title="Leads"
        description={`Who we're talking to, before a job exists · ${statistics.open} open`}
        actions={
          <>
            <Button
              onClick={() => setShowExportModal(true)}
              variant="ghost"
              size="sm"
              disabled={!bids || bids.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-3 w-3 mr-1" />
              New Lead
            </Button>
          </>
        }
        // Rule 23: secondary actions in the mobile kebab; New Lead stays on the FAB.
        mobileActions={[
          { label: 'Export CSV', icon: Download, onClick: () => setShowExportModal(true), disabled: !bids || bids.length === 0 },
        ]}
      />

      <div className="space-y-2">
        {/* What needs eyes — tap a tile to filter to it. Counts, never dollars. */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4">
          {[
            { key: 'overdue', label: 'Overdue follow-ups', value: statistics.overdue, icon: AlertTriangle, tone: 'text-destructive' },
            { key: 'due_today', label: 'Due today', value: statistics.dueToday, icon: CalendarClock, tone: 'text-primary' },
            { key: 'new_unanswered', label: 'New, unanswered', value: statistics.newUnanswered, icon: Flag, tone: 'text-warning', title: 'At New for more than a business day with nothing logged' },
            { key: 'stale', label: 'Stale 14 days', value: statistics.stale, icon: Clock, tone: 'text-warning', title: 'Open, no human contact for 14 days' },
          ].map((t) => {
            const Icon = t.icon;
            const active = filters.attention.length === 1 && filters.attention[0] === t.key;
            return (
              <button
                key={t.key}
                type="button"
                title={t.title}
                aria-pressed={active}
                onClick={() => setFilters({ ...filters, attention: active ? [] : [t.key], openState: 'open' })}
                className={cn(
                  'rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50 min-h-[56px]',
                  active && 'border-primary ring-1 ring-primary/40',
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4 shrink-0', t.value > 0 ? t.tone : 'text-muted-foreground')} />
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{t.label}</p>
                    <p className="text-xl font-bold tabular-nums">{t.value}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <BidFilters
          filters={filters}
          onFiltersChange={setFilters}
          resultCount={filteredBids.length}
          clients={clients}
          owners={people}
        />

        {/* Count and Column Selector (desktop only; hidden on mobile) */}
        {!isMobile && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {sortedBids.length} {sortedBids.length === 1 ? 'lead' : 'leads'}
            </div>
            <div className="flex items-center gap-2">
              <ColumnSelector 
                columns={columnDefinitions}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                columnOrder={columnOrder}
                onColumnOrderChange={setColumnOrder}
              />
            </div>
          </div>
        )}

        {/* Bulk Actions (desktop only; mobile uses per-card actions) */}
        {!isMobile && (
          <BidBulkActions
            selectedCount={selectedIds.length}
            onDelete={() => setBulkDeleteDialogOpen(true)}
            onCancel={() => setSelectedIds([])}
          />
        )}

        {/* Table */}
        <BidsTableView
          bids={paginatedBids}
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
          totalCount={sortedBids.length}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            pagination.goToPage(1);
          }}
          currentPage={pagination.currentPage}
          totalPages={Math.ceil(sortedBids.length / pageSize)}
          onPageChange={pagination.goToPage}
        />
      </div>

      {/* Mobile FAB — PageHeader hides actions on mobile so we surface the
          primary action here. Matches canonical Expenses / Projects pattern. */}
      {isMobile && (
        <Button
          variant="default"
          onClick={() => setShowCreateDialog(true)}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Plus className="h-6 w-6 !text-white" />
        </Button>
      )}

      {/* Create Dialog — makes a LEAD. Never a project, never a project number. */}
      <Dialog open={showCreateDialog} onOpenChange={(o) => { setShowCreateDialog(o); if (!o) resetCreateForm(); }}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
            <DialogDescription>
              Someone we're talking to. When it becomes a job, link the job from the lead page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Body Alive — studio buildouts"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <LeadSourceFields
              idPrefix="lead-new"
              required
              source={source}
              sourceDetail={sourceDetail}
              onSourceChange={(s) => { setSource(s); setSourceError(null); }}
              onSourceDetailChange={setSourceDetail}
              error={sourceError}
            />
            <div className="space-y-2">
              <Label>Person you're talking to</Label>
              <ContactPicker value={contact} onChange={setContact} clientId={clientId || null} idPrefix="lead-new-contact" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client (optional)</Label>
              <ClientSelector
                value={clientId}
                onValueChange={setClientId}
                placeholder="Select a client..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-new-size">Rough size</Label>
              <NativeSelect id="lead-new-size" value={sizeBand} onValueChange={(v) => setSizeBand(v as LeadSizeBand | '')} className="h-10 text-sm">
                <option value="">Not sized yet</option>
                {LEAD_SIZE_BANDS.map((b) => (
                  <option key={b} value={b}>{LEAD_SIZE_BAND_LABELS[b]}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-new-address">Address</Label>
              <Input
                id="lead-new-address"
                placeholder="e.g. 123 Main St, Cincinnati, OH 45202"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Scope</Label>
              <Textarea
                id="description"
                placeholder="Scope in a line or two, who decides, timing…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                First step
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <Input aria-label="First step" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="e.g. Reply and set up a call" />
                <Input aria-label="Due" type="date" className="sm:w-[160px]" value={nextStepDue} onChange={(e) => setNextStepDue(e.target.value)} />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">You own it until you hand it off. Change anything here later from the lead.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBid} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} {selectedIds.length === 1 ? 'Lead' : 'Leads'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} selected {selectedIds.length === 1 ? 'lead' : 'leads'}? This action cannot be undone.
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
