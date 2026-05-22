import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Wand2 } from 'lucide-react';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { Project } from '@/types/project';
import { ExpenseCategory } from '@/types/expense';
import { useProjectEFC } from '@/hooks/useProjectEFC';
import { isProjectVisibleByCategory } from '@/utils/sandboxPreferences';
import { invalidateExpenseCaches } from '@/utils/expenseCaches';
import { CostKpiStrip } from './CostKpiStrip';
import { CostLineTable } from './CostLineTable';
import { ProjectLineAllocationSheet } from './ProjectLineAllocationSheet';
import { RecategorizeOtherBucketSheet } from '../RecategorizeOtherBucketSheet';
import { exportCostAnalysisCsv } from './costAnalysisExport';

/**
 * Cost Tracking — Overview. A KPI strip over a flat, scannable table of every
 * cost line grouped by category. Each line drills into its own detail page
 * (CostLineDetailRoute). Replaces the old expandable Cost Analysis page.
 */
export function CostOverview({ projectId, project }: { projectId: string; project: Project }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const efc = useProjectEFC(projectId, project);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [recategorizeCategory, setRecategorizeCategory] = useState<ExpenseCategory | null>(null);

  const canAllocate = isProjectVisibleByCategory(project);

  const issuesCount = useMemo(
    () => efc.categories.reduce((n, c) => n + c.lines.filter((l) => l.status === 'overrun').length, 0),
    [efc.categories],
  );

  const handleAllocated = () => {
    queryClient.invalidateQueries({ queryKey: ['project-cost-buckets', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-data', projectId] });
    invalidateExpenseCaches(queryClient);
    efc.refetch();
  };

  if (efc.isLoading) {
    return (
      <Card>
        <CardContent className="py-16">
          <BrandedLoader size="lg" message="Loading cost tracking…" />
        </CardContent>
      </Card>
    );
  }

  if (efc.error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6 space-y-3">
          <div className="text-sm text-destructive">Failed to load cost tracking: {efc.error}</div>
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
            Add an estimate or log expenses against this project to see cost tracking here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        {canAllocate && efc.totalUnallocated > 0 && (
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setAllocateOpen(true)}>
            <Wand2 className="h-4 w-4" />
            Allocate
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => exportCostAnalysisCsv(project, efc.categories)}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <CostKpiStrip pl={efc.pl} issuesCount={issuesCount} />

      <CostLineTable
        categories={efc.categories}
        onLineClick={(lineId) => navigate(`/projects/${projectId}/control/${lineId}`)}
      />

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
