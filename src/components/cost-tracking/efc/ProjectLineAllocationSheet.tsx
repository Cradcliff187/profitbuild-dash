import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import {
  matchExpenseToLine,
  lineCandidatesForExpense,
  type AllocationReason,
  type LineItemForMatching,
  type EnhancedExpense,
} from '@/utils/expenseAllocation';
import { isProjectVisibleByCategory } from '@/utils/sandboxPreferences';
import { ExpenseCategory, EXPENSE_CATEGORY_DISPLAY } from '@/types/expense';
import { LineItemCategory, CATEGORY_DISPLAY_MAP } from '@/types/estimate';
import { ProjectCategory, Project } from '@/types/project';
import { format } from 'date-fns';
import { parseDateOnly } from '@/utils/dateUtils';

interface AllocRow {
  expense: EnhancedExpense;
  candidates: LineItemForMatching[];
  reason: AllocationReason | null;
  confidence: number;
  selectedLineId: string | null;
  checked: boolean;
}

interface RawEstLine { id: string; category: string; description: string; total_cost: number | null; cost_per_unit: number | null; quantity: number | null; }
interface RawQuoteLine extends RawEstLine { estimate_line_item_id: string | null; }
interface RawCOLine { id: string; category: string; description: string; total_cost: number | null; }

const REASON_LABEL: Record<AllocationReason, string> = {
  payee_quote_match: 'Vendor matches an accepted quote',
  sole_category_line: 'Only line in this category',
  name_keyword_match: 'Vendor name matches the line',
};

interface ProjectLineAllocationSheetProps {
  projectId: string;
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllocated: () => void;
}

export const ProjectLineAllocationSheet: React.FC<ProjectLineAllocationSheetProps> = ({
  projectId,
  project,
  open,
  onOpenChange,
  onAllocated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [rows, setRows] = useState<AllocRow[]>([]);

  useEffect(() => {
    if (open) loadData();
    else setRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. This project's non-split expenses (project-scoped — well under the 1k cap).
      const { data: expenseRows, error: expErr } = await supabase
        .from('expenses')
        .select(`*, payees(payee_name), projects(project_name, project_number, category)`)
        .eq('project_id', projectId)
        .eq('is_split', false)
        .order('expense_date', { ascending: false });
      if (expErr) throw expErr;
      const expenses = expenseRows ?? [];

      // 2. Already-correlated expense ids (scoped to this project's expenses).
      const expenseIds = expenses.map(e => e.id);
      const correlatedIds = new Set<string>();
      if (expenseIds.length > 0) {
        const { data: corrRows, error: corrErr } = await supabase
          .from('expense_line_item_correlations')
          .select('expense_id')
          .in('expense_id', expenseIds);
        if (corrErr) throw corrErr;
        (corrRows ?? []).forEach(c => c.expense_id && correlatedIds.add(c.expense_id));
      }

      // 3. The estimate the Forecast view uses: approved first, else current version.
      const [{ data: approvedEst }, { data: currentEst }] = await Promise.all([
        supabase.from('estimates')
          .select(`id, estimate_line_items(id, category, description, total_cost, cost_per_unit, quantity)`)
          .eq('project_id', projectId).eq('status', 'approved')
          .order('date_created', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('estimates')
          .select(`id, estimate_line_items(id, category, description, total_cost, cost_per_unit, quantity)`)
          .eq('project_id', projectId).eq('is_current_version', true)
          .order('date_created', { ascending: false }).limit(1).maybeSingle(),
      ]);
      const estimate = approvedEst ?? currentEst;

      // 4. Accepted quotes + their line items (carry the vendor for payee matching).
      const { data: quoteRows } = await supabase.from('quotes')
        .select(`id, payees(payee_name), quote_line_items(id, estimate_line_item_id, category, description, total_cost, cost_per_unit, quantity)`)
        .eq('project_id', projectId).eq('status', 'accepted');
      const acceptedQuotes = quoteRows ?? [];

      // 5. Approved change orders + their line items.
      const { data: coRows } = await supabase.from('change_orders')
        .select(`id, change_order_number, change_order_line_items(id, category, description, total_cost)`)
        .eq('project_id', projectId).eq('status', 'approved');
      const changeOrders = coRows ?? [];

      // Build the candidate line universe (mirrors BulkExpenseAllocationSheet:
      // estimate lines that already have an accepted quote are represented by
      // the quote candidate instead, so each real line appears once).
      const linesWithQuotes = new Set<string>();
      acceptedQuotes.forEach(q => (q.quote_line_items || []).forEach((qli: RawQuoteLine) => {
        if (qli.estimate_line_item_id) linesWithQuotes.add(qli.estimate_line_item_id);
      }));

      const estimateLines: LineItemForMatching[] = (estimate?.estimate_line_items || [])
        .filter((li: RawEstLine) => !linesWithQuotes.has(li.id))
        .map((li: RawEstLine) => ({
          id: li.id, type: 'estimate', source_id: estimate!.id, project_id: projectId,
          project_name: project.project_name ?? '', category: li.category as LineItemCategory,
          description: li.description, total: li.total_cost || (li.cost_per_unit * li.quantity) || 0,
          allocated_amount: 0,
        }));

      const quoteLines: LineItemForMatching[] = acceptedQuotes.flatMap(q =>
        (q.quote_line_items || []).map((qli: RawQuoteLine) => ({
          id: qli.id, type: 'quote', source_id: q.id, project_id: projectId,
          project_name: project.project_name ?? '', category: qli.category as LineItemCategory,
          description: qli.description, total: qli.total_cost || (qli.cost_per_unit * qli.quantity) || 0,
          allocated_amount: 0, payee_name: q.payees?.payee_name,
        }))
      );

      const coLines: LineItemForMatching[] = changeOrders.flatMap(co =>
        (co.change_order_line_items || []).map((li: RawCOLine) => ({
          id: li.id, type: 'change_order', source_id: co.id, project_id: projectId,
          project_name: project.project_name ?? '', category: li.category as LineItemCategory,
          description: li.description, total: li.total_cost || 0, allocated_amount: 0,
          change_order_number: co.change_order_number,
        }))
      );

      const allLines = [...estimateLines, ...quoteLines, ...coLines];

      // The Forecast view only surfaces the allocate action for projects whose
      // expenses can be correlated — construction projects and the SYS-TEST
      // sandbox (isProjectVisibleByCategory). All rows here share this one
      // project, so allocatability is a single project-level check, not per-row.
      // (canCorrelateExpense's per-row category check would reject the sandbox
      // outright on its 'system' category, contradicting the view's gate.)
      if (!isProjectVisibleByCategory(project)) {
        setRows([]);
        return;
      }

      // 6. Build rows for un-correlated, non-zero expenses (split parents excluded).
      const built: AllocRow[] = [];
      for (const e of expenses) {
        if (e.is_split || correlatedIds.has(e.id) || Number(e.amount) === 0) continue;

        const enhanced: EnhancedExpense = {
          id: e.id, amount: Number(e.amount), expense_date: parseDateOnly(e.expense_date),
          description: e.description || undefined, category: e.category as ExpenseCategory,
          payee_id: e.payee_id || undefined, payee_name: e.payees?.payee_name,
          project_id: e.project_id, project_name: e.projects?.project_name,
          project_number: e.projects?.project_number,
          project_category: e.projects?.category as ProjectCategory | undefined,
          match_status: 'unallocated', is_split: e.is_split || false,
        };

        const candidates = lineCandidatesForExpense(enhanced, allLines);
        if (candidates.length === 0) continue; // no line in this category — nothing to allocate to

        const suggestion = matchExpenseToLine(enhanced, allLines);
        built.push({
          expense: enhanced,
          candidates,
          reason: suggestion?.reason ?? null,
          confidence: suggestion?.confidence ?? 0,
          selectedLineId: suggestion?.lineItemId ?? null,
          checked: !!suggestion && suggestion.confidence >= 75,
        });
      }

      // Suggested-and-checked first, then suggested-unchecked, then manual.
      built.sort((a, b) => b.confidence - a.confidence);
      setRows(built);
    } catch (err) {
      console.error('[ProjectAllocate] load error:', err);
      toast.error('Failed to load expenses for allocation.');
    } finally {
      setIsLoading(false);
    }
  };

  const setRowLine = (expenseId: string, lineId: string) => {
    setRows(prev => prev.map(r =>
      r.expense.id === expenseId ? { ...r, selectedLineId: lineId, checked: true } : r
    ));
  };
  const toggleRow = (expenseId: string) => {
    setRows(prev => prev.map(r =>
      r.expense.id === expenseId ? { ...r, checked: !r.checked } : r
    ));
  };

  const selectedCount = useMemo(
    () => rows.filter(r => r.checked && r.selectedLineId).length,
    [rows]
  );

  const handleAllocate = async () => {
    const toWrite = rows.filter(r => r.checked && r.selectedLineId);
    if (toWrite.length === 0) return;
    setIsAllocating(true);
    try {
      const correlations = toWrite.map(r => {
        const line = r.candidates.find(c => c.id === r.selectedLineId)!;
        return {
          expense_id: r.expense.id,
          expense_split_id: null,
          estimate_line_item_id: line.type === 'estimate' ? line.id : null,
          quote_id: line.type === 'quote' ? line.source_id : null,
          change_order_line_item_id: line.type === 'change_order' ? line.id : null,
          correlation_type: line.type === 'estimate' ? 'estimated' : line.type === 'quote' ? 'quoted' : 'change_order',
          auto_correlated: r.confidence > 0,
          confidence_score: r.confidence,
          notes: 'Allocated via Forecast view',
        };
      });
      const { error: corrErr } = await supabase.from('expense_line_item_correlations').insert(correlations);
      if (corrErr) throw corrErr;
      const { error: updErr } = await supabase.from('expenses')
        .update({ is_planned: true }).in('id', toWrite.map(r => r.expense.id));
      if (updErr) throw updErr;

      toast.success(`Allocated ${toWrite.length} expense${toWrite.length === 1 ? '' : 's'} to lines.`);
      onAllocated();
      onOpenChange(false);
    } catch (err) {
      console.error('[ProjectAllocate] write error:', err);
      toast.error('Allocation failed. Please retry.');
    } finally {
      setIsAllocating(false);
    }
  };

  const candidateLabel = (c: LineItemForMatching) => {
    const cat = CATEGORY_DISPLAY_MAP[c.category as LineItemCategory] || c.category;
    const src = c.type === 'quote' ? 'Quote' : c.type === 'change_order' ? `CO ${c.change_order_number ?? ''}`.trim() : 'Est';
    return `${c.description} · ${cat} · ${src}${c.total ? ` · ${formatCurrency(c.total)}` : ''}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[640px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Allocate expenses to lines</SheetTitle>
          <SheetDescription>
            {isLoading ? 'Finding matches…'
              : rows.length === 0 ? 'Nothing to allocate'
              : `${rows.length} unallocated expense${rows.length === 1 ? '' : 's'} · ${selectedCount} selected`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><BrandedLoader message="Finding matches…" size="md" /></div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mb-4" />
              <h3 className="text-base font-semibold mb-1">All allocated</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Every expense on this project is attributed to a line, or there are no matching lines to attribute to.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {rows.map(row => (
                <div key={row.expense.id} className={cn('px-4 py-3', row.checked && 'bg-muted/40')}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={row.checked}
                      disabled={!row.selectedLineId}
                      onCheckedChange={() => toggleRow(row.expense.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{row.expense.payee_name || 'No payee'}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(row.expense.expense_date, 'MMM d, yyyy')} · {EXPENSE_CATEGORY_DISPLAY[row.expense.category] || row.expense.category}
                          </div>
                        </div>
                        <div className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(row.expense.amount)}</div>
                      </div>

                      <Select
                        value={row.selectedLineId ?? undefined}
                        onValueChange={(v) => setRowLine(row.expense.id, v)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Pick a line to allocate to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {row.candidates.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {candidateLabel(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {row.reason && (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={cn(
                            'text-[10px] px-1.5 py-0 h-4 border-0',
                            row.confidence >= 75 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          )}>
                            {row.confidence}% · {REASON_LABEL[row.reason]}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {rows.length > 0 && (
          <div className="border-t bg-background px-6 py-4 shrink-0 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAllocating}>Cancel</Button>
              <Button onClick={handleAllocate} disabled={selectedCount === 0 || isAllocating}>
                {isAllocating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Allocating…</> : <><CheckCircle2 className="h-4 w-4 mr-2" />Allocate {selectedCount}</>}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
