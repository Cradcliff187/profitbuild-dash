import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CostFlowVisualization } from './CostFlowVisualization';
import { MarginComparisonBars } from './MarginComparisonBars';
import { CategoryBreakdownTable } from './CategoryBreakdownTable';
import { LineItemAllocationSheet } from './LineItemAllocationSheet';
import { useProjectFinancialDetail } from './hooks/useProjectFinancialDetail';
import type { ProfitAnalysisProject } from '@/types/profitAnalysis';

interface Props {
  project: ProfitAnalysisProject | null;
  open: boolean;
  onClose: () => void;
}

export function ProjectCostBreakdown({ project, open, onClose }: Props) {
  const { data: detail, isLoading } = useProjectFinancialDetail(project?.id || null);
  const [showLineItemSheet, setShowLineItemSheet] = useState(false);
  
  if (!project) return null;
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {project.project_number}
            <Badge variant="outline">{project.status}</Badge>
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{project.project_name}</p>
          {project.client_name && (
            <p className="text-sm text-muted-foreground">Client: {project.client_name}</p>
          )}
        </SheetHeader>
        
        <div className="mt-6 space-y-8">
          {/* Section 1: What We Sold It For */}
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              What We Sold It For
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Original Contract</span>
                <span className="font-medium">
                  {formatCurrency(project.contracted_amount - project.change_order_revenue)}
                </span>
              </div>
              {project.change_order_revenue > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>+ Change Orders ({project.change_order_count})</span>
                  <span>{formatCurrency(project.change_order_revenue)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Contract</span>
                <span>{formatCurrency(project.contracted_amount)}</span>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Invoiced</span>
                  <span>{formatCurrency(project.total_invoiced)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining to Bill</span>
                  <span>{formatCurrency(project.contracted_amount - project.total_invoiced)}</span>
                </div>
                <Progress 
                  value={project.contracted_amount > 0 ? (project.total_invoiced / project.contracted_amount) * 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {project.contracted_amount > 0 ? ((project.total_invoiced / project.contracted_amount) * 100).toFixed(1) : 0}% billed
                </p>
              </div>
            </div>
          </section>
          
          <Separator />
          
          {/* Section 2: Cost Flow Visualization */}
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              What We Thought It Would Cost
            </h3>
            <CostFlowVisualization
              estimatedCost={project.original_est_costs || 0}
              quotedCost={project.adjusted_est_costs || 0}
              actualCost={project.total_expenses || 0}
              budgetUtilization={project.budget_utilization_percent || 0}
            />
          </section>
          
          <Separator />
          
          {/* Section 3: Margin Comparison */}
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              What We Made
            </h3>
            <MarginComparisonBars
              originalMargin={project.original_margin || 0}
              projectedMargin={project.projected_margin || 0}
              currentMargin={project.current_margin || 0}
              contractedAmount={project.contracted_amount || 0}
            />
          </section>
          
          <Separator />
          
          {/* Section: Line Item Allocation Status */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Expense Allocation Status
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowLineItemSheet(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Line Items
              </Button>
            </div>
            
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : detail?.allocationSummary ? (
              <div className="space-y-3">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{detail.allocationSummary.totalExternalLineItems}</p>
                    <p className="text-xs text-muted-foreground">External Line Items</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{detail.allocationSummary.allocatedCount}</p>
                    <p className="text-xs text-muted-foreground">With Expenses</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{detail.allocationSummary.pendingCount}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Allocation Progress</span>
                    <span>{detail.allocationSummary.allocationPercent.toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={detail.allocationSummary.allocationPercent} 
                    className="h-2"
                  />
                </div>
                
                {/* Status message */}
                {detail.allocationSummary.pendingCount === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>All external line items have expenses allocated</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{detail.allocationSummary.pendingCount} line items awaiting vendor invoices</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No external line items found</p>
            )}
          </section>
          
          <Separator />
          
          {/* Section 4: Category Breakdown (Expandable) */}
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Cost Breakdown by Category
            </h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <CategoryBreakdownTable 
                categories={detail?.categories || []}
                expensesByCategory={project.expenses_by_category}
              />
            )}
          </section>
          
          <Separator />
          
          {/* Section 5: Change Orders */}
          {project.change_order_count > 0 && (
            <>
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Change Orders
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Count</span>
                    <span>{project.change_order_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue Added</span>
                    <span className="text-green-600">+{formatCurrency(project.change_order_revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost Added</span>
                    <span className="text-red-600">+{formatCurrency(project.change_order_cost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Net Margin Impact</span>
                    <span className={project.change_order_revenue - project.change_order_cost >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(project.change_order_revenue - project.change_order_cost)}
                    </span>
                  </div>
                </div>
              </section>
              <Separator />
            </>
          )}
          
          {/* Section 6: Contingency */}
          {project.contingency_amount > 0 && (
            <>
              <section>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Contingency
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Allocated</span>
                    <span>{formatCurrency(project.contingency_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Used</span>
                    <span>{formatCurrency(project.contingency_used)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Remaining</span>
                    <span>{formatCurrency(project.contingency_remaining)}</span>
                  </div>
                  <Progress 
                    value={project.contingency_amount > 0 ? (project.contingency_used / project.contingency_amount) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </section>
              <Separator />
            </>
          )}
          
          {/* Section 7: Adjusted Gross Margin (for in-progress only) */}
          {project.status === 'in_progress' && (
            <section className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Adjusted Gross Margin
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Adjusted Estimated Cost</span>
                  <span>{formatCurrency(project.adjusted_est_costs || 0)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Adjusted Gross Margin</span>
                  <span className={project.projected_margin && project.projected_margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(project.projected_margin || 0)}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>
        
        {/* Line Item Allocation Sheet */}
        <LineItemAllocationSheet
          projectId={project.id}
          projectNumber={project.project_number}
          open={showLineItemSheet}
          onClose={() => setShowLineItemSheet(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

