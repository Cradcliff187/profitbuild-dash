import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ExpenseCategory } from '@/types/expense';
import { Project } from '@/types/project';
import { useProjectCostBuckets, CostBucket } from '@/hooks/useProjectCostBuckets';
import { BucketHeaderRow } from './BucketHeaderRow';
import { LaborLineItemRow } from './LaborLineItemRow';
import { NonLaborLineItemRow } from './NonLaborLineItemRow';
import { BucketEmptyState } from './BucketEmptyState';
import { CostBucketTotalsRow } from './CostBucketTotalsRow';
import { Loader2, FileText } from 'lucide-react';

interface CostBucketViewProps {
  projectId: string;
  project: Project;
}

/**
 * "Buckets" view — replaces the dense LineItemControlDashboard table with a
 * per-category bucket layout. Each bucket is collapsed by default; expanding
 * reveals the line items inside.
 *
 * Use this view when the PM wants to scan project cost flow at a glance. For
 * deeper drill-down (per-line correlations, quote management), the user can
 * switch to the "Detail" tab which keeps the existing dense table.
 */
export function CostBucketView({ projectId, project }: CostBucketViewProps) {
  const { buckets, totals, isLoading, error, refetch } = useProjectCostBuckets(projectId, project);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading cost buckets…</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6 space-y-3">
          <div className="text-sm text-destructive">Failed to load cost buckets: {error}</div>
          <Button variant="outline" size="sm" onClick={refetch}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (buckets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No cost activity yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Add an estimate or log expenses against this project to see cost buckets here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Cost Buckets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {buckets.map(bucket => (
          <BucketRow key={bucket.category} bucket={bucket} />
        ))}
        <CostBucketTotalsRow
          target={totals.target}
          spent={totals.spent}
          remaining={totals.remaining}
          percentUsed={totals.percentUsed}
        />
      </CardContent>
    </Card>
  );
}

interface BucketRowProps {
  bucket: CostBucket;
}

/**
 * Single collapsible bucket card. Local open/close state lives here so the
 * parent can render N buckets without coordinating any global state.
 */
function BucketRow({ bucket }: BucketRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLabor = bucket.category === ExpenseCategory.LABOR;
  const isInternal = bucket.isInternal;
  const lineItemCount = bucket.lineItems.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md">
      <BucketHeaderRow bucket={bucket} isOpen={isOpen} />
      <CollapsibleContent className="border-t bg-muted/10">
        {lineItemCount === 0 ? (
          <BucketEmptyState unmatchedSpend={bucket.spent} bucketName={bucket.displayName} />
        ) : (
          <div>
            {bucket.lineItems.map(li =>
              isLabor || (isInternal && bucket.category === ExpenseCategory.MANAGEMENT) ? (
                <LaborLineItemRow key={li.id} lineItem={li} />
              ) : (
                <NonLaborLineItemRow key={li.id} lineItem={li} />
              )
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
