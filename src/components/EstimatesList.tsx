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
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { EstimatesTableView } from "./EstimatesTableView";
import { supabase } from "@/integrations/supabase/client";

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
  const isMobile = useIsMobile();
  
  // If mobile, show card layout; if desktop, show table layout
  if (isMobile) {
    return <EstimatesCardView estimates={estimates} onEdit={onEdit} onDelete={onDelete} onView={onView} onCreateNew={onCreateNew} />;
  }
  
  return <EstimatesTableView estimates={estimates} onEdit={onEdit} onDelete={onDelete} onView={onView} onCreateNew={onCreateNew} />;
};

// Extract card view into separate component for cleaner organization
const EstimatesCardView = ({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesListProps) => {
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
      
      return `Includes ${estimate.contingency_percent}% contingency: ${formatCurrency(contingencyAmount)}`;
    };

    // Create a new version and open it for editing with copied line items
    const createNewVersion = async (sourceEstimate: Estimate) => {
      try {
        const { data: newId, error } = await supabase.rpc('create_estimate_version', {
          source_estimate_id: sourceEstimate.id,
        });
        if (error) throw error;

        const { data: newVersionData, error: fetchError } = await supabase
          .from('estimates')
          .select('*')
          .eq('id', newId)
          .single();
        if (fetchError || !newVersionData) throw fetchError;

        const { data: lineItemsData, error: liError } = await supabase
          .from('estimate_line_items')
          .select('*')
          .eq('estimate_id', newId)
          .order('sort_order');
        if (liError) throw liError;

        const lineItems = (lineItemsData || []).map((item: any) => ({
          id: item.id,
          category: item.category,
          description: item.description,
          quantity: Number(item.quantity) || 0,
          pricePerUnit: Number(item.price_per_unit ?? item.rate ?? 0),
          total: Number(item.total) || 0,
          unit: item.unit || '',
          sort_order: item.sort_order || 0,
          costPerUnit: Number(item.cost_per_unit) || 0,
          markupPercent: item.markup_percent,
          markupAmount: item.markup_amount,
          totalCost: Number(item.total_cost ?? (Number(item.quantity || 0) * Number(item.cost_per_unit || 0))) || 0,
          totalMarkup: Number(item.total_markup ?? (Number(item.quantity || 0) * (Number(item.price_per_unit ?? item.rate ?? 0) - Number(item.cost_per_unit || 0)))) || 0,
        }));

        const newVersion: Estimate = {
          id: newVersionData.id,
          project_id: newVersionData.project_id,
          estimate_number: newVersionData.estimate_number,
          date_created: new Date(newVersionData.date_created),
          total_amount: Number(newVersionData.total_amount) || 0,
          status: newVersionData.status,
          notes: newVersionData.notes,
          valid_until: newVersionData.valid_until ? new Date(newVersionData.valid_until) : undefined,
          revision_number: newVersionData.revision_number,
          contingency_percent: Number(newVersionData.contingency_percent) || 10,
          contingency_amount: newVersionData.contingency_amount || undefined,
          contingency_used: Number(newVersionData.contingency_used) || 0,
          version_number: newVersionData.version_number || 1,
          parent_estimate_id: newVersionData.parent_estimate_id || undefined,
          is_current_version: !!newVersionData.is_current_version,
          valid_for_days: newVersionData.valid_for_days || 30,
          lineItems,
          created_at: new Date(newVersionData.created_at),
          updated_at: new Date(newVersionData.updated_at),
          project_name: sourceEstimate.project_name,
          client_name: sourceEstimate.client_name,
          defaultMarkupPercent: newVersionData.default_markup_percent || 15,
          targetMarginPercent: newVersionData.target_margin_percent || 20,
          is_draft: newVersionData.is_draft ?? false,
        };

        onEdit(newVersion);
      } catch (err) {
        console.error('Failed to create version:', err);
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
            Create First Estimate
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="dense-spacing">

      <div className="space-y-3">
        {Object.entries(estimatesByProject).map(([projectId, projectEstimates]) => {
          const currentVersion = projectEstimates.find(e => e.is_current_version) || projectEstimates[0];
          const previousVersions = projectEstimates.filter(e => !e.is_current_version);
          
          const quoteStatus = getQuoteStatus(currentVersion);
          const bestQuoteVariance = getBestQuoteVariance(currentVersion);
          
          return (
            <Card key={projectId} className="compact-card border border-primary/10">
              <CardHeader className="p-compact bg-gradient-to-r from-primary/5 to-transparent">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 flex-wrap">
                    <CardTitle className="text-interface font-medium flex-1 min-w-0 truncate">{currentVersion.project_name}</CardTitle>
                    <div className="flex gap-1 flex-shrink-0">
                      <Badge className="compact-badge bg-primary text-primary-foreground font-medium">
                        v{currentVersion.version_number || 1}
                      </Badge>
                      <Badge variant="outline" className="compact-badge border-success text-success bg-success/10">
                        Current
                      </Badge>
                    </div>
                  </div>
                  <p className="text-label text-muted-foreground">
                    {currentVersion.client_name} • {projectEstimates.length} version{projectEstimates.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      onClick={() => createNewVersion(currentVersion)}
                      className="h-button-compact text-label bg-primary hover:bg-primary/90"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New Version
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-compact space-y-2">
                {/* Current Version Details - Compact */}
                <div className="compact-card-section border border-primary/20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-interface font-medium text-foreground">Latest Version</h3>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge className="compact-badge bg-primary text-primary-foreground font-medium">
                          v{currentVersion.version_number || 1}
                        </Badge>
                        <Badge variant="outline" className={`compact-badge capitalize ${
                          currentVersion.status === 'approved' ? 'border-success text-success bg-success/10' :
                          currentVersion.status === 'draft' ? 'border-muted text-muted-foreground bg-muted/10' :
                          'border-primary text-primary bg-primary/10'
                        }`}>
                          {currentVersion.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-label text-muted-foreground flex-wrap">
                      <span className="truncate">{currentVersion.estimate_number}</span>
                      <span>•</span>
                      <span>{format(currentVersion.date_created, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-foreground font-mono">
                          ${currentVersion.total_amount.toLocaleString()}
                        </div>
                        <div className="text-label text-muted-foreground">Total Amount</div>
                      </div>
                    </div>

                  {/* Budget Comparison - Compact */}
                  {(quoteStatus !== 'awaiting-quotes') && (
                    <div className="pt-2 border-t border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-label font-medium text-foreground">Budget vs Actual:</span>
                        <div className="flex items-center gap-1">
                          <BudgetComparisonBadge status={quoteStatus} />
                          {bestQuoteVariance && (
                            <span className={`text-data font-mono font-medium ${
                              bestQuoteVariance.variance < 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {bestQuoteVariance.variance < 0 ? '-' : '+'}${Math.abs(bestQuoteVariance.variance).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons - Compact */}
                  <div className="flex gap-1 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(currentVersion)}
                      className="flex-1 h-button-compact text-label border-primary/20 hover:bg-primary/5"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(currentVersion)}
                      className="flex-1 h-button-compact text-label border-primary/20 hover:bg-primary/5"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => createNewVersion(currentVersion)}
                      className="flex-1 h-button-compact text-label border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      New
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