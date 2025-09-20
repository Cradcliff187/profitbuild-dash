import { useState } from "react";
import { FileText, Edit, Trash2, Eye, Plus, ChevronDown, FileEdit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Estimate } from "@/types/estimate";
import { useToast } from "@/hooks/use-toast";
import { BudgetComparisonBadge, BudgetComparisonStatus } from "@/components/BudgetComparisonBadge";
import { VarianceBadge } from "@/components/ui/variance-badge";
import { EstimateVersionManager } from "./EstimateVersionManager";
import { cn } from "@/lib/utils";

interface EstimatesListProps {
  estimates: (Estimate & { quotes?: Array<{ id: string; total_amount: number }> })[];
  onEdit: (estimate: Estimate) => void;
  onDelete: (id: string) => void;
  onView: (estimate: Estimate) => void;
  onCreateNew: () => void;
}

export const EstimatesList = ({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesListProps) => {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setEstimateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (estimateToDelete) {
      onDelete(estimateToDelete);
      toast({
        title: "Estimate Deleted",
        description: "The estimate has been successfully deleted."
      });
    }
    setDeleteDialogOpen(false);
    setEstimateToDelete(null);
  };

  const getQuoteStatus = (estimate: Estimate & { quotes?: Array<{ id: string; total_amount: number }> }): BudgetComparisonStatus => {
    if (!estimate.quotes || estimate.quotes.length === 0) {
      return 'awaiting-quotes';
    }
    
    // Check if any quote is under budget
    const hasUnderBudgetQuote = estimate.quotes.some(q => q.total_amount < estimate.total_amount);
    if (hasUnderBudgetQuote) {
      return 'under-budget';
    }
    
    // Check if ALL quotes are over budget
    const allQuotesOverBudget = estimate.quotes.every(q => q.total_amount > estimate.total_amount);
    if (allQuotesOverBudget) {
      return 'over-budget';
    }
    
    // If we reach here, all quotes equal the estimate (edge case)
    return 'awaiting-quotes';
  };

  const getBestQuoteVariance = (estimate: Estimate & { quotes?: Array<{ id: string; total_amount: number }> }) => {
    if (!estimate.quotes || estimate.quotes.length === 0) {
      return null;
    }
    
    // Find the best (lowest) quote
    const bestQuote = estimate.quotes.reduce((best, current) => 
      current.total_amount < best.total_amount ? current : best
    );
    
    const variance = bestQuote.total_amount - estimate.total_amount;
    const percentage = (variance / estimate.total_amount) * 100;
    
    return { variance, percentage };
  };

  const formatContingencyDisplay = (estimate: Estimate) => {
    if (!estimate.contingency_percent || estimate.contingency_percent === 0) {
      return null;
    }
    
    const contingencyAmount = estimate.contingency_amount || 
      (estimate.total_amount * (estimate.contingency_percent / 100)) / (1 + (estimate.contingency_percent / 100));
    
    return `Includes ${estimate.contingency_percent}% contingency: $${contingencyAmount.toFixed(2)}`;
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'Labor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Materials':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Equipment':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'Other':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (estimates.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Estimates Yet</h3>
          <p className="text-muted-foreground mb-6">Create your first estimate to get started.</p>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Estimate
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Estimates</h2>
          <p className="text-muted-foreground">{estimates.length} estimate{estimates.length === 1 ? '' : 's'} created</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Estimate
        </Button>
      </div>

      <div className="grid gap-6">
        {estimates.map((estimate) => (
          <Card 
            key={estimate.id} 
            className={cn(
              "hover:shadow-md transition-shadow",
              !estimate.is_current_version && "opacity-60 bg-muted/20"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{estimate.project_name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>Client: {estimate.client_name}</span>
                    <span>•</span>
                    <span>{estimate.estimate_number}</span>
                    <span>•</span>
                    <span>{format(estimate.date_created, 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">${estimate.total_amount.toFixed(2)}</div>
                  {formatContingencyDisplay(estimate) && (
                    <div className="text-sm text-muted-foreground">
                      {formatContingencyDisplay(estimate)}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">{estimate.lineItems.length} line item{estimate.lineItems.length === 1 ? '' : 's'}</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Status badges */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {/* Version badge - always show for better consistency */}
                <Badge 
                  variant={estimate.is_current_version ? "default" : "secondary"} 
                  className="text-sm font-medium"
                >
                  v{estimate.version_number}
                </Badge>
                
                {estimate.is_current_version && (
                  <Badge variant="default" className="text-sm">
                    Current
                  </Badge>
                )}
                
                {/* Draft badge */}
                {estimate.is_draft && (
                  <Badge variant="outline" className="text-sm border-orange-300 text-orange-700 bg-orange-50">
                    <FileEdit className="h-3 w-3 mr-1" />
                    Draft
                  </Badge>
                )}
                
                <BudgetComparisonBadge status={getQuoteStatus(estimate)} />
                <Badge variant="outline" className="text-sm">
                  Status: {estimate.status}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  Revision: {estimate.revision_number}
                </Badge>
                {(() => {
                  const variance = getBestQuoteVariance(estimate);
                  return variance && (
                    <VarianceBadge 
                      variance={variance.variance}
                      percentage={variance.percentage}
                      type="quote"
                    />
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(estimate)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(estimate)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {estimate.status === 'approved' ? 'New Version' : 'Edit'}
                </Button>
                {estimate.status === 'approved' && (
                  <EstimateVersionManager 
                    estimate={estimate} 
                    onVersionCreated={(newVersion) => {
                      // Refresh the list to show the new version
                      window.location.reload();
                    }}
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(estimate.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};