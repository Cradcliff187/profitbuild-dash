import { useState } from "react";
import { FileText, Edit, Trash2, Eye, Plus, ChevronDown, FileEdit, Calculator, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { QuoteStatusBadge } from "@/components/QuoteStatusBadge";
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
  
  // Group estimates by project to show as families
  const estimatesByProject = estimates.reduce((groups, estimate) => {
    const projectKey = estimate.project_id;
    if (!groups[projectKey]) {
      groups[projectKey] = [];
    }
    groups[projectKey].push(estimate);
    return groups;
  }, {} as Record<string, typeof estimates>);

  // Sort estimates within each project by version number (descending - newest first)
  Object.keys(estimatesByProject).forEach(projectId => {
    estimatesByProject[projectId].sort((a, b) => (b.version_number || 1) - (a.version_number || 1));
  });

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

  if (estimates.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Estimates Yet</h3>
          <p className="text-muted-foreground mb-6">Create your first estimate to get started.</p>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Estimate
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mobile-container space-y-6">

      <div className="space-y-6">
        {Object.entries(estimatesByProject).map(([projectId, projectEstimates]) => {
          const currentVersion = projectEstimates.find(e => e.is_current_version) || projectEstimates[0];
          const previousVersions = projectEstimates.filter(e => !e.is_current_version);
          
          const quoteStatus = getQuoteStatus(currentVersion);
          const bestQuoteVariance = getBestQuoteVariance(currentVersion);
          
          return (
            <Card key={projectId} className="mobile-card overflow-hidden border-2 border-primary/10">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <CardTitle className="text-lg sm:text-xl mobile-text-safe flex-1 min-w-0">{currentVersion.project_name}</CardTitle>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge className="bg-primary text-primary-foreground font-semibold text-xs">
                          v{currentVersion.version_number || 1}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                          Current
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {currentVersion.client_name} • {projectEstimates.length} version{projectEstimates.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="mobile-button-group">
                    <Button 
                      size="sm" 
                      onClick={() => window.location.href = `/estimates?project=${projectId}`}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New Version
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Current Version Details */}
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="font-bold text-foreground text-base sm:text-lg">Latest Version</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2 py-1">
                            Version {currentVersion.version_number || 1}
                          </Badge>
                          <Badge variant="outline" className={`text-xs capitalize ${
                            currentVersion.status === 'approved' ? 'border-green-200 text-green-700 bg-green-50' :
                            currentVersion.status === 'draft' ? 'border-gray-200 text-gray-700 bg-gray-50' :
                            'border-blue-200 text-blue-700 bg-blue-50'
                          }`}>
                            {currentVersion.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="break-all">{currentVersion.estimate_number}</span>
                        <span>•</span>
                        <span>Created {format(currentVersion.date_created, 'MMM dd, yyyy')}</span>
                        {currentVersion.contingency_percent > 0 && (
                          <>
                            <span>•</span>
                            <span className="break-words">Contingency: {formatContingencyDisplay(currentVersion)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">
                          ${currentVersion.total_amount.toLocaleString()}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Total Amount</div>
                      </div>
                    </div>

                  {/* Budget Comparison */}
                  {(quoteStatus !== 'awaiting-quotes') && (
                    <div className="pt-3 border-t border-primary/20">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-xs sm:text-sm font-medium text-foreground">Budget vs Actual:</span>
                        <div className="flex items-center gap-2">
                          <BudgetComparisonBadge status={quoteStatus} />
                          {bestQuoteVariance && (
                            <span className={`text-xs sm:text-sm font-semibold ${
                              bestQuoteVariance.variance < 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {bestQuoteVariance.variance < 0 ? '-' : '+'}${Math.abs(bestQuoteVariance.variance).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mobile-button-group pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(currentVersion)}
                      className="border-primary/20 hover:bg-primary/5"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(currentVersion)}
                      className="border-primary/20 hover:bg-primary/5"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Version
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.location.href = `/estimates?project=${projectId}`}
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Version
                    </Button>
                  </div>
                  </div>
                </div>

                {/* Previous Versions */}
                {previousVersions.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-3 h-auto border border-dashed border-primary/30 hover:bg-primary/5">
                        <div className="flex items-center space-x-2">
                          <History className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            Version History ({previousVersions.length})
                          </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-primary" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 mt-3">
                      <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                        {previousVersions.map((estimate, index) => (
                          <Card key={estimate.id} className="bg-muted/20 border-muted-foreground/20">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-3">
                                    <Badge variant="outline" className="text-xs px-2 py-1">
                                      v{estimate.version_number || 1}
                                    </Badge>
                                    <Badge variant="outline" className={`text-xs capitalize ${
                                      estimate.status === 'approved' ? 'border-green-200 text-green-700 bg-green-50' :
                                      estimate.status === 'draft' ? 'border-gray-200 text-gray-700 bg-gray-50' :
                                      'border-blue-200 text-blue-700 bg-blue-50'
                                    }`}>
                                      {estimate.status}
                                    </Badge>
                                    {index === 0 && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
                                        Previous
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                    <span>{estimate.estimate_number}</span>
                                    <span>•</span>
                                    <span>{format(estimate.date_created, 'MMM dd, yyyy')}</span>
                                    {estimate.contingency_percent > 0 && (
                                      <>
                                        <span>•</span>
                                        <span>Contingency: {formatContingencyDisplay(estimate)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="text-right">
                                    <span className="font-semibold text-sm">
                                      ${estimate.total_amount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onView(estimate)}
                                      className="h-8 w-8 p-0 hover:bg-primary/10"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => onEdit(estimate)}
                                      className="h-8 w-8 p-0 hover:bg-primary/10"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Estimate Version</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete version {estimate.version_number || 1} of this estimate? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => onDelete(estimate.id)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          );
        })}
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