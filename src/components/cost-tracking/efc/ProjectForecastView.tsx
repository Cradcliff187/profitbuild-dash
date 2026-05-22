import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { Project } from '@/types/project';
import { ExpenseCategory } from '@/types/expense';
import { useProjectEFC, EFCLine } from '@/hooks/useProjectEFC';
import { isProjectVisibleByCategory } from '@/utils/sandboxPreferences';
import { invalidateExpenseCaches } from '@/utils/expenseCaches';
import { ProjectPLHeader } from './ProjectPLHeader';
import { EFCCategorySection } from './EFCCategorySection';
import { ProjectLineAllocationSheet } from './ProjectLineAllocationSheet';
import { RecategorizeOtherBucketSheet } from '../RecategorizeOtherBucketSheet';
import { CostAnalysisActionStrip, CostAnalysisSort } from './CostAnalysisActionStrip';
import { exportCostAnalysisCsv } from './costAnalysisExport';

interface ProjectForecastViewProps {
  projectId: string;
  project: Project;
}

const STATUS_RANK: Record<EFCLine['status'], number> = { overrun: 0, in_progress: 1, committed: 2, plan: 3 };

/**
 * Cost Analysis — the single Cost Tracking page (replaces the old Forecast/Detail
 * tabs). Leads with the projected P&L, then a "things to do" action strip with
 * sort + export, then per-category sections with expandable per-line drill-in,
 * a labor opportunity panel, and unallocated/recategorize affordances.
 */
export function ProjectForecastView({ projectId, project }: ProjectForecastViewProps) {
  const queryClient = useQueryClient();
  const efc = useProjectEFC(projectId, project);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [recategorizeCategory, setRecategorizeCategory] = useState<ExpenseCategory | null>(null);
  const [sort, setSort] = useState<CostAnalysisSort>('risk');

  // Allocation only makes sense where expenses can be correlated — construction
  // projects (and the SYS-TEST sandbox). Overhead projects have category locks.
  const canAllocate = isProjectVisibleByCategory(project);

  // Sort: By Risk = categories by overage desc, lines overrun-first then variance
  // desc. By Category = the hook's natural order (internal-first, then by target).
  const orderedCategories = useMemo(() => {
    if (sort === 'category') return efc.categories;
    return efc.categories
      .map((c) => ({
        ...c,
        lines: [...c.lines].sort(
          (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.variance - a.variance,
        ),
      }))
      .sort((a, b) => (b.expectedCost - b.subtotal.plan) - (a.expectedCost - a.subtotal.plan));
  }, [efc.categories, sort]);

  const handleAllocated = () => {
    queryClient.invalidateQueries({ queryKey: ['project-cost-buckets', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-data', projectId] });
    // Every expenses-derived cache — including the All Expenses "Allocated"
    // column (expense-allocation-status) and the dashboard "unallocated" stat —
    // so allocating here reflects everywhere without a reload.
    invalidateExpenseCaches(queryClient);
    efc.refetch();
  };

  if (efc.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading cost analysis…</span>
        </CardContent>
      </Card>
    );
  }

  if (efc.error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6 space-y-3">
          <div className="text-sm text-destructive">Failed to load cost analysis: {efc.error}</div>
          <Button variant="outline" size="sm" onClick={efc.refetch}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (efc.categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No cost activity yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Add an estimate or log expenses against this project to see the cost analysis here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <ProjectPLHeader pl={efc.pl} />

      <CostAnalysisActionStrip
        categories={efc.categories}
        totalUnallocated={efc.totalUnallocated}
        sort={sort}
        onSortChange={setSort}
        onExport={() => exportCostAnalysisCsv(project, efc.categories)}
        onAllocate={canAllocate ? () => setAllocateOpen(true) : undefined}
      />

      <div className="space-y-2">
        {orderedCategories.map((cat) => (
          <EFCCategorySection
            key={cat.category}
            category={cat}
            laborOpportunity={cat.category === ExpenseCategory.LABOR ? efc.laborOpportunity : null}
            defaultOpen
            onAllocate={canAllocate ? () => setAllocateOpen(true) : undefined}
            onRecategorize={canAllocate ? (selected) => setRecategorizeCategory(selected) : undefined}
          />
        ))}
      </div>

      {canAllocate && (
        <ProjectLineAllocationSheet
          projectId={projectId}
          project={project}
          open={allocateOpen}
          onOpenChange={setAllocateOpen}
          onAllocated={handleAllocated}
        />
      )}

      {canAllocate && (
        <RecategorizeOtherBucketSheet
          projectId={projectId}
          sourceCategory={recategorizeCategory ?? ExpenseCategory.OTHER}
          open={recategorizeCategory !== null}
          onOpenChange={(o) => { if (!o) setRecategorizeCategory(null); }}
          onRecategorized={handleAllocated}
        />
      )}
    </div>
  );
}
