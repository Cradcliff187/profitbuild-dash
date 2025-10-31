import { useState, useEffect } from "react";
import { Building2, Edit, Trash2, Plus, Filter, DollarSign, TrendingUp, TrendingDown, Target, AlertTriangle, Calculator, Copy, MoreHorizontal, FileText } from "lucide-react";
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
        {paginatedProjects.map((project) => (
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

              {/* Financial Summary - Compact Three-Tier */}
              {(project.contracted_amount || project.projected_margin !== null) && (
                <div className="compact-card-section bg-muted/10 space-y-2">
                  {/* Contract Value */}
                  <div className="flex justify-between text-data">
                    <span className="text-label text-muted-foreground">Contract</span>
                    <span className="font-mono font-medium">{formatCurrency(project.contracted_amount)}</span>
                  </div>
                  
                  {/* Three-Tier Margins - Compact Grid */}
                  <div className="grid grid-cols-3 gap-2 text-data pt-1 border-t border-border/50">
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-tight">Original</p>
                      <p className="font-mono text-xs font-medium">{formatCurrency(project.original_margin)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-tight">Projected</p>
                      <p className="font-mono text-xs font-medium">{formatCurrency(project.projected_margin)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-tight">Actual</p>
                      <p className="font-mono text-xs font-medium">{formatCurrency(project.actual_margin)}</p>
                    </div>
                  </div>
                  
                  {/* Expenses Total */}
                  <div className="flex justify-between text-data pt-1 border-t border-border/50">
                    <span className="text-label text-muted-foreground">Expenses</span>
                    <span className="font-mono font-medium">{formatCurrency((project as any).actualExpenses)}</span>
                  </div>
                </div>
              )}

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
        ))}
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