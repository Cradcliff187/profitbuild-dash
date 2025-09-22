import React from "react";
import { Plus, MoreHorizontal, Building2, Edit, Eye, Archive, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Project, ProjectStatus } from "@/types/project";
import { FinancialTableTemplate, FinancialTableColumn } from "@/components/FinancialTableTemplate";

interface ProjectWithFinancials extends Project {
  estimatedCost?: number;
  actualExpenses?: number;
  contingencyRemaining?: number;
}

interface ProjectsTableViewProps {
  projects: ProjectWithFinancials[];
  estimates: any[];
  onEdit: (project: Project) => void;
  onView: (project: Project) => void;
  onArchive?: (projectId: string) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export const ProjectsTableView = ({ 
  projects, 
  estimates,
  onEdit, 
  onView,
  onArchive,
  onCreateNew,
  isLoading = false 
}: ProjectsTableViewProps) => {

  const getStatusBadge = (status: ProjectStatus) => {
    const configs = {
      'estimating': { variant: 'default' as const, className: 'bg-blue-100 text-blue-800' },
      'quoted': { variant: 'default' as const, className: 'bg-purple-100 text-purple-800' },
      'approved': { variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      'in_progress': { variant: 'default' as const, className: 'bg-yellow-100 text-yellow-800' },
      'complete': { variant: 'default' as const, className: 'bg-gray-100 text-gray-800' },
      'on_hold': { variant: 'default' as const, className: 'bg-orange-100 text-orange-800' },
      'cancelled': { variant: 'default' as const, className: 'bg-red-100 text-red-800' }
    };
    
    const config = configs[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getMarginBadge = (marginPercentage: number | null | undefined) => {
    if (marginPercentage === null || marginPercentage === undefined) {
      return <span className="text-muted-foreground text-xs">N/A</span>;
    }
    
    let className = 'text-xs';
    if (marginPercentage >= 20) className += ' bg-green-100 text-green-800';
    else if (marginPercentage >= 10) className += ' bg-yellow-100 text-yellow-800';  
    else if (marginPercentage >= 0) className += ' bg-orange-100 text-orange-800';
    else className += ' bg-red-100 text-red-800';
    
    return (
      <Badge variant="default" className={className}>
        {marginPercentage.toFixed(1)}%
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return <span className="text-muted-foreground text-xs">N/A</span>;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProjectType = (type: string) => {
    return type === 'construction_project' ? 'Construction' : 'Work Order';
  };

  const hasEstimates = (projectId: string) => {
    return estimates.some(e => e.project_id === projectId);
  };

  const columns: FinancialTableColumn<ProjectWithFinancials>[] = [
    {
      key: 'project_name',
      label: 'Project',
      sortable: true,
      render: (project) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">{project.project_name}</div>
          <div className="text-xs text-muted-foreground">
            {project.project_number} • {project.client_name}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      sortable: true,
      render: (project) => getStatusBadge(project.status),
    },
    {
      key: 'project_type',
      label: 'Type',
      align: 'center',
      render: (project) => (
        <Badge variant="outline" className="text-xs">
          {getProjectType(project.project_type)}
        </Badge>
      ),
    },
    {
      key: 'contracted_amount',
      label: 'Contract Value',
      align: 'right',
      sortable: true,
      render: (project) => (
        <div className="text-right">
          <div className="font-medium text-sm">{formatCurrency(project.contracted_amount)}</div>
          {project.total_accepted_quotes && project.total_accepted_quotes !== project.contracted_amount && (
            <div className="text-xs text-muted-foreground">
              Base: {formatCurrency(project.total_accepted_quotes)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'estimatedCost',
      label: 'Est. Cost',
      align: 'right',
      render: (project) => formatCurrency(project.estimatedCost),
    },
    {
      key: 'actualExpenses',
      label: 'Actual Spent',
      align: 'right',
      render: (project) => formatCurrency(project.actualExpenses),
    },
    {
      key: 'current_margin',
      label: 'Current Margin',
      align: 'right',
      sortable: true,
      render: (project) => (
        <div className="text-right space-y-1">
          <div className="font-medium text-sm">{formatCurrency(project.current_margin)}</div>
          <div>{getMarginBadge(project.margin_percentage)}</div>
        </div>
      ),
    },
    {
      key: 'contingency_remaining',
      label: 'Contingency',
      align: 'right',
      render: (project) => formatCurrency(project.contingencyRemaining),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      width: '60px',
      render: (project) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onView(project)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(project)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => window.location.href = `/estimates?project=${project.id}`}
              disabled={!hasEstimates(project.id)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Financials
            </DropdownMenuItem>
            {onArchive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onArchive(project.id)}
                  className="text-orange-600 focus:text-orange-600"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Projects ({projects.length})</h2>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>
      
      <FinancialTableTemplate
        data={projects}
        columns={columns}
        onView={onView}
        onEdit={onEdit}
        getItemId={(project) => project.id}
        emptyMessage="No projects found. Create your first project to get started."
        emptyIcon={<Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />}
        showActions={false} // We handle actions in the dropdown
        sortable={true}
      />
    </div>
  );
};