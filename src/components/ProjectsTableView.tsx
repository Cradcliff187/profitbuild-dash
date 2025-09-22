import React, { useState } from "react";
import { Plus, MoreHorizontal, Building2, Edit, Eye, Archive, DollarSign, Calendar, Clock, AlertTriangle, Filter } from "lucide-react";
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
import { ProjectWithFinancials } from "@/utils/projectFinancials";
import { FinancialTableTemplate, FinancialTableColumn } from "@/components/FinancialTableTemplate";
import { ProjectDetailsModal } from "@/components/ProjectDetailsModal";
import { ProjectStatusFilter } from "@/components/ProjectStatusFilter";

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
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filter projects by status
  const filteredProjects = selectedStatuses.length > 0 
    ? projects.filter(project => selectedStatuses.includes(project.status))
    : projects;

  // Count projects by status
  const projectCounts = projects.reduce((counts, project) => {
    counts[project.status] = (counts[project.status] || 0) + 1;
    return counts;
  }, {} as Record<ProjectStatus, number>);

  const handleViewDetails = (project: Project) => {
    setSelectedProject(project);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedProject(null);
  };

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
    
    const totalDays = differenceInDays(end, start) + 1; // Include both start and end days
    
    switch (status) {
      case 'estimating':
      case 'quoted':
      case 'approved':
        return {
          display: `${totalDays} days planned`,
          status: 'planned' as const
        };
      case 'in_progress':
        const daysSinceStart = differenceInDays(today, start) + 1;
        const daysRemaining = differenceInDays(end, today);
        const progress = Math.min(100, Math.max(0, (daysSinceStart / totalDays) * 100));
        
        if (daysRemaining < 0) {
          const overdueDays = Math.abs(daysRemaining);
          return {
            display: `Day ${daysSinceStart} (${overdueDays} days overdue)`,
            progress: 100,
            status: 'overdue' as const
          };
        } else if (daysRemaining <= Math.ceil(totalDays * 0.2)) {
          return {
            display: `Day ${daysSinceStart} of ${totalDays} (${daysRemaining} left)`,
            progress,
            status: 'warning' as const
          };
        } else {
          return {
            display: `Day ${daysSinceStart} of ${totalDays} (${daysRemaining} left)`,
            progress,
            status: 'on-track' as const
          };
        }
      case 'complete':
        const actualDays = differenceInDays(end, start) + 1;
        return {
          display: `${actualDays} days (completed)`,
          status: 'completed' as const
        };
      default:
        return {
          display: `${totalDays} days`,
          status: 'planned' as const
        };
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
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="space-y-1 cursor-help">
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
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p><strong>Project:</strong> {project.project_name}</p>
              <p><strong>Number:</strong> {project.project_number}</p>
              <p><strong>Client:</strong> {project.client_name}</p>
              {project.job_type && <p><strong>Type:</strong> {getProjectType(project.job_type)}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      sortable: true,
      render: (project) => {
        const statusExplanations = {
          'estimating': 'Project is being estimated and scoped',
          'quoted': 'Project has been quoted and waiting for approval',
          'approved': 'Project approved, waiting to start',
          'in_progress': 'Project is currently active and ongoing',
          'complete': 'Project has been finished and delivered',
          'on_hold': 'Project is temporarily paused or delayed',
          'cancelled': 'Project has been cancelled or terminated'
        };

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                {getStatusBadge(project.status)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{statusExplanations[project.status]}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'start_date',
      label: 'Start Date',
      align: 'right',
      sortable: true,
      render: (project) => {
        if (!project.start_date) return <span className="text-muted-foreground text-xs">Not set</span>;
        
        const dateObj = new Date(project.start_date);
        const formattedDate = format(dateObj, 'MMM d, yyyy');
        
        const getDateContext = () => {
          switch (project.status) {
            case 'estimating':
            case 'quoted':
            case 'approved':
              return 'Planned start date for project execution';
            case 'in_progress':
              return 'Actual date when project work began';
            case 'complete':
              return 'Date when project work started';
            default:
              return 'Planned project start date';
          }
        };
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="font-medium text-sm">{formattedDate}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getDateContext()}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'end_date',
      label: 'Target/End Date',
      align: 'right',
      sortable: true,
      render: (project) => {
        if (!project.end_date) return <span className="text-muted-foreground text-xs">Not set</span>;
        
        const dateObj = new Date(project.end_date);
        const formattedDate = format(dateObj, 'MMM d, yyyy');
        
        const getEndDateContext = () => {
          switch (project.status) {
            case 'estimating':
            case 'quoted':
            case 'approved':
              return 'Target completion date for project delivery';
            case 'in_progress':
              if (isPast(dateObj)) {
                return 'Project is overdue - original target completion date';
              } else {
                return 'Target completion date - project due date';
              }
            case 'complete':
              return 'Date when project was completed';
            default:
              return 'Target project completion date';
          }
        };
        
        let className = 'font-medium text-sm';
        if (project.status === 'in_progress' && isPast(dateObj)) {
          className += ' text-destructive';
        }
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={className}>{formattedDate}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getEndDateContext()}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'duration',
      label: 'Schedule',
      align: 'center',
      render: (project) => {
        const durationData = calculateDuration(project.start_date, project.end_date, project.status);
        if (!durationData) return <span className="text-muted-foreground text-xs">N/A</span>;
        
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'overdue': return 'text-destructive';
            case 'warning': return 'text-warning';
            case 'on-track': return 'text-success';
            case 'completed': return 'text-muted-foreground';
            default: return 'text-muted-foreground';
          }
        };
        
        const getScheduleTooltip = () => {
          const baseText = `Project schedule: ${durationData.display}`;
          switch (project.status) {
            case 'estimating':
            case 'quoted':
            case 'approved':
              return `${baseText}. Planned duration from start to target completion date.`;
            case 'in_progress':
              if (durationData.status === 'overdue') {
                return `${baseText}. Project is past the original due date.`;
              } else if (durationData.status === 'warning') {
                return `${baseText}. Project is nearing the deadline.`;
              } else {
                return `${baseText}. Project is on track to meet the deadline.`;
              }
            case 'complete':
              return `${baseText}. Project has been completed.`;
            default:
              return baseText;
          }
        };
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="space-y-1 cursor-help">
                <div className={`text-xs flex items-center gap-1 justify-center ${getStatusColor(durationData.status)}`}>
                  <Clock className="h-3 w-3" />
                  {durationData.display}
                </div>
                {durationData.progress !== undefined && (
                  <div className="w-16 mx-auto">
                    <Progress 
                      value={durationData.progress} 
                      className="h-1"
                    />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getScheduleTooltip()}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'contracted_amount',
      label: 'Contract Value',
      align: 'right',
      sortable: true,
      render: (project) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-sm">{formatCurrency(project.contracted_amount)}</div>
              {project.total_accepted_quotes && project.total_accepted_quotes !== project.contracted_amount && (
                <div className="text-xs text-muted-foreground">
                  Base: {formatCurrency(project.total_accepted_quotes)}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p><strong>Contract Value:</strong> {formatCurrency(project.contracted_amount)}</p>
              {project.total_accepted_quotes && project.total_accepted_quotes !== project.contracted_amount && (
                <>
                  <p><strong>Base Quote Total:</strong> {formatCurrency(project.total_accepted_quotes)}</p>
                  <p>Difference represents contract markup or negotiated adjustments</p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
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
      render: (project) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {formatCurrency(project.actualExpenses)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p><strong>Actual Expenses:</strong> {formatCurrency(project.actualExpenses)}</p>
              <p>Total expenses recorded for this project to date</p>
              <p>Source: Expense tracking and financial records</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'projected_margin',
      label: 'Projected Margin ($)',
      align: 'right' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const projectedMargin = project.projectedMargin || 0;
        const isPositive = projectedMargin >= 0;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={`font-medium text-sm ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(projectedMargin)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p><strong>Projected Margin:</strong> {formatCurrency(projectedMargin)}</p>
                <p>Calculation: Estimated Revenue - Quoted Costs</p>
                <p>Uses accepted quote prices when available, otherwise estimated costs</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }
    },
    {
      key: 'current_margin',
      label: 'Current Margin ($)',
      align: 'right' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const currentMargin = project.current_margin || 0;
        const isPositive = currentMargin >= 0;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={`font-medium text-sm ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(currentMargin)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p><strong>Current Margin:</strong> {formatCurrency(currentMargin)}</p>
                <p>Calculation: Contract Revenue - Actual Expenses</p>
                <p>Based on real expenses incurred to date</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }
    },
    {
      key: 'margin_percentage',
      label: 'Margin (%)',
      align: 'center' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const marginPercentage = project.margin_percentage || 0;
        const projectedMarginPct = project.projectedRevenue > 0 
          ? ((project.projectedMargin || 0) / project.projectedRevenue) * 100 
          : 0;
        
        // Use projected margin % for estimating/quoted projects, current margin % for active projects
        const displayPercentage = ['estimating', 'quoted'].includes(project.status) 
          ? projectedMarginPct 
          : marginPercentage;
        
        const isProjected = ['estimating', 'quoted'].includes(project.status);
        
        const tooltipContent = isProjected 
          ? `Projected Margin Percentage: ${displayPercentage.toFixed(1)}%. Based on estimated revenue vs quoted costs.`
          : `Current Margin Percentage: ${displayPercentage.toFixed(1)}%. Based on actual expenses vs contract revenue.`;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-help">
                <div className="flex items-center justify-center">
                  {getMarginBadge(displayPercentage, project.target_margin, project.minimum_margin_threshold)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        );
      }
    },
    {
      key: 'line_items',
      label: 'Line Items',
      align: 'center' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const count = project.nonInternalLineItemCount || 0;
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                    {count}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Non-internal labor items requiring procurement</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    },
    {
      key: 'contingency_remaining',
      label: 'Contingency',
      align: 'right',
      render: (project) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              {formatCurrency(project.contingencyRemaining)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p><strong>Remaining Contingency:</strong> {formatCurrency(project.contingencyRemaining)}</p>
              <p>Budget buffer available for unexpected costs or scope changes</p>
              <p>Calculated from original contingency allocation minus usage</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ),
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
            <DropdownMenuItem onClick={() => handleViewDetails(project)}>
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">
                Projects ({filteredProjects.length}
                {selectedStatuses.length > 0 && ` of ${projects.length}`})
              </h2>
            </div>
            <ProjectStatusFilter
              selectedStatuses={selectedStatuses}
              onStatusChange={setSelectedStatuses}
              projectCounts={projectCounts}
            />
          </div>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
        
        <FinancialTableTemplate
          data={filteredProjects}
          columns={columns}
          onView={handleViewDetails}
          onEdit={onEdit}
          getItemId={(project) => project.id}
          emptyMessage={
            selectedStatuses.length > 0 
              ? `No projects found with selected status${selectedStatuses.length > 1 ? 'es' : ''}.`
              : "No projects found. Create your first project to get started."
          }
          emptyIcon={<Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />}
          showActions={false} // We handle actions in the dropdown
          sortable={true}
        />

        <ProjectDetailsModal
          isOpen={showDetailsModal}
          onClose={handleCloseDetailsModal}
          project={selectedProject}
          estimates={estimates}
          onEdit={() => {
            handleCloseDetailsModal();
            if (selectedProject) onEdit(selectedProject);
          }}
          onViewFinancials={() => {
            if (selectedProject) {
              window.location.href = `/estimates?project=${selectedProject.id}`;
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
};