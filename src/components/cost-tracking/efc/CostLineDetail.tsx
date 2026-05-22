import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, AlertTriangle, TrendingUp, Wand2, FileWarning } from 'lucide-react';
import { Project } from '@/types/project';
import { EFCLine, EFCCategory, ProjectEFCResult } from '@/hooks/useProjectEFC';
import { parseDateOnly } from '@/utils/dateUtils';
import { isProjectVisibleByCategory } from '@/utils/sandboxPreferences';
import { invalidateExpenseCaches } from '@/utils/expenseCaches';
import { lineDisplayStatus, lineVendor, rollupByEmployee, fmtHours } from './lineDisplay';
import { ProjectLineAllocationSheet } from './ProjectLineAllocationSheet';

function KpiTile({ label, value, valueClass, sub, subClass }: {
  label: string; value: string; valueClass?: string; sub?: string; subClass?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 text-xl font-semibold tabular-nums', valueClass)}>{value}</div>
      {sub && <div className={cn('text-xs tabular-nums', subClass)}>{sub}</div>}
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export function CostLineDetail({
  project,
  line,
  category,
  efc,
  onBack,
}: {
  project: Project;
  line: EFCLine;
  category: EFCCategory;
  efc: ProjectEFCResult;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [allocateOpen, setAllocateOpen] = useState(false);
  const canAllocate = isProjectVisibleByCategory(project);

  const meta = lineDisplayStatus(line);
  const vendor = lineVendor(line);
  const isOver = line.variance > 0.005;
  const remaining = Math.max(0, Math.max(line.committed, line.plan) - line.actual);
  const pctOfPlan = line.plan > 0 ? Math.round((line.actual / line.plan) * 100) : null;
  const invoices = useMemo(
    () => [...line.correlatedExpenses].sort((a, b) => (b.expense_date ?? '').localeCompare(a.expense_date ?? '')),
    [line.correlatedExpenses],
  );
  const employees = useMemo(() => (line.isLabor ? rollupByEmployee(line) : []), [line]);

  // Flags derived across the whole project (no extra query).
  const { isLargestOverrun, pctOfOverage, totalOverage } = useMemo(() => {
    const overruns = efc.categories.flatMap((c) => c.lines).filter((l) => l.variance > 0.005);
    const total = overruns.reduce((s, l) => s + l.variance, 0);
    const max = overruns.reduce((m, l) => Math.max(m, l.variance), 0);
    return {
      totalOverage: total,
      isLargestOverrun: isOver && overruns.length > 1 && line.variance >= max - 0.005,
      pctOfOverage: total > 0 ? Math.round((line.variance / total) * 100) : 0,
    };
  }, [efc.categories, isOver, line.variance]);

  const noQuoteFlag = !line.isLabor && line.committed === 0 && line.actual > 0;

  // Budget bar segments
  const planPortion = line.plan;
  const overPortion = Math.max(0, line.efc - line.plan);
  const barTotal = planPortion + overPortion;
  const greenPct = barTotal > 0 ? (planPortion / barTotal) * 100 : 100;

  const handleAllocated = () => {
    queryClient.invalidateQueries({ queryKey: ['project-cost-buckets', project.id] });
    queryClient.invalidateQueries({ queryKey: ['project-data', project.id] });
    invalidateExpenseCaches(queryClient);
    efc.refetch();
  };

  const detailCount = invoices.length;
  const detailTabLabel = line.isLabor ? `By employee (${employees.length})` : `Invoices & bills (${detailCount})`;

  return (
    <div className="space-y-4">
      {/* Back + header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
          <ChevronLeft className="h-3.5 w-3.5" />
          Cost Tracking
        </button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold truncate">{line.description}</h1>
              {isOver ? (
                <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 gap-1">
                  <AlertTriangle className="h-3 w-3" /> Over budget
                </Badge>
              ) : (
                <span className={cn('rounded-full text-[11px] px-2 py-0.5 font-medium', meta.pill)}>{meta.label}</span>
              )}
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {category.displayName}{vendor ? ` · ${vendor}` : ''}
            </div>
          </div>
          {canAllocate && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setAllocateOpen(true)}>
              <Wand2 className="h-4 w-4" /> Allocate
            </Button>
          )}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <KpiTile label="Plan" value={formatCurrency(line.plan)} />
        <KpiTile
          label="Spent"
          value={line.actual > 0 ? formatCurrency(line.actual) : '—'}
          sub={`${detailCount} ${detailCount === 1 ? (line.isLabor ? 'entry' : 'invoice') : (line.isLabor ? 'entries' : 'invoices')}`}
        />
        <KpiTile
          label="EFC"
          value={formatCurrency(line.efc)}
          sub={remaining > 0.005 ? `${formatCurrency(remaining)} to go` : 'No to-go'}
        />
        <KpiTile
          label="Variance"
          value={`${isOver ? '+' : ''}${formatCurrency(line.variance)}`}
          valueClass={isOver ? 'text-destructive' : line.variance < -0.005 ? 'text-success' : undefined}
          sub={pctOfPlan != null ? `${pctOfPlan}% of plan` : undefined}
          subClass={isOver ? 'text-destructive' : undefined}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detail">{detailTabLabel}</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-3">
          {/* Budget vs actual */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Budget vs actual</div>
            <div className="flex h-7 w-full overflow-hidden rounded-md text-[11px] font-medium text-white">
              <div className="flex items-center justify-center bg-green-500" style={{ width: `${greenPct}%` }}>
                {greenPct > 18 && `Plan ${formatCurrency(planPortion)}`}
              </div>
              {overPortion > 0.005 && (
                <div className="flex items-center justify-center bg-red-400" style={{ width: `${100 - greenPct}%` }}>
                  {100 - greenPct > 18 && `Overrun +${formatCurrency(overPortion)}`}
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-500" /> Original plan</span>
              {overPortion > 0.005 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-400" /> Spent beyond plan</span>}
            </div>
          </div>

          {/* Flags */}
          {(noQuoteFlag || isLargestOverrun) && (
            <div className="space-y-2">
              {noQuoteFlag && (
                <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                  <FileWarning className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-red-800">No accepted quote on file.</span>{' '}
                    <span className="text-red-700">
                      Spend has accrued against an estimate only — no signed authorization
                      {isOver ? ` for the additional ${formatCurrency(line.variance)}` : ''}.
                    </span>
                  </div>
                </div>
              )}
              {isLargestOverrun && (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                  <TrendingUp className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-amber-800">
                    Largest single overrun on the project. Drives {pctOfOverage}% of total project overage
                    ({formatCurrency(line.variance)} of {formatCurrency(totalOverage)}).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Contract & vendor */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Contract &amp; vendor</div>
            <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              <InfoCard label="Vendor">
                {vendor ? <span className="font-medium">{vendor}</span> : <span className="text-muted-foreground">—</span>}
              </InfoCard>
              <InfoCard label="Quote status">
                {line.acceptedQuotes.length > 0 ? (
                  <span>
                    <span className="font-medium">{line.acceptedQuotes[0].payeeName}</span>
                    {line.acceptedQuotes[0].quoteNumber ? <span className="text-muted-foreground"> · #{line.acceptedQuotes[0].quoteNumber}</span> : null}
                    <span className="block text-xs text-muted-foreground">{formatCurrency(line.committed)} committed</span>
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">None on file</span>
                )}
              </InfoCard>
              <InfoCard label="Estimate line">
                <span className="font-medium">{line.source === 'change_order' ? 'From change order' : 'Linked to estimate'}</span>
              </InfoCard>
              <InfoCard label="Category">
                <span className="font-medium">{category.displayName}</span>
              </InfoCard>
            </div>
          </div>

          {/* Recent */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              {line.isLabor ? 'Labor by employee' : 'Recent invoices'}
            </div>
            <DetailList line={line} invoices={invoices.slice(0, 5)} employees={employees} />
          </div>
        </TabsContent>

        {/* DETAIL (full list) */}
        <TabsContent value="detail" className="mt-3">
          <DetailList line={line} invoices={invoices} employees={employees} />
        </TabsContent>
      </Tabs>

      {canAllocate && (
        <ProjectLineAllocationSheet
          projectId={project.id}
          project={project}
          open={allocateOpen}
          onOpenChange={setAllocateOpen}
          onAllocated={handleAllocated}
        />
      )}
    </div>
  );
}

function DetailList({
  line,
  invoices,
  employees,
}: {
  line: EFCLine;
  invoices: EFCLine['correlatedExpenses'];
  employees: ReturnType<typeof rollupByEmployee>;
}) {
  if (line.isLabor) {
    if (employees.length === 0) return <Empty>No labor logged yet</Empty>;
    return (
      <div className="rounded-lg border bg-card divide-y">
        {employees.map((r) => (
          <div key={r.payeeName} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <span className="truncate">
              <span className="font-medium">{r.payeeName}</span>
              <span className="text-muted-foreground"> · {fmtHours(r.hours)} hrs</span>
            </span>
            <span className="font-medium tabular-nums shrink-0">{formatCurrency(r.amount)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) return <Empty>No invoices or bills yet</Empty>;
  return (
    <div className="rounded-lg border bg-card divide-y">
      {invoices.map((e, i) => (
        <div key={e.id || i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground tabular-nums shrink-0 w-24">
            {e.expense_date ? format(parseDateOnly(e.expense_date), 'MMM d, yyyy') : '—'}
          </span>
          <span className="flex-1 min-w-0 truncate text-foreground">{e.payee_name || 'Unknown vendor'}</span>
          <span className="font-medium tabular-nums shrink-0">{formatCurrency(e.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
