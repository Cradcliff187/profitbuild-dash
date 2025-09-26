import { useState, useEffect } from "react";
import { Building2, Edit, Trash2, Plus, Filter, DollarSign, TrendingUp, TrendingDown, Target, AlertTriangle, Calculator } from "lucide-react";
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
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
            <p className="mb-4">Create your first project to get started.</p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-input-compact w-input-compact p-0"
                    onClick={() => onEdit(project)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
...
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
                      className="w-full h-button-compact text-label bg-primary hover:bg-primary/90"
                      onClick={() => window.location.href = `/estimates?project=${project.id}`}
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Create Estimate
                    </Button>
                  );
                } else {
                  return (
                    <div className="flex gap-1">
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1 h-button-compact text-label"
                        onClick={() => window.location.href = `/estimates?project=${project.id}`}
                      >
                        <Calculator className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1 h-button-compact text-label bg-primary hover:bg-primary/90"
                        onClick={() => window.location.href = `/estimates?project=${project.id}&action=new-version`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        New
                      </Button>
                    </div>
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

              {/* Financial Summary - Compact */}
              {(project.contracted_amount || project.current_margin !== null) && (
                <div className="compact-card-section bg-muted/10">
                  <div className="grid grid-cols-2 gap-2 text-data">
                    <div>
                      <p className="text-label text-muted-foreground">Contract</p>
                      <p className="font-mono font-medium">{formatCurrency(project.contracted_amount)}</p>
                    </div>
                    {project.current_margin !== null && project.current_margin !== undefined && (
                      <div>
                        <p className="text-label text-muted-foreground">Profit</p>
                         <p className={`font-mono font-medium ${project.current_margin >= 0 ? 'text-success' : 'text-destructive'}`}>
                           {formatCurrency(project.current_margin)}
                         </p>
                      </div>
                    )}
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