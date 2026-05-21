import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Wand2 } from 'lucide-react';
import { Project } from '@/types/project';
import { useProjectEFC } from '@/hooks/useProjectEFC';
import { isProjectVisibleByCategory } from '@/utils/sandboxPreferences';
import { ProjectPLHeader } from './ProjectPLHeader';
import { EFCCategorySection } from './EFCCategorySection';
import { ProjectLineAllocationSheet } from './ProjectLineAllocationSheet';

interface ProjectForecastViewProps {
  projectId: string;
  project: Project;
}

/**
 * "Forecast" tab — reframes Cost Tracking as a projected P&L. Leads with the
 * headline (contract vs expected cost vs projected margin), then per-category
 * sections with Plan / Committed / Actual / EFC per line, a labor opportunity
 * panel, and unallocated-spend rows that open the allocation sheet.
 */
export function ProjectForecastView({ projectId, project }: ProjectForecastViewProps) {
  const queryClient = useQueryClient();
  const efc = useProjectEFC(projectId, project);
  const [allocateOpen, setAllocateOpen] = useState(false);

  // Allocation only makes sense where expenses can be correlated — construction
  // projects (and the SYS-TEST sandbox). Overhead projects have category locks.
  const canAllocate = isProjectVisibleByCategory(project);

  const handleAllocated = () => {
    queryClient.invalidateQueries({ queryKey: ['project-cost-buckets', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-data', projectId] });
    queryClient.invalidateQueries({ queryKey: ['expenses-search'] });
    efc.refetch();
  };

  if (efc.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading forecast…</span>
        </CardContent>
      </Card>
    );
  }

  if (efc.error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6 space-y-3">
          <div className="text-sm text-destructive">Failed to load forecast: {efc.error}</div>
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
            Add an estimate or log expenses against this project to see the forecast here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <ProjectPLHeader pl={efc.pl} />

      {canAllocate && efc.totalUnallocated > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setAllocateOpen(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            Allocate expenses
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {efc.categories.map((cat) => (
          <EFCCategorySection
            key={cat.category}
            category={cat}
            laborOpportunity={cat.category === 'labor_internal' ? efc.laborOpportunity : null}
            defaultOpen
            onAllocate={canAllocate ? () => setAllocateOpen(true) : undefined}
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
    </div>
  );
}
