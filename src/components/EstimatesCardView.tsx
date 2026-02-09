import { useState } from "react";
import { FileText, Edit, Trash2, Eye, Plus, Copy, ChevronDown, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { Estimate } from "@/types/estimate";
import { toast } from "sonner";
import { BudgetComparisonBadge, BudgetComparisonStatus } from "@/components/BudgetComparisonBadge";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { MobileListCard } from "@/components/ui/mobile-list-card";

export interface EstimatesCardViewProps {
  estimates: (Estimate & { quotes?: Array<{ id: string; total_amount: number; status: string }> })[];
  onEdit: (estimate: Estimate) => void;
  onDelete: (id: string) => void;
  onView: (estimate: Estimate) => void;
  onCreateNew: () => void;
}

export const EstimatesCardView = ({ estimates, onEdit, onDelete, onView, onCreateNew }: EstimatesCardViewProps) => {
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
      toast.success("Estimate Deleted", { description: "The estimate has been successfully deleted." });
    }
    setDeleteDialogOpen(false);
    setEstimateToDelete(null);
  };

  const getQuoteStatus = (estimate: Estimate & { quotes?: Array<{ id: string; total_amount: number }> }): BudgetComparisonStatus => {
    if (!estimate.quotes || estimate.quotes.length === 0) {
      return 'awaiting-quotes';
    }
    
    const hasUnderBudgetQuote = estimate.quotes.some(q => q.total_amount < estimate.total_amount);
    if (hasUnderBudgetQuote) {
      return 'under-budget';
    }
    
    const allQuotesOverBudget = estimate.quotes.every(q => q.total_amount > estimate.total_amount);
    if (allQuotesOverBudget) {
      return 'over-budget';
    }
    
    return 'awaiting-quotes';
  };

  const getBestQuoteVariance = (estimate: Estimate & { quotes?: Array<{ id: string; total_amount: number }> }) => {
    if (!estimate.quotes || estimate.quotes.length === 0) {
      return null;
    }
    
    const bestQuote = estimate.quotes.reduce((best, current) => 
      current.total_amount < best.total_amount ? current : best
    );
    
    const variance = bestQuote.total_amount - estimate.total_amount;
    const percentage = (variance / estimate.total_amount) * 100;
    
    return { variance, percentage };
  };

  const getMarginDisplay = (estimate: Estimate): string => {
    const totalAmount = estimate.total_amount || 0;
    if (totalAmount === 0) return "—";
    const totalCost = estimate.total_cost ?? estimate.lineItems?.reduce((s, li) => s + (li.totalCost || 0), 0) ?? 0;
    const margin = ((totalAmount - totalCost) / totalAmount) * 100;
    return `${margin.toFixed(1)}%`;
  };

  const formatContingencyDisplay = (estimate: Estimate) => {
    if (!estimate.contingency_percent || estimate.contingency_percent === 0) {
      return null;
    }
    
    const contingencyAmount = estimate.contingency_amount || 
      (estimate.total_amount * (estimate.contingency_percent / 100)) / (1 + (estimate.contingency_percent / 100));
    
    return `Includes ${estimate.contingency_percent}% contingency: ${formatCurrency(contingencyAmount)}`;
  };

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
        defaultMarkupPercent: newVersionData.default_markup_percent || 25,
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
      <Card className="compact-card">
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No estimates found</p>
            <p className="text-xs mt-1">
              Create your first estimate to get started tracking project budgets
            </p>
          </div>
          <Button onClick={onCreateNew} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Create First Estimate
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="dense-spacing overflow-hidden w-full max-w-full min-w-0 box-border">
      <div className="space-y-2 w-full max-w-full min-w-0">
        {Object.entries(estimatesByProject).map(([projectId, projectEstimates]) => {
          const currentVersion = projectEstimates.find(e => e.is_current_version) || projectEstimates[0];
          const previousVersions = projectEstimates.filter(e => !e.is_current_version);
          
          const quoteStatus = getQuoteStatus(currentVersion);
          const bestQuoteVariance = getBestQuoteVariance(currentVersion);
          
          // Always show quote line when there are quotable items (excl. internal labor/management). Status/draft does not gate this.
          const attention = (() => {
            const lineItems = currentVersion.lineItems || [];
            const quotableItems = lineItems.filter(
              item =>
                item.category !== "labor_internal" &&
                item.category !== "management"
            );
            if (quotableItems.length === 0) {
              return undefined;
            }
            const quoteCount = currentVersion.quotes?.length ?? 0;
            const message =
              quoteCount === 0
                ? `${quotableItems.length} quotable items • No quotes received`
                : `${quotableItems.length} quotable items • ${quoteCount} quote(s) received`;
            return {
              message,
              variant: quoteCount === 0 ? "warning" as const : "info" as const,
            };
          })();

          return (
            <MobileListCard
              key={projectId}
              title={currentVersion.project_number ? `${currentVersion.project_number} - ${currentVersion.project_name}` : currentVersion.project_name ?? ''}
              subtitle={`${currentVersion.client_name ?? ''} • ${projectEstimates.length} version${projectEstimates.length !== 1 ? 's' : ''}`}
              badge={{ label: `v${currentVersion.version_number || 1}`, className: "bg-primary text-primary-foreground font-medium" }}
              secondaryBadge={{ label: "Current", className: "border-success text-success bg-success/10" }}
              metrics={[
                { label: "Total", value: formatCurrency(currentVersion.total_amount, { showCents: false }) },
                { label: "Margin", value: getMarginDisplay(currentVersion) },
              ]}
              attention={attention}
              onTap={() => onView(currentVersion)}
              actions={[
                { icon: Eye, label: "View", onClick: (e) => { e.stopPropagation(); onView(currentVersion); } },
                { icon: Edit, label: "Edit", onClick: (e) => { e.stopPropagation(); onEdit(currentVersion); } },
                { icon: Copy, label: "New Version", onClick: (e) => { e.stopPropagation(); createNewVersion(currentVersion); } },
                { icon: Trash2, label: "Delete", onClick: (e) => { e.stopPropagation(); handleDeleteClick(currentVersion.id); }, variant: "destructive" },
              ]}
              expandable={true}
              expandTriggerLabel="View Details"
              expandedContent={
                <div className="space-y-3 text-sm">
                  <div className="compact-card-section border border-primary/20 rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium text-foreground">Latest Version</h3>
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
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                      <span className="truncate">{currentVersion.estimate_number}</span>
                      <span>•</span>
                      <span>{format(currentVersion.date_created, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-foreground font-mono">
                          {formatCurrency(currentVersion.total_amount, { showCents: false })}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Amount</div>
                      </div>
                    </div>
                    {(quoteStatus !== 'awaiting-quotes') && (
                      <div className="pt-2 border-t border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">Budget vs Actual:</span>
                          <div className="flex items-center gap-1">
                            <BudgetComparisonBadge status={quoteStatus} />
                            {bestQuoteVariance && (
                              <span className={`text-sm font-mono font-medium ${
                                bestQuoteVariance.variance < 0 ? 'text-success' : 'text-destructive'
                              }`}>
                                {formatCurrency(bestQuoteVariance.variance, { showCents: false })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1 pt-2">
                      <Button variant="outline" size="sm" onClick={() => onView(currentVersion)} className="flex-1 h-btn-compact text-xs border-primary/20 hover:bg-primary/5">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onEdit(currentVersion)} className="flex-1 h-btn-compact text-xs border-primary/20 hover:bg-primary/5">
                        <Edit className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => createNewVersion(currentVersion)} className="flex-1 h-btn-compact text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                        <Plus className="h-3 w-3 mr-1" /> New
                      </Button>
                    </div>
                  </div>
                  {previousVersions.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-3 h-auto border border-dashed border-primary/30 hover:bg-primary/5">
                          <div className="flex items-center space-x-2">
                            <History className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium text-foreground">Version History ({previousVersions.length})</span>
                          </div>
                          <ChevronDown className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        <div className="pl-3 border-l-2 border-primary/20 space-y-2">
                          {previousVersions.map((estimate, index) => (
                            <Card key={estimate.id} className="bg-muted/20 border-muted-foreground/20">
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">v{estimate.version_number || 1}</Badge>
                                      <Badge variant="outline" className={`text-[10px] h-4 px-1.5 capitalize ${
                                        estimate.status === 'approved' ? 'border-green-200 text-green-700 bg-green-50' :
                                        estimate.status === 'draft' ? 'border-gray-200 text-gray-700 bg-gray-50' :
                                        'border-blue-200 text-blue-700 bg-blue-50'
                                      }`}>
                                        {estimate.status}
                                      </Badge>
                                      {index === 0 && (
                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground border-muted-foreground/30">Previous</Badge>
                                      )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span className="font-semibold text-sm font-mono">{formatCurrency(estimate.total_amount, { showCents: false })}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                                    <span className="truncate">{estimate.estimate_number}</span>
                                    <span>•</span>
                                    <span>{format(estimate.date_created, 'MMM dd, yyyy')}</span>
                                  </div>
                                  {estimate.contingency_percent > 0 && (
                                    <div className="text-xs text-muted-foreground">Contingency: {formatContingencyDisplay(estimate)}</div>
                                  )}
                                  <div className="flex items-center justify-end gap-1 pt-2 border-t border-muted-foreground/20">
                                    <Button variant="ghost" size="sm" onClick={() => onView(estimate)} className="h-7 w-7 p-0 hover:bg-primary/10">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => onEdit(estimate)} className="h-7 w-7 p-0 hover:bg-primary/10">
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                          <Trash2 className="h-3.5 w-3.5" />
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
                                          <AlertDialogAction onClick={() => onDelete(estimate.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              }
            />
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
