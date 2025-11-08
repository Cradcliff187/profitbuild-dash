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

  const isProjectAtRisk = (marginPercentage: number | null | undefined): boolean => {
    if (marginPercentage === null || marginPercentage === undefined) return false;
    return marginPercentage < 10;
  };

  const getCardBorderClass = (marginPercentage: number | null | undefined): string => {
    return isProjectAtRisk(marginPercentage) ? 'border-red-500 border-2' : '';
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
                className={`compact-card hover:shadow-sm transition-shadow cursor-pointer ${getCardBorderClass(project.margin_percentage)}`}
                onClick={() => window.location.href = `/projects/${project.id}`}
              >
                <CardHeader className="p-compact pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0 flex-1">
                      <CardTitle className="text-interface font-medium leading-tight truncate">{project.project_name}</CardTitle>
                      <div className="text-label text-muted-foreground truncate">
                        {project.project_number} • {project.client_name}
                      </div>
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
                    {isProjectAtRisk(project.margin_percentage) && (
                      <Badge className="compact-badge bg-destructive text-destructive-foreground flex items-center gap-1">
                        <AlertTriangle className="h-2 w-2" />
                        RISK
                      </Badge>
                    )}
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
                    const currentMargin = contract - adjustedCosts;
                    const derivedMarginPct = contract > 0 ? (currentMargin / contract) * 100 : 0;
                    const marginPctToShow = project.margin_percentage ?? derivedMarginPct;
                    const changeOrderRevenue = project.changeOrderRevenue || 0;
                    const changeOrderCosts = project.changeOrderCosts || 0;
                    const originalCosts = project.original_est_costs || 0;
                    const quoteVariance = (adjustedCosts - originalCosts) - changeOrderCosts;

                    return (
                      <div className="compact-card-section bg-muted/10 space-y-2">
                        {/* Contract Value */}
                        <div className="flex justify-between text-data">
                          <span className="text-label text-muted-foreground">Contract</span>
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
                        
                        {/* Two-Tier Margins - Original & Current with Breakdown Popover */}
                        <div className="grid grid-cols-2 gap-3 text-data pt-1 border-t border-border/50">
                          <div>
                            <p className="text-[10px] text-muted-foreground leading-tight">Original Margin</p>
                            <p className="font-mono text-xs font-medium">{formatCurrency(project.original_margin)}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-[10px] text-muted-foreground leading-tight">Current Margin</p>
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
                                        <span>{formatCurrency(project.original_margin || 0)}</span>
                                      </div>
                                      {changeOrderRevenue > 0 && (
                                        <>
                                          <div className="flex justify-between gap-2 text-blue-600 dark:text-blue-400">
                                            <span>+ CO Revenue:</span>
                                            <span>{formatCurrency(changeOrderRevenue)}</span>
                                          </div>
                                          <div className="flex justify-between gap-2 text-orange-600 dark:text-orange-400">
                                            <span>− CO Costs:</span>
                                            <span>{formatCurrency(changeOrderCosts)}</span>
                                          </div>
                                        </>
                                      )}
                                      {quoteVariance !== 0 && (
                                        <div className="flex justify-between gap-2 text-orange-600 dark:text-orange-400">
                                          <span>{quoteVariance > 0 ? '−' : '+'} Quote Δ:</span>
                                          <span>{formatCurrency(Math.abs(quoteVariance))}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between gap-2 border-t pt-1 font-semibold">
                                        <span>= Current:</span>
                                        <span>{formatCurrency(currentMargin)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <p className={`font-mono text-xs font-semibold ${
                              currentMargin < 0 ? 'text-red-600 dark:text-red-400' :
                              currentMargin >= (project.target_margin || 20) * contract / 100 ? 'text-green-600 dark:text-green-400' :
                              'text-orange-600 dark:text-orange-400'
                            }`}>
                              {formatCurrency(currentMargin)}
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
                          <span className="text-label text-muted-foreground">Est. Costs</span>
                          <span className="font-mono font-medium">{formatCurrency(adjustedCosts)}</span>
                        </div>

                        {/* Contingency Remaining */}
                        {project.contingency_remaining > 0 && (
                          <div className="flex justify-between text-data">
                            <span className="text-label text-muted-foreground">Contingency</span>
                            <span className="font-mono font-medium text-blue-600">{formatCurrency(project.contingency_remaining)}</span>
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
          const currentMargin = contract - adjustedCosts;
          const derivedMarginPct = contract > 0 ? (currentMargin / contract) * 100 : 0;
          const marginPctToShow = project.margin_percentage ?? derivedMarginPct;
          
          return (
            <Card 
              key={project.id} 
              className={`compact-card ${getCardBorderClass(project.margin_percentage)}`}
            >
              <Collapsible open={isExpanded} onOpenChange={() => toggleCard(project.id)}>
                {/* COLLAPSED VIEW - Compact header */}
                <CollapsibleTrigger asChild>
                  <div className="p-3 cursor-pointer hover:bg-muted/50 space-y-2">
                    {/* Row 1: Project name + Status + Chevron */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">{project.project_name}</h3>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isProjectAtRisk(project.margin_percentage) && (
                          <Badge className="compact-badge bg-destructive text-destructive-foreground flex items-center gap-1">
                            <AlertTriangle className="h-2 w-2" />
                            RISK
                          </Badge>
                        )}
                        <Badge className={`compact-badge ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    
                    {/* Row 2: Project number + Client */}
                    <div className="text-xs text-muted-foreground truncate">
                      {project.project_number} • {project.client_name}
                    </div>
                    
                    {/* Row 3: Current Margin (prominent) */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Current Margin</span>
                      <Badge className={`compact-badge ${getMarginColor(marginPctToShow)} font-mono`}>
                        {formatCurrency(currentMargin)} ({marginPctToShow.toFixed(1)}%)
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* EXPANDED VIEW - Full card content */}
                <CollapsibleContent>
                  <div className="border-t" onClick={(e) => e.stopPropagation()}>
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
                        {isProjectAtRisk(project.margin_percentage) && (
                          <Badge className="compact-badge bg-destructive text-destructive-foreground flex items-center gap-1">
                            <AlertTriangle className="h-2 w-2" />
                            RISK
                          </Badge>
                        )}
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
                        const currentMargin = contract - adjustedCosts;
                        const derivedMarginPct = contract > 0 ? (currentMargin / contract) * 100 : 0;
                        const marginPctToShow = project.margin_percentage ?? derivedMarginPct;
                        const changeOrderRevenue = project.changeOrderRevenue || 0;
                        const changeOrderCosts = project.changeOrderCosts || 0;
                        const originalCosts = project.original_est_costs || 0;
                        const quoteVariance = (adjustedCosts - originalCosts) - changeOrderCosts;

                        return (
                          <div className="compact-card-section bg-muted/10 space-y-2">
                            {/* Contract Value */}
                            <div className="flex justify-between text-data">
                              <span className="text-label text-muted-foreground">Contract</span>
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
                            
                            {/* Two-Tier Margins - Original & Current with Breakdown Popover */}
                            <div className="grid grid-cols-2 gap-3 text-data pt-1 border-t border-border/50">
                              <div>
                                <p className="text-[10px] text-muted-foreground leading-tight">Original Margin</p>
                                <p className="font-mono text-xs font-medium">{formatCurrency(project.original_margin)}</p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className="text-[10px] text-muted-foreground leading-tight">Current Margin</p>
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
                                            <span>{formatCurrency(project.original_margin || 0)}</span>
                                          </div>
                                          {changeOrderRevenue > 0 && (
                                            <>
                                              <div className="flex justify-between gap-2 text-blue-600 dark:text-blue-400">
                                                <span>+ CO Revenue:</span>
                                                <span>{formatCurrency(changeOrderRevenue)}</span>
                                              </div>
                                              <div className="flex justify-between gap-2 text-orange-600 dark:text-orange-400">
                                                <span>− CO Costs:</span>
                                                <span>{formatCurrency(changeOrderCosts)}</span>
                                              </div>
                                            </>
                                          )}
                                          {quoteVariance !== 0 && (
                                            <div className="flex justify-between gap-2 text-orange-600 dark:text-orange-400">
                                              <span>{quoteVariance > 0 ? '−' : '+'} Quote Δ:</span>
                                              <span>{formatCurrency(Math.abs(quoteVariance))}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between gap-2 border-t pt-1 font-semibold">
                                            <span>= Current:</span>
                                            <span>{formatCurrency(currentMargin)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <p className={`font-mono text-xs font-semibold ${
                                  currentMargin < 0 ? 'text-red-600 dark:text-red-400' :
                                  currentMargin >= (project.target_margin || 20) * contract / 100 ? 'text-green-600 dark:text-green-400' :
                                  'text-orange-600 dark:text-orange-400'
                                }`}>
                                  {formatCurrency(currentMargin)}
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
                              <span className="text-label text-muted-foreground">Est. Costs</span>
                              <span className="font-mono font-medium">{formatCurrency(adjustedCosts)}</span>
                            </div>

                            {/* Contingency Remaining */}
                            {project.contingency_remaining > 0 && (
                              <div className="flex justify-between text-data">
                                <span className="text-label text-muted-foreground">Contingency</span>
                                <span className="font-mono font-medium text-blue-600">{formatCurrency(project.contingency_remaining)}</span>
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

                      {/* Dropdown Menu */}
                      <div className="flex gap-1 pt-2 border-t">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-input-compact flex-1" aria-label="Project options">
                              <MoreHorizontal className="h-3 w-3 mr-1" />
                              Actions
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