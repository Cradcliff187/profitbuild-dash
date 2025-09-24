import React, { useState } from "react";
import { Plus, MoreHorizontal, Building2, Edit, Eye, Archive, DollarSign, Calendar, Clock, AlertTriangle, Filter, Trash2 } from "lucide-react";
import { ProjectStatusSelector } from "@/components/ProjectStatusSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import { Project, ProjectStatus } from "@/types/project";
import { ProjectWithFinancials } from "@/utils/projectFinancials";
import { FinancialTableTemplate, FinancialTableColumn } from "@/components/FinancialTableTemplate";

import { cn } from "@/lib/utils";

interface ProjectsTableViewProps {
  projects: ProjectWithFinancials[];
  estimates: any[];
  onEdit: (project: Project) => void;
  onView: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export const ProjectsTableView = ({ 
  projects, 
  estimates,
  onEdit, 
  onView,
  onDelete,
  onArchive,
  onCreateNew,
  isLoading = false 
}: ProjectsTableViewProps) => {
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean; project: Project | null}>({
    open: false,
    project: null
  });

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleViewDetails = (project: Project) => {
    window.location.href = `/projects/${project.id}`;
  };


  const getStatusBadge = (status: ProjectStatus) => {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs capitalize px-2 py-0.5",
          status === 'approved' && 'border-green-200 text-green-700 bg-green-50',
          status === 'estimating' && 'border-gray-200 text-gray-700 bg-gray-50',
          status === 'quoted' && 'border-blue-200 text-blue-700 bg-blue-50',
          status === 'in_progress' && 'border-purple-200 text-purple-700 bg-purple-50',
          status === 'complete' && 'border-green-200 text-green-700 bg-green-50',
          status === 'on_hold' && 'border-yellow-200 text-yellow-700 bg-yellow-50',
          status === 'cancelled' && 'border-red-200 text-red-700 bg-red-50'
        )}
      >
        {status.replace(/_/g, ' ')}
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
      width: '120px',
      sortable: true,
      render: (project) => {
        // Check if project has approved estimate for status selector
        const projectEstimates = estimates.filter(e => e.project_id === project.id);
        const hasApprovedEstimate = projectEstimates.some(e => e.status === 'approved');
        const latestEstimate = projectEstimates
          .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0];

        return (
          <ProjectStatusSelector
            projectId={project.id}
            currentStatus={project.status}
            projectName={project.project_name}
            hasApprovedEstimate={hasApprovedEstimate}
            estimateStatus={latestEstimate?.status}
            onStatusChange={() => {
              // Refresh the page to show updated data
              window.location.reload();
            }}
          />
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
      align: 'right' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const projectEstimates = estimates.filter(e => e.project_id === project.id);
        const hasApprovedEstimate = projectEstimates.some(e => e.status === 'approved');
        const latestEstimate = projectEstimates
          .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())[0];

        if (!hasApprovedEstimate && latestEstimate) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-right cursor-help">
                  <div className="font-medium text-sm text-muted-foreground">
                    {formatCurrency(latestEstimate.total_amount)}
                  </div>
                  <div className="text-xs text-blue-600">Pending approval</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Estimate total pending client approval. Will become contract value when approved.</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="font-medium text-sm">{formatCurrency(project.contracted_amount)}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total from approved estimate plus approved change orders</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'originalContract',
      label: 'Original Contract',
      align: 'right' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-sm">{formatCurrency(project.originalContractAmount)}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div>
              <p><strong>Original Contract:</strong> {formatCurrency(project.originalContractAmount)}</p>
              <p>Base approved estimate amount before any change orders</p>
              <p>Original signed contract value</p>
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'changeOrders',
      label: 'Change Orders',
      align: 'center' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const hasChangeOrders = (project.changeOrderCount || 0) > 0;
        const changeOrderRevenue = project.changeOrderRevenue || 0;
        const changeOrderCosts = project.changeOrderCosts || 0;
        const netImpact = changeOrderRevenue - changeOrderCosts;
        
        if (!hasChangeOrders) {
          return (
            <div className="text-center">
              <span className="text-muted-foreground text-xs">None</span>
            </div>
          );
        }
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-help">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium text-sm">{project.changeOrderCount}</span>
                  <div className={`text-xs px-2 py-0.5 rounded ${
                    netImpact > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                    netImpact < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {formatCurrency(netImpact)}
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p><strong>Change Orders:</strong> {project.changeOrderCount} approved</p>
                <p><strong>Revenue Impact:</strong> {formatCurrency(changeOrderRevenue)}</p>
                <p><strong>Cost Impact:</strong> {formatCurrency(changeOrderCosts)}</p>
                <p><strong>Net Impact:</strong> {formatCurrency(netImpact)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {netImpact > 0 ? 'Positive impact on project profitability' :
                   netImpact < 0 ? 'Negative impact on project profitability' :
                   'Neutral impact on project profitability'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }
    },
    {
      key: 'originalEstimatedCosts',
      label: 'Original Est. Costs',
      align: 'right' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-sm">{formatCurrency(project.originalEstimatedCosts)}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total estimated costs from original approved estimate (before quote adjustments)</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'originalEstimatedMargin',
      label: 'Original Est. Margin ($)',
      align: 'right' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const contractValue = project.contracted_amount || 0;
        const originalCosts = project.originalEstimatedCosts || 0;
        const originalMargin = contractValue - originalCosts;
        const isPositive = originalMargin >= 0;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={`font-medium text-sm ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(originalMargin)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p><strong>Original Est. Margin:</strong> {formatCurrency(originalMargin)}</p>
                <p>Calculation: Contract Value - Original Est. Costs</p>
                <p>Shows initial profit expectation from original approved estimate</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }
    },
    {
      key: 'adjusted_est_costs',
      label: 'Adjusted Est. Costs',
      align: 'right',
      sortable: true,
      render: (project) => {
        const hasApprovedEstimate = estimates.some(e => 
          e.project_id === project.id && e.status === 'approved'
        );
        
        if (!hasApprovedEstimate) return <span className="text-muted-foreground">-</span>;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="font-medium text-sm">
                  {formatCurrency(project.adjustedEstCosts || 0)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total estimated costs after quotes received</p>
              <p>Includes: External costs (quoted or estimated) + Internal labor + Change orders</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'cost_variance',
      label: 'Cost Variance',
      align: 'right',
      sortable: true,
      render: (project) => {
        const hasApprovedEstimate = estimates.some(e => 
          e.project_id === project.id && e.status === 'approved'
        );
        
        if (!hasApprovedEstimate) return <span className="text-muted-foreground">-</span>;
        
        const originalCosts = project.originalEstCosts || 0;
        const adjustedCosts = project.adjustedEstCosts || 0;
        const variance = adjustedCosts - originalCosts;
        const variancePercent = originalCosts > 0 ? (variance / originalCosts) * 100 : 0;
        const isIncrease = variance > 0;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={`font-medium text-sm ${
                  isIncrease ? 'text-red-600 dark:text-red-400' : 
                  variance < 0 ? 'text-green-600 dark:text-green-400' : 
                  'text-muted-foreground'
                }`}>
                  {variance === 0 ? '-' : 
                   (isIncrease ? '+' : '') + formatCurrency(variance)}
                </div>
                {variance !== 0 && (
                  <div className="text-xs text-muted-foreground">
                    ({isIncrease ? '+' : ''}{variancePercent.toFixed(1)}%)
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p><strong>Original Est. Costs:</strong> {formatCurrency(originalCosts)}</p>
                <p><strong>Adjusted Est. Costs:</strong> {formatCurrency(adjustedCosts)}</p>
                <p><strong>Variance:</strong> {formatCurrency(Math.abs(variance))} ({Math.abs(variancePercent).toFixed(1)}%)</p>
                <p className="text-xs mt-1">Impact of quotes and change orders on costs</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
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
                <p>Calculation: Contract Value - (Internal Costs + External Costs)</p>
                <p>Uses actual quote costs for external work when available, estimated costs otherwise</p>
                <p>Internal costs include labor and management; external costs include subcontractors, materials, etc.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }
    },
    {
      key: 'margin_percentage',
      label: 'Projected Margin %',
      align: 'center' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const projectedMarginPct = project.currentContractAmount > 0 
          ? ((project.projectedMargin || 0) / project.currentContractAmount) * 100 
          : 0;
        
        const tooltipContent = `Projected Margin Percentage: ${projectedMarginPct.toFixed(1)}%. Calculated as Projected Margin ÷ Contract Value × 100.`;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-help">
                <div className="flex items-center justify-center">
                  {getMarginBadge(projectedMarginPct, project.target_margin, project.minimum_margin_threshold)}
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
      key: 'actualExpenses',
      label: 'Actual Expenses',
      align: 'right',
      sortable: true,
      render: (project) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-sm">{formatCurrency(project.actualExpenses)}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total expenses recorded to date</p>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'line_items',
      label: 'Line Items',
      align: 'center' as const,
      sortable: true,
      render: (project: ProjectWithFinancials) => {
        const count = project.totalLineItemCount || 0;
        
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
                <p>Total line items in approved estimate</p>
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
              <p>From approved estimate contingency allocation minus usage by change orders</p>
              <p>Budget buffer available for unexpected costs or scope changes</p>
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
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setDeleteConfirm({open: true, project})}
                  className="text-destructive focus:text-destructive"
                  disabled={deletingProjectId === project.id}
                >
                  {deletingProjectId === project.id ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
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
                Projects ({projects.length})
              </h2>
            </div>
          </div>
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
        
        <FinancialTableTemplate
          data={projects}
          columns={columns}
          onView={handleViewDetails}
          onEdit={onEdit}
          getItemId={(project) => project.id}
          emptyMessage="No projects found. Create your first project to get started."
          emptyIcon={<Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />}
          showActions={false} // We handle actions in the dropdown
          sortable={true}
        />

        <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({open, project: null})}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteConfirm.project?.project_name}"? 
                This action will permanently delete the project and all related data including estimates, quotes, and expenses. 
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  if (deleteConfirm.project && onDelete) {
                    setDeletingProjectId(deleteConfirm.project.id);
                    try {
                      await onDelete(deleteConfirm.project.id);
                    } finally {
                      setDeletingProjectId(null);
                      setDeleteConfirm({open: false, project: null});
                    }
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletingProjectId === deleteConfirm.project?.id}
              >
                {deletingProjectId === deleteConfirm.project?.id ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};