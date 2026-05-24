import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertCircle,
  Clock,
  FileText,
  FileEdit,
  AlertTriangle,
  Camera,
  Video,
  Receipt,
  FileIcon,
  ChevronRight,
  Check,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { calculateScheduleStatus, getExpiringQuotes, getProjectScheduleDates } from '@/utils/projectDashboard';
import type { Project } from '@/types/project';
import type { Estimate } from '@/types/estimate';
import type { Quote } from '@/types/quote';
import type { Expense } from '@/types/expense';
import type { ChangeOrder } from '@/types/changeOrder';
import { ProjectNotesTimeline } from './ProjectNotesTimeline';
import { supabase } from '@/integrations/supabase/client';

interface ProjectOperationalDashboardProps {
  project: Project;
  estimates: Estimate[];
  quotes: Quote[];
  expenses: Expense[];
  changeOrders: ChangeOrder[];
  pendingTimeEntries: number;
  pendingReceipts: number;
  mediaCounts: { photos: number; videos: number };
  documentCount: number;
}

export function ProjectOperationalDashboard({
  project,
  estimates,
  quotes,
  changeOrders,
  pendingTimeEntries,
  pendingReceipts,
  mediaCounts,
  documentCount
}: ProjectOperationalDashboardProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // State for schedule dates loaded from line items if needed
  const [scheduleDates, setScheduleDates] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });

  // Data freshness tracking
  const [dataFreshness, setDataFreshness] = useState<{
    lastExpenseDays: number | null;
    lastTimeDays: number | null;
  }>({ lastExpenseDays: null, lastTimeDays: null });

  // Load schedule dates on mount
  useEffect(() => {
    const loadScheduleDates = async () => {
      const dates = await getProjectScheduleDates(
        project.id,
        project.start_date,
        project.end_date
      );
      setScheduleDates(dates);
    };
    loadScheduleDates();
  }, [project.id, project.start_date, project.end_date]);

  // Load data freshness for active projects
  useEffect(() => {
    async function checkFreshness() {
      if (!project.id) return;

      // Last non-labor expense by expense_date (not created_at)
      const { data: lastExpense } = await supabase
        .from('expenses')
        .select('expense_date')
        .eq('project_id', project.id)
        .neq('category', 'labor_internal')
        .order('expense_date', { ascending: false })
        .limit(1)
        .single();

      // Last time entry (labor_internal expense) by expense_date
      const { data: lastTime } = await supabase
        .from('expenses')
        .select('expense_date')
        .eq('project_id', project.id)
        .eq('category', 'labor_internal')
        .order('expense_date', { ascending: false })
        .limit(1)
        .single();

      const now = new Date();
      setDataFreshness({
        lastExpenseDays: lastExpense?.expense_date
          ? Math.floor((now.getTime() - new Date(lastExpense.expense_date).getTime()) / 86400000)
          : null,
        lastTimeDays: lastTime?.expense_date
          ? Math.floor((now.getTime() - new Date(lastTime.expense_date).getTime()) / 86400000)
          : null,
      });
    }

    // Only check freshness for active projects — irrelevant for estimating/complete
    if (['in_progress', 'approved'].includes(project.status)) {
      checkFreshness();
    }
  }, [project.id, project.status]);

  // Owner name for the identity strip
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOwner() {
      if (!project.owner_id) return;
      const { data, error: ownerError } = await supabase
        .from('payees')
        .select('payee_name')
        .eq('id', project.owner_id)
        .single();
      if (ownerError) { console.error('Failed to load project owner:', ownerError); return; }
      if (data) setOwnerName(data.payee_name);
    }
    fetchOwner();
  }, [project.owner_id]);

  // Calculate operational metrics. `label` is the full desktop line; `short` is the
  // condensed token used in the mobile single-line summary.
  const needsAttention = useMemo(() => {
    const items: Array<{
      type: string;
      label: string;
      short: string;
      icon: typeof Clock;
      onClick: () => void;
    }> = [];

    if (pendingTimeEntries > 0) {
      items.push({
        type: 'time_entries',
        label: `${pendingTimeEntries} pending time ${pendingTimeEntries === 1 ? 'entry' : 'entries'}`,
        short: `${pendingTimeEntries} pending time`,
        icon: Clock,
        onClick: () => navigate('/time-entries?status=pending')
      });
    }

    if (pendingReceipts > 0) {
      items.push({
        type: 'receipts',
        label: `${pendingReceipts} pending ${pendingReceipts === 1 ? 'receipt' : 'receipts'}`,
        short: `${pendingReceipts} receipts`,
        icon: FileText,
        onClick: () => navigate(`/time-entries?tab=receipts&project=${project.id}`)
      });
    }

    const pendingCOs = changeOrders.filter(co => co.status === 'pending');
    if (pendingCOs.length > 0) {
      items.push({
        type: 'change_orders',
        label: `${pendingCOs.length} pending change ${pendingCOs.length === 1 ? 'order' : 'orders'}`,
        short: `${pendingCOs.length} pending COs`,
        icon: FileEdit,
        onClick: () => navigate(`/projects/${project.id}/changes`)
      });
    }

    const expiringQuotes = getExpiringQuotes(quotes, 7);
    if (expiringQuotes.length > 0) {
      items.push({
        type: 'expiring_quotes',
        label: `${expiringQuotes.length} expiring ${expiringQuotes.length === 1 ? 'quote' : 'quotes'} (7 days)`,
        short: `${expiringQuotes.length} expiring quotes`,
        icon: AlertTriangle,
        onClick: () => navigate(`/projects/${project.id}#quotes`)
      });
    }

    // DNE Warning — check if expenses approaching do_not_exceed
    if (project.do_not_exceed && project.do_not_exceed > 0) {
      const totalExpenses = (project as any).total_expenses ?? 0;
      const utilizationPct = (totalExpenses / project.do_not_exceed) * 100;
      if (utilizationPct >= 80) {
        const remaining = project.do_not_exceed - totalExpenses;
        items.push({
          type: 'dne_warning',
          label: `DNE: ${formatCurrency(remaining)} of ${formatCurrency(project.do_not_exceed)} remaining (${utilizationPct.toFixed(0)}% used)`,
          short: `DNE ${utilizationPct.toFixed(0)}% used`,
          icon: AlertTriangle,
          onClick: () => navigate(`/projects/${project.id}/expenses`),
        });
      }
    }

    // Contingency Warning
    const contingencyAmount = project.contingency_amount ?? 0;
    const contingencyRemaining = project.contingency_remaining ?? 0;
    if (contingencyAmount > 0) {
      const remainingPct = (contingencyRemaining / contingencyAmount) * 100;
      if (remainingPct <= 25) {
        items.push({
          type: 'contingency_warning',
          label: `Contingency ${remainingPct.toFixed(0)}% remaining`,
          short: `contingency ${remainingPct.toFixed(0)}%`,
          icon: AlertTriangle,
          onClick: () => navigate(`/projects/${project.id}/changes`),
        });
      }
    }

    // Data Freshness Warning — only for active projects with stale data
    if (['in_progress', 'approved'].includes(project.status)) {
      if (dataFreshness.lastExpenseDays !== null && dataFreshness.lastExpenseDays > 14) {
        items.push({
          type: 'stale_expenses',
          label: `No material/sub expenses in ${dataFreshness.lastExpenseDays} days`,
          short: 'stale expenses',
          icon: Clock,
          onClick: () => navigate(`/projects/${project.id}/expenses`),
        });
      }
      if (dataFreshness.lastTimeDays !== null && dataFreshness.lastTimeDays > 7) {
        items.push({
          type: 'stale_time',
          label: `No time entries in ${dataFreshness.lastTimeDays} days`,
          short: 'stale time',
          icon: Clock,
          onClick: () => navigate('/time-entries'),
        });
      }
    }

    return items;
  }, [pendingTimeEntries, pendingReceipts, changeOrders, quotes, project, navigate, dataFreshness]);

  const scheduleStatus = useMemo(() =>
    calculateScheduleStatus(scheduleDates.start, scheduleDates.end, project.status),
    [scheduleDates.start, scheduleDates.end, project.status]
  );

  const changeOrderSummary = useMemo(() => {
    const pending = changeOrders.filter(co => co.status === 'pending').length;
    const approved = changeOrders.filter(co => co.status === 'approved');
    const rejected = changeOrders.filter(co => co.status === 'rejected').length;

    const totalRevenue = approved.reduce((sum, co) => sum + (co.client_amount || 0), 0);
    const totalCosts = approved.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const netImpact = totalRevenue - totalCosts;

    return {
      pending,
      approvedCount: approved.length,
      rejected,
      totalRevenue,
      totalCosts,
      netImpact
    };
  }, [changeOrders]);

  // ---- Derived display values ----
  const isClosed = project.status === 'complete' || project.status === 'cancelled';
  const showChangeOrders = changeOrders.length > 0;

  // Date format: omit the year unless it's a different calendar year than today.
  const fmtDate = (d?: Date | string | null) => {
    if (!d) return '—';
    const date = new Date(d);
    return format(date, date.getFullYear() === new Date().getFullYear() ? 'MMM d' : 'MMM d, yyyy');
  };

  // Whole-dollar money (no cents), matching the headline-financial style of the design.
  const money0 = (v?: number | string | null) => '$' + Math.round(Number(v) || 0).toLocaleString('en-US');
  const signedMoney0 = (v?: number | string | null) => {
    const n = Number(v) || 0;
    return (n >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
  };
  const abbrevSigned = (v?: number | string | null) => {
    const n = Number(v) || 0;
    const sign = n >= 0 ? '+' : '-';
    const abs = Math.abs(n);
    return abs >= 1000 ? `${sign}$${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${sign}$${Math.round(abs)}`;
  };

  const currentEstimate = estimates?.find(e => e.is_current_version);
  const totalInvoiced = Number((project as any).total_invoiced) || 0;
  const actualMargin = Number(project.actual_margin) || 0;
  const finalMarginPct = totalInvoiced > 0 ? (actualMargin / totalInvoiced) * 100 : 0;
  const finalMarginText = `${signedMoney0(actualMargin)} (${finalMarginPct.toFixed(1)}%)`;
  const finalMarginClass = actualMargin >= 0 ? 'text-success' : 'text-destructive';

  const moneyLabel = project.status === 'estimating' ? 'Estimate' : 'Contract';
  const moneyValue = project.status === 'estimating'
    ? (Number(currentEstimate?.total_amount) ? money0(currentEstimate!.total_amount) : '—')
    : (Number(project.contracted_amount) ? money0(project.contracted_amount) : '—');

  // Desktop identity meta cells (mobile shows only the money rows below).
  type MetaCell = { label: string; value: string; valueClassName?: string };
  const desktopCells: MetaCell[] = ([
    { label: 'Owner', value: ownerName ?? '—' },
    project.customer_po_number
      ? { label: 'PO #', value: project.customer_po_number }
      : null,
    { label: 'Start', value: fmtDate(project.start_date) },
    { label: 'End', value: fmtDate(project.end_date) },
    { label: moneyLabel, value: moneyValue, valueClassName: 'font-medium' },
    project.project_type === 'work_order'
      ? { label: 'DNE', value: Number(project.do_not_exceed) ? money0(project.do_not_exceed) : '—', valueClassName: 'font-medium' }
      : null,
    isClosed
      ? { label: 'Final margin', value: finalMarginText, valueClassName: cn('font-medium', finalMarginClass) }
      : null,
  ].filter(Boolean) as MetaCell[]);

  // Schedule pulse display
  let scheduleBig = 'No schedule set';
  let scheduleSub = '';
  let scheduleMobile = 'Not set';
  if (scheduleStatus) {
    if (isClosed) {
      scheduleBig = `Finished ${fmtDate(scheduleDates.end)}`;
      scheduleMobile = `Finished ${fmtDate(scheduleDates.end)}`;
    } else {
      const pct = scheduleStatus.percentComplete.toFixed(0);
      scheduleBig = `${pct}% elapsed`;
      scheduleSub = scheduleStatus.isOverdue
        ? `Overdue by ${Math.abs(scheduleStatus.remainingDays)} days`
        : `${scheduleStatus.remainingDays} days remaining`;
      scheduleMobile = scheduleStatus.isOverdue
        ? `${pct}% · ${Math.abs(scheduleStatus.remainingDays)}d over`
        : `${pct}% · ${scheduleStatus.remainingDays}d left`;
    }
  }

  // Change orders pulse display
  const coParts: string[] = [];
  if (changeOrderSummary.pending > 0) coParts.push(`${changeOrderSummary.pending} pending`);
  if (changeOrderSummary.approvedCount > 0) coParts.push(`${changeOrderSummary.approvedCount} approved`);
  const coCountsLabel = coParts.length > 0 ? coParts.join(' · ') : `${changeOrders.length} total`;
  const coNetClass = changeOrderSummary.netImpact >= 0 ? 'text-success' : 'text-destructive';

  const showDocumentation = project.status !== 'estimating'
    || mediaCounts.photos > 0 || mediaCounts.videos > 0 || pendingReceipts > 0 || documentCount > 0;

  const docItems = [
    { key: 'photos', icon: Camera, count: mediaCounts.photos, label: 'photos', cls: 'text-blue-600', onClick: () => navigate(`/projects/${project.id}/documents?tab=photos`) },
    { key: 'videos', icon: Video, count: mediaCounts.videos, label: 'videos', cls: 'text-purple-600', onClick: () => navigate(`/projects/${project.id}/documents?tab=videos`) },
    { key: 'receipts', icon: Receipt, count: pendingReceipts, label: 'receipts', cls: 'text-green-600', onClick: () => navigate(`/time-entries?tab=receipts&project=${project.id}`) },
    { key: 'docs', icon: FileIcon, count: documentCount, label: 'docs', cls: 'text-orange-600', onClick: () => navigate(`/projects/${project.id}/documents`) },
  ];

  return (
    <div className="space-y-3">
      {/* Key facts — identity (number/name/status) is already in the page header/breadcrumb */}
      <Card className="p-3">
        {project.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-1.5 text-sm text-foreground hover:text-primary active:text-primary transition-colors mb-3 pb-3 border-b"
          >
            <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            <span className="flex-1 leading-snug">{project.address}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          </a>
        )}

        {isMobile ? (
          <div className="space-y-1.5">
            {project.customer_po_number && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-muted-foreground">PO #</span>
                <span className="text-sm font-medium">{project.customer_po_number}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">{moneyLabel}</span>
              <span className="text-sm font-medium">{moneyValue}</span>
            </div>
            {isClosed && (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-muted-foreground">Final margin</span>
                <span className={cn("text-sm font-medium", finalMarginClass)}>{finalMarginText}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-2">
            {desktopCells.map((cell) => (
              <div key={cell.label}>
                <div className="text-[11px] text-muted-foreground">{cell.label}</div>
                <div className={cn("text-sm", cell.valueClassName)}>{cell.value}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Needs Attention (slot #2) — or "Closed clean" for completed projects */}
      {needsAttention.length > 0 ? (
        <Card className="border-l-4 border-l-destructive bg-destructive/5">
          <CardContent className="p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-sm font-semibold text-destructive">
                Needs attention · {needsAttention.length}
              </span>
            </div>
            {isMobile ? (
              <div className="text-xs text-destructive/90">
                {needsAttention.map(i => i.short).join(' · ')}
              </div>
            ) : (
              <div className="space-y-0.5">
                {needsAttention.map((item) => (
                  <button
                    key={item.type}
                    onClick={item.onClick}
                    className="block w-full text-left text-sm text-destructive/90 hover:text-destructive hover:underline"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : project.status === 'complete' ? (
        <Card className="border-l-4 border-l-success bg-success/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success shrink-0" />
              <span className="text-sm font-medium text-success">Closed clean</span>
            </div>
            {!isMobile && (
              <div className="text-xs text-muted-foreground mt-0.5 ml-6">No outstanding items</div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Schedule + Change Orders pulses */}
      <div className={cn(
        isMobile
          ? "space-y-2"
          : cn("grid gap-3", showChangeOrders ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")
      )}>
        {/* Schedule pulse */}
        <Card className="p-3">
          <button
            onClick={() => navigate(`/projects/${project.id}/schedule`)}
            className="w-full flex items-center justify-between text-left gap-2"
          >
            {isMobile ? (
              <>
                <span className="text-sm font-semibold">Schedule</span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {scheduleMobile}
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </span>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Schedule
                  </div>
                  <div className="text-base font-bold">{scheduleBig}</div>
                  {scheduleSub && (
                    <div className={cn("text-xs", scheduleStatus?.isOverdue ? "text-destructive" : "text-muted-foreground")}>
                      {scheduleSub}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        </Card>

        {/* Change Orders pulse */}
        {showChangeOrders && (
          <Card className="p-3">
            <button
              onClick={() => navigate(`/projects/${project.id}/changes`)}
              className="w-full flex items-center justify-between text-left gap-2"
            >
              {isMobile ? (
                <>
                  <span className="text-sm font-semibold">Change orders</span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">{coCountsLabel} · </span>
                    <span className={coNetClass}>{abbrevSigned(changeOrderSummary.netImpact)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </span>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                      Change orders
                    </div>
                    <div className="text-base font-bold">{coCountsLabel}</div>
                    <div className={cn("text-xs", coNetClass)}>{signedMoney0(changeOrderSummary.netImpact)} net</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </>
              )}
            </button>
          </Card>
        )}
      </div>

      {/* Documentation — inline counts */}
      {showDocumentation && (
        <Card className="p-3">
          <div className={cn(
            "flex items-center",
            isMobile ? "justify-between" : "flex-wrap gap-x-6 gap-y-2"
          )}>
            {docItems.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.key}
                  onClick={d.onClick}
                  className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                >
                  <Icon className={cn("h-4 w-4 shrink-0", d.cls)} />
                  <span className="text-sm font-medium">{d.count}</span>
                  {!isMobile && <span className="text-sm text-muted-foreground">{d.label}</span>}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Project Notes Timeline */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <h3 className="text-sm font-semibold">Project Notes</h3>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <ProjectNotesTimeline projectId={project.id} />
        </CardContent>
      </Card>
    </div>
  );
}
