import { useState, useEffect } from "react";
import { Building2, Edit, Trash2, Plus, Filter, DollarSign, TrendingUp, TrendingDown, Target, AlertTriangle, Calculator, Copy, MoreHorizontal, FileText, Info, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VarianceBadge } from "@/components/ui/variance-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project, ProjectStatus, ProjectType } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getMarginThresholdStatus, getThresholdStatusColor, getThresholdStatusLabel, formatContingencyRemaining } from "@/utils/thresholdUtils";
import { usePagination } from "@/hooks/usePagination";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";

interface ProjectWithVariance extends Project {
  estimateTotal?: number;
  quoteTotal?: number;
  actualExpenses?: number;
  variance?: number;
  variancePercentage?: number;
  varianceType?: 'estimate' | 'quote';
  changeOrderRevenue?: number;
  changeOrderCosts?: number;
  adjusted_est_costs?: number;
  original_est_costs?: number;
}

interface ProjectsListProps {
  projects: ProjectWithVariance[];
  estimates: any[];
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onCreateNew: () => void;
  onRefresh: () => void;
  enablePagination?: boolean;
  pageSize?: number;
}

export const ProjectsList = ({ 
  projects, 
  estimates,
  onEdit, 
  onDelete, 
  onCreateNew, 
  onRefresh, 
  enablePagination = false,
  pageSize = 12 
}: ProjectsListProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { navigateToProjectDetail } = useSmartNavigation();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (projectId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'estimating':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'quoted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'complete':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMarginColor = (marginPercentage: number | null | undefined) => {
    if (marginPercentage === null || marginPercentage === undefined) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (marginPercentage >= 20) return 'bg-green-100 text-green-800 border-green-200';
    if (marginPercentage >= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (marginPercentage >= 0) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete project",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      onDelete(projectId);
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateProject = (project: Project) => {
    // For now, just route to create new project page
    // In the future, this could pre-populate the form with project data
    toast({
      title: "Feature Coming Soon",
      description: "Project duplication will be available in a future update",
    });
  };


  // Pagination
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
  } = usePagination({
    totalItems: projects.length,
    pageSize,
    initialPage: 1,
  });

  const paginatedProjects = enablePagination 
    ? projects.slice(startIndex, endIndex)
    : projects;

  if (projects.length === 0) {
    return (
      <Card className="compact-card">
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground mb-4">
            <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No projects found</p>
            <p className="text-xs mt-1">
              Create your first project to start tracking construction work
            </p>
          </div>
          <Button onClick={onCreateNew} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Create First Project
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="dense-spacing">
      {/* Projects Grid - Compact Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
        {paginatedProjects.map((project) => {
          // DESKTOP: Use exact current implementation (NO CHANGES)
          if (!isMobile) {
            return (
              <Card 
                key={project.id} 
                className="compact-card hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/projects/${project.id}`}
              >
                <CardHeader className="p-compact pb-2">
                  <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                      <CardTitle className="text-interface font-medium leading-tight truncate">{project.project_name}</CardTitle>
                      <div className="text-label text-muted-foreground truncate">
                        {project.project_number} • {project.client_name}
                      </div>
                      {project.customer_po_number && (
                        <div className="text-label text-muted-foreground font-mono truncate">
                          PO: {project.customer_po_number}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-input-compact w-input-compact p-0" aria-label="Project options">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => onEdit(project)}>
                            <Edit className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateProject(project)}>
                            <Copy className="h-3 w-3 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteProject(project.id)} className="text-destructive">
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-compact space-y-2">
                  {/* Action Buttons - Compact */}
                  {(() => {
                    const projectEstimates = estimates.filter(e => e.project_id === project.id);
                    const hasEstimates = projectEstimates.length > 0;
                    
                    if (!hasEstimates) {
                      return (
                        <Button 
                          size="sm"
                          variant="default"
                          className="w-full h-button-compact"
                          onClick={() => window.location.href = `/estimates?project=${project.id}`}
                        >
                          <Calculator className="h-3 w-3 mr-1" />
                          Create Estimate
                        </Button>
                      );
                    } else {
                      return (
                        <Button 
                          size="sm"
                          variant="default"
                          className="w-full h-button-compact"
                          onClick={() => window.location.href = `/projects/${project.id}`}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      );
                    }
                  })()}

                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge className={`compact-badge ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {project.margin_percentage !== null && project.margin_percentage !== undefined && (
                      <Badge className={`compact-badge ${getMarginColor(project.margin_percentage)}`}>
                        {project.margin_percentage.toFixed(1)}%
                      </Badge>
                    )}
                  </div>

                    {/* Financial Summary - Two-Tier Margins */}
                    {(project.contracted_amount || project.original_margin !== null) && (() => {
                      const contract = project.contracted_amount ?? 0;
                      const adjustedCosts = project.adjusted_est_costs ?? 0;
                      const projectedMargin = project.projected_margin ?? (contract - adjustedCosts);
                      const derivedMarginPct = contract > 0 ? (projectedMargin / contract) * 100 : 0;
                      const marginPctToShow = project.margin_percentage ?? derivedMarginPct;
                      const changeOrderRevenue = project.changeOrderRevenue || 0;
                      const changeOrderCosts = project.changeOrderCosts || 0;
                      const changeOrderNetMargin = changeOrderRevenue - changeOrderCosts;
                      const originalCosts = project.original_est_costs || 0;
                      const quoteVariance = (adjustedCosts - originalCosts) - changeOrderCosts;
                      const originalMargin = project.original_margin || 0;

                      return (
                        <div className="compact-card-section bg-muted/10 space-y-2">
                          {/* Contract Value */}
                          <div className="flex justify-between text-data">
                            <span className="text-label text-muted-foreground">Contract Value</span>
                            <span className="font-mono font-medium">{formatCurrency(contract)}</span>
                          </div>

                          {/* Change Orders */}
                          {changeOrderRevenue > 0 && (
                            <div className="flex justify-between text-data">
                              <span className="text-label text-muted-foreground">Change Orders</span>
                              <span className="font-mono font-medium text-green-600">
                                +{formatCurrency(changeOrderRevenue)}
                              </span>
                            </div>
                          )}

                          {/* Two-Tier Margins - Original & Projected with Breakdown Popover */}
                          <div className="grid grid-cols-2 gap-3 text-data pt-1 border-t border-border/50">
                            <div>
                              <p className="text-[10px] text-muted-foreground leading-tight">Original Margin</p>
                              <p className="font-mono text-xs font-medium">{formatCurrency(originalMargin)}</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <p className="text-[10px] text-muted-foreground leading-tight">Projected Margin</p>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="p-0 h-3 w-3 hover:bg-muted/50 rounded inline-flex items-center justify-center">
                                      <Info className="h-2.5 w-2.5 text-muted-foreground" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-56 text-xs p-3" align="start">
                                    <div className="space-y-1.5">
                                      <p className="font-semibold text-[11px] border-b pb-1">Margin Breakdown</p>
                                      <div className="space-y-1 font-mono tabular-nums text-[10px]">
                                        <div className="flex justify-between gap-2">
                                          <span className="text-muted-foreground">Original:</span>
                                          <span>{formatCurrency(originalMargin)}</span>
                                        </div>
                                        {changeOrderNetMargin !== 0 && (
                                          <div className="flex justify-between gap-2 text-blue-600 dark:text-blue-400">
                                            <span>+ Change Orders:</span>
                                            <span>{formatCurrency(changeOrderNetMargin)}</span>
                                          </div>
                                        )}
                                        {quoteVariance !== 0 && (
                                          <div className="flex justify-between gap-2 text-orange-600 dark:text-orange-400">
                                            <span>{quoteVariance > 0 ? '−' : '+'} Quote Δ:</span>
                                            <span>{formatCurrency(Math.abs(quoteVariance))}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between gap-2 border-t pt-1 font-semibold">
                                          <span>= Projected:</span>
                                          <span>{formatCurrency(projectedMargin)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <p
                                className={`font-mono text-xs font-semibold ${
                                  projectedMargin < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : projectedMargin >= (project.target_margin || 20) * contract / 100
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-orange-600 dark:text-orange-400'
                                }`}
                              >
                                {formatCurrency(projectedMargin)}
                              </p>
                            </div>
                          </div>

                          {/* Margin Percentage */}
                          <div className="flex justify-between text-data">
                            <span className="text-label text-muted-foreground">Margin %</span>
                            <Badge className={`compact-badge ${getMarginColor(marginPctToShow)} font-mono`}>
                              {marginPctToShow.toFixed(1)}%
                            </Badge>
                          </div>

                          {/* Adjusted Estimated Costs */}
                          <div className="flex justify-between text-data pt-1 border-t border-border/50">
                            <span className="text-label text-muted-foreground">Adjusted Est. Costs</span>
                            <span className="font-mono font-medium">{formatCurrency(adjustedCosts)}</span>
                          </div>

                          {/* Contingency Remaining */}
                          {project.contingency_remaining > 0 && (
                            <div className="flex justify-between text-data">
                              <span className="text-label text-muted-foreground">Contingency</span>
                              <span className="font-mono font-medium text-blue-600">
                                {formatCurrency(project.contingency_remaining)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  <div className="grid grid-cols-2 gap-2 text-label">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="text-data font-medium truncate">
                        {project.project_type === 'construction_project' ? 'Construction' : 'Work Order'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="text-data font-medium">
                        {format(project.created_at, "MMM dd")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          // MOBILE: New collapsible implementation
          const isExpanded = expandedCards.has(project.id);
          const contract = project.contracted_amount ?? 0;
          const adjustedCosts = project.adjusted_est_costs ?? 0;
          const projectedMargin = project.projected_margin ?? (contract - adjustedCosts);
          const derivedMarginPct = contract > 0 ? (projectedMargin / contract) * 100 : 0;
          const marginPctToShow = project.margin_percentage ?? derivedMarginPct;

          return (
            <Card
              key={project.id}
              className="compact-card border"
            >
              <Collapsible open={isExpanded} onOpenChange={() => toggleCard(project.id)}>
                {/* COLLAPSED VIEW - Enhanced header with gradient */}
                <CardHeader 
                  className="p-compact bg-gradient-to-r from-primary/5 to-transparent cursor-pointer"
                  onClick={() => navigateToProjectDetail(project.id)}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-interface truncate flex-1">{project.project_name}</CardTitle>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge className={`compact-badge ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-label text-muted-foreground truncate">
                      {project.project_number} • {project.client_name}
                    </div>
                  </div>
                </CardHeader>

                <div className="flex items-center justify-between px-3 py-2 border-t">
                  <span 
                    className="text-sm font-medium flex-1 cursor-pointer"
                    onClick={() => navigateToProjectDetail(project.id)}
                  >
                    {formatCurrency(projectedMargin)} • {marginPctToShow.toFixed(1)}%
                  </span>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                {/* EXPANDED VIEW - Full card content */}
                <CollapsibleContent className="relative z-0">
                  <div className="space-y-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <CardContent className="p-compact space-y-2 bg-background">
                      {/* Financial Summary - 3-Column Grid (matching quotes style) */}
                        {(project.contracted_amount || project.original_margin !== null) && (() => {
                          const changeOrderRevenue = project.changeOrderRevenue || 0;
                          const changeOrderCosts = project.changeOrderCosts || 0;
                          const changeOrderNetMargin = changeOrderRevenue - changeOrderCosts;
                          const originalCosts = project.original_est_costs || 0;
                          const quoteVariance = (adjustedCosts - originalCosts) - changeOrderCosts;
                          const originalMargin = project.original_margin || 0;

                        return (
                          <>
                            <div className="grid grid-cols-3 gap-2 text-label bg-muted/30 p-3 rounded-lg">
                              <div className="text-center">
                                <div className="text-muted-foreground text-[10px]">Contract Value</div>
                                <div className="text-interface font-bold font-mono">
                                  {formatCurrency(contract)}
                                </div>
                              </div>
                              <div className="text-center border-x border-border">
                                <div className="text-muted-foreground text-[10px]">Projected Margin</div>
                                <div className={`text-interface font-bold font-mono ${
                                  projectedMargin < 0 ? 'text-red-600 dark:text-red-400' :
                                  projectedMargin >= (project.target_margin || 20) * contract / 100 ? 'text-green-600 dark:text-green-400' :
                                  'text-orange-600 dark:text-orange-400'
                                }`}>
                                  {formatCurrency(projectedMargin)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground text-[10px]">Margin %</div>
                                <div className="text-interface font-bold font-mono">
                                  {marginPctToShow.toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            {/* Margin Breakdown Section (matching quotes profit impact style) */}
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Margin Breakdown</span>
                                <Badge
                                  variant={projectedMargin >= 0 ? 'default' : 'destructive'}
                                  className="font-mono compact-badge"
                                >
                                  {formatCurrency(projectedMargin)}
                                </Badge>
                              </div>
                                <div className="space-y-1 text-xs font-mono tabular-nums">
                                  <div className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">Original Margin:</span>
                                    <span>{formatCurrency(originalMargin)}</span>
                                  </div>
                                  {changeOrderNetMargin !== 0 && (
                                    <div className="flex justify-between gap-2 text-blue-600 dark:text-blue-400">
                                      <span>+ Change Orders:</span>
                                      <span>{formatCurrency(changeOrderNetMargin)}</span>
                                    </div>
                                  )}
                                  {quoteVariance !== 0 && (
                                    <div
                                      className={`flex justify-between gap-2 ${
                                        quoteVariance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                      }`}
                                    >
                                      <span>{quoteVariance > 0 ? '−' : '+'} Quote Variance:</span>
                                      <span>{formatCurrency(Math.abs(quoteVariance))}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between gap-2 border-t pt-1 font-semibold">
                                    <span>= Projected Margin:</span>
                                    <span>{formatCurrency(projectedMargin)}</span>
                                  </div>
                                </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Other Details - Compact Grid */}
                      <div className="grid grid-cols-2 gap-2 text-label pt-2 border-t">
                        <div>
                          <div className="text-muted-foreground text-label">Adjusted Est. Costs</div>
                          <div className="font-medium font-mono text-data">{formatCurrency(adjustedCosts)}</div>
                        </div>
                        {project.contingency_remaining > 0 && (
                          <div>
                            <div className="text-muted-foreground text-label">Contingency</div>
                            <div className="font-medium font-mono text-data text-blue-600">{formatCurrency(project.contingency_remaining)}</div>
                          </div>
                        )}

                        <div>
                          <p className="text-muted-foreground text-label">Type</p>
                          <p className="text-data font-medium truncate">
                            {project.project_type === 'construction_project' ? 'Construction' : 'Work Order'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-label">Created</p>
                          <p className="text-data font-medium">
                            {format(project.created_at, "MMM dd")}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons - Inside Collapsed Area (matching quotes style) */}
                      <div className="flex gap-1 pt-2 border-t border-primary/20">
                        {(() => {
                          const projectEstimates = estimates.filter(e => e.project_id === project.id);
                          const hasEstimates = projectEstimates.length > 0;

                          return (
                            <>
                              {!hasEstimates ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.location.href = `/estimates?project=${project.id}`}
                                  className="h-btn-compact text-label flex-1"
                                >
                                  <Calculator className="h-3 w-3 mr-1" />
                                  Create Estimate
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.location.href = `/projects/${project.id}`}
                                  className="h-btn-compact text-label flex-1"
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(project)}
                                className="h-btn-compact text-label flex-1"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-btn-compact">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{project.project_name}"?
                                      This action will permanently delete the project and all related data including estimates, quotes, and expenses.
                                      This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteProject(project.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Filter className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Projects Match Your Filters</h3>
              <p>Try adjusting your search criteria or clear the filters.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {enablePagination && projects.length > pageSize && (
        <div className="flex justify-center mt-6">
          <CompletePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      )}
    </div>
  );
};