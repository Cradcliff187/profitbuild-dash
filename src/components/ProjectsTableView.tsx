import React from "react";
import { Plus, MoreHorizontal, Building2, Edit, Eye, Archive, DollarSign, Calendar, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
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

  const getMarginBadge = (marginPercentage: number | null | undefined, targetMargin: number | null | undefined, minimumThreshold: number | null | undefined) => {
    if (marginPercentage === null || marginPercentage === undefined) {
      return <span className="text-muted-foreground text-xs">N/A</span>;
    }
    
    const target = targetMargin || 20;
    const minimum = minimumThreshold || 10;
    
    let className = 'text-xs flex items-center gap-1';
    let icon = null;
    
    if (marginPercentage >= target) {
      className += ' bg-success/10 text-success border-success/20';
    } else if (marginPercentage >= minimum) {
      className += ' bg-warning/10 text-warning border-warning/20';
    } else if (marginPercentage >= 0) {
      className += ' bg-orange-100 text-orange-800 border-orange-200';
    } else {
      className += ' bg-destructive/10 text-destructive border-destructive/20';
      icon = <AlertTriangle className="h-3 w-3" />;
    }
    
    return (
      <Badge variant="outline" className={className}>
        {icon}
        {marginPercentage.toFixed(1)}%
      </Badge>
    );
  };

  const getMarginContext = (status: ProjectStatus) => {
    switch (status) {
      case 'estimating':
      case 'quoted':
        return 'Projected';
      case 'complete':
        return 'Final';
      default:
        return 'Current';
    }
  };

  const formatDate = (date: Date | string | null | undefined, status: ProjectStatus, isEndDate = false) => {
    if (!date) return <span className="text-muted-foreground text-xs">Not set</span>;
    
    const dateObj = new Date(date);
    const formattedDate = format(dateObj, 'MMM d, yyyy');
    
    let label = '';
    let className = 'text-xs';
    
    if (isEndDate) {
      switch (status) {
        case 'estimating':
        case 'quoted':
        case 'approved':
          label = 'Target';
          className += ' text-muted-foreground';
          break;
        case 'in_progress':
          if (isPast(dateObj)) {
            label = 'Overdue';
            className += ' text-destructive';
          } else {
            label = 'Due';
            className += ' text-warning';
          }
          break;
        case 'complete':
          label = 'Completed';
          className += ' text-success';
          break;
        default:
          label = 'Target';
          className += ' text-muted-foreground';
      }
    } else {
      switch (status) {
        case 'estimating':
        case 'quoted':
        case 'approved':
          label = 'Planned';
          className += ' text-muted-foreground';
          break;
        case 'in_progress':
          label = 'Started';
          className += ' text-success';
          break;
        case 'complete':
          label = 'Started';
          className += ' text-muted-foreground';
          break;
        default:
          label = 'Planned';
          className += ' text-muted-foreground';
      }
    }
    
    return (
      <div className="text-right">
        <div className="font-medium text-sm">{formattedDate}</div>
        <div className={className}>{label}</div>
      </div>
    );
  };

  const calculateDuration = (startDate: Date | string | null | undefined, endDate: Date | string | null | undefined, status: ProjectStatus) => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    
    const totalDays = differenceInDays(end, start);
    
    switch (status) {
      case 'estimating':
      case 'quoted':
      case 'approved':
        return `${totalDays} days planned`;
      case 'in_progress':
        const daysSinceStart = differenceInDays(today, start);
        const daysRemaining = differenceInDays(end, today);
        if (daysRemaining < 0) {
          return `${Math.abs(daysRemaining)} days overdue`;
        }
        return `${daysSinceStart}/${totalDays} days (${daysRemaining} left)`;
      case 'complete':
        const actualDays = differenceInDays(end, start);
        return `${actualDays} days (completed)`;
      default:
        return `${totalDays} days`;
    }
  };

  const getBudgetPerformance = (estimatedCost: number | null | undefined, actualExpenses: number | null | undefined) => {
    if (!estimatedCost || !actualExpenses) return null;
    
    const percentage = (actualExpenses / estimatedCost) * 100;
    let className = 'text-xs';
    
    if (percentage <= 90) {
      className += ' text-success';
    } else if (percentage <= 100) {
      className += ' text-warning';
    } else {
      className += ' text-destructive';
    }
    
    return (
      <div className="space-y-1">
        <Progress value={Math.min(percentage, 100)} className="h-1" />
        <div className={className}>{percentage.toFixed(1)}% of budget</div>
      </div>
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
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{project.project_number} • {project.client_name}</span>
            {project.job_type && (
              <Badge variant="secondary" className="text-xs py-0 px-1">
                {project.job_type}
              </Badge>
            )}
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
      key: 'start_date',
      label: 'Start Date',
      align: 'right',
      sortable: true,
      render: (project) => formatDate(project.start_date, project.status),
    },
    {
      key: 'end_date',
      label: 'Target/End Date',
      align: 'right',
      sortable: true,
      render: (project) => formatDate(project.end_date, project.status, true),
    },
    {
      key: 'duration',
      label: 'Schedule',
      align: 'center',
      render: (project) => {
        const duration = calculateDuration(project.start_date, project.end_date, project.status);
        if (!duration) return <span className="text-muted-foreground text-xs">N/A</span>;
        
        const isOverdue = duration.includes('overdue');
        return (
          <div className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Clock className="h-3 w-3" />
            {duration}
          </div>
        );
      },
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
      label: 'Est. Cost (Internal)',
      align: 'right',
      render: (project) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right">
                <div className="font-medium text-sm">{formatCurrency(project.estimatedCost)}</div>
                {getBudgetPerformance(project.estimatedCost, project.actualExpenses)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Internal cost estimate from line items</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      key: 'actualExpenses',
      label: 'Actual Spent',
      align: 'right',
      render: (project) => formatCurrency(project.actualExpenses),
    },
    {
      key: 'current_margin',
      label: 'Margin',
      align: 'right',
      sortable: true,
      render: (project) => (
        <div className="text-right space-y-1">
          <div className="font-medium text-sm">{formatCurrency(project.current_margin)}</div>
          <div className="text-xs text-muted-foreground">{getMarginContext(project.status)} Margin</div>
          <div>{getMarginBadge(project.margin_percentage, project.target_margin, project.minimum_margin_threshold)}</div>
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
    <TooltipProvider>
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
    </TooltipProvider>
  );
};