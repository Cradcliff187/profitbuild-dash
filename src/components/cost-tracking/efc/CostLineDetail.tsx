import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft, AlertTriangle, TrendingUp, Wand2, FileWarning, Lock, CheckCircle2, Loader2 } from 'lucide-react';
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

  // "Mark final" — pin this line's EFC to a stated amount (defaults to spent).
  const [finalEditing, setFinalEditing] = useState(false);
  const [finalInput, setFinalInput] = useState('');
  const [savingFinal, setSavingFinal] = useState(false);

  const openFinalEditor = () => {
    const seed = line.isFinal ? Number(line.finalCostAmount) : line.actual;
    setFinalInput(seed > 0 ? String(seed) : line.isFinal ? '0' : '');
    setFinalEditing(true);
  };

  const writeFinal = async (amount: number | null) => {
    setSavingFinal(true);
    const table = line.source === 'change_order' ? 'change_order_line_items' : 'estimate_line_items';
    const { error } = await supabase.from(table).update({ final_cost_amount: amount }).eq('id', line.id);
    setSavingFinal(false);
    if (error) {
      console.error('[CostLineDetail] final_cost_amount write error:', error);
      toast.error('Could not update the final cost. Please retry.');
      return;
    }
    toast.success(
      amount == null
        ? 'Line reopened — EFC is back to the projection.'
        : `Line marked final at ${formatCurrency(amount)}.`,
    );
    setFinalEditing(false);
    handleAllocated();
  };

  const saveFinal = () => {
    const parsed = Number(finalInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Enter a valid final amount (0 or more).');
      return;
    }
    writeFinal(parsed);
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
              {line.isFinal && (
                <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700 gap-1">
                  <Lock className="h-3 w-3" /> Final
                </Badge>
              )}
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
          sub={line.isFinal ? 'Final — locked' : remaining > 0.005 ? `${formatCurrency(remaining)} to go` : 'No to-go'}
          subClass={line.isFinal ? 'text-violet-600' : undefined}
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
          {/* Mark final — pin EFC to the real final cost when the line is done */}
          {canAllocate && (
            <div className={cn('rounded-lg border p-3', line.isFinal ? 'border-violet-200 bg-violet-50/50' : 'bg-card')}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Lock className={cn('h-3.5 w-3.5', line.isFinal ? 'text-violet-600' : 'text-muted-foreground')} />
                    {line.isFinal ? 'Final cost locked' : 'Mark this line final'}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground max-w-md">
                    {line.isFinal
                      ? `EFC is pinned to ${formatCurrency(line.finalCostAmount ?? 0)} instead of the projection. Reopen to return to max(spent, committed, plan).`
                      : 'If no more cost is coming for this line (e.g. the final bill is in and the quote never made it into the system), lock its final cost so EFC and margin reflect reality.'}
                  </p>
                </div>
                {!finalEditing && (
                  <div className="flex items-center gap-2 shrink-0">
                    {line.isFinal ? (
                      <>
                        <Button variant="outline" size="sm" className="h-8" onClick={openFinalEditor} disabled={savingFinal}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => writeFinal(null)} disabled={savingFinal}>
                          {savingFinal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reopen'}
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={openFinalEditor}>
                        <Lock className="h-3.5 w-3.5" /> Mark final
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {finalEditing && (
                <div className="mt-3 flex items-end gap-2 flex-wrap">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Final cost</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={finalInput}
                        autoFocus
                        onChange={(e) => setFinalInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveFinal(); }}
                        className="h-8 w-36 text-right font-mono"
                      />
                    </div>
                  </div>
                  <Button size="sm" className="h-8 gap-1.5" onClick={saveFinal} disabled={savingFinal}>
                    {savingFinal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setFinalEditing(false)} disabled={savingFinal}>
                    Cancel
                  </Button>
                  <span className="text-[11px] text-muted-foreground ml-1">Defaults to spent ({formatCurrency(line.actual)}). Enter 0 to descope.</span>
                </div>
              )}
            </div>
          )}

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
