import React, { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Building2, Edit, Eye, Archive, Calendar, Clock, AlertTriangle, Filter, Trash2, ChevronsUpDown } from "lucide-react";
import { ProjectStatusSelector } from "@/components/ProjectStatusSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { FinancialTableTemplate, FinancialTableColumn, FinancialTableGroup } from "@/components/FinancialTableTemplate";

import { cn, formatCurrency } from "@/lib/utils";
import { ColumnSelector } from "@/components/ui/column-selector";

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
  const isMobile = useIsMobile();
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean; project: Project | null}>({
    open: false,
    project: null
  });

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Initialize all groups as collapsed on first load
  useEffect(() => {
    if (projects.length > 0 && collapsedGroups.size === 0) {
      const allKeys = new Set(projects.map(p => p.id));
      setCollapsedGroups(allKeys);
    }
  }, [projects.length]);

  // Define column metadata for selector
  const columnDefinitions = [
    { key: 'project_number', label: 'Project #', required: true },
    { key: 'status', label: 'Status', required: true },
    { key: 'customer_po_number', label: 'Customer PO #', required: false },
    { key: 'start_date', label: 'Start Date', required: false },
    { key: 'end_date', label: 'Target/End Date', required: false },
    { key: 'duration', label: 'Schedule', required: false },
    { key: 'contracted_amount', label: 'Contract Value', required: false },
    { key: 'originalContract', label: 'Original Contract', required: false },
    { key: 'changeOrders', label: 'Change Orders', required: false },
    { key: 'originalEstimatedCosts', label: 'Original Est. Costs', required: false },
    { key: 'originalEstimatedMargin', label: 'Original Est. Margin ($)', required: false },
    { key: 'adjusted_est_costs', label: 'Adjusted Est. Costs', required: false },
    { key: 'cost_variance', label: 'Cost Variance', required: false },
    { key: 'projected_margin', label: 'Projected Margin ($)', required: false },
    { key: 'margin_percentage', label: 'Projected Margin %', required: false },
    { key: 'actual_expenses', label: 'Actual Expenses', required: false },
    { key: 'line_items', label: 'Line Items', required: false },
    { key: 'contingency_remaining', label: 'Contingency Remaining', required: false },
    { key: 'actions', label: 'Actions', required: true },
  ];

  // Helper function to extract day number from schedule display text
  const extractDayNumber = (displayText: string): string => {
    // Extract the first number from strings like:
    // "32 days remaining" → "32"
    // "5 days overdue" → "5"
    // "Day 10 of 45 (35 left)" → "10"
    // "Starts in 7 days" → "7"
    const match = displayText.match(/\d+/);
    return match ? match[0] : displayText;
  };

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('projects-visible-columns');
    if (saved) {
      const savedVisible = JSON.parse(saved);
      // Filter out invalid column keys
      return savedVisible.filter((key: string) => 
        columnDefinitions.some(col => col.key === key)
      );
    }
    // Default visible columns
    return [
      'project_number',
      'status',
      'start_date',
      'end_date',
      'duration',
      'contracted_amount',
      'changeOrders',
      'contingency_remaining',
      'originalEstimatedMargin',
      'projected_margin',
      'margin_percentage',
      'actions'
    ];
  });

  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('projects-column-order');
    if (saved) {
      const savedOrder = JSON.parse(saved);
      // Filter out any invalid column keys that no longer exist
      const validOrder = savedOrder.filter((key: string) => 
        columnDefinitions.some(col => col.key === key)
      );
      // Add any new columns that aren't in saved order
      const newColumns = columnDefinitions
        .map(col => col.key)
        .filter(key => !validOrder.includes(key));
      
      return [...validOrder, ...newColumns];
    }
    // Default: use order from columnDefinitions
    return columnDefinitions.map(col => col.key);
  });

  // Save visibility to localStorage
  useEffect(() => {
    localStorage.setItem('projects-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Save order to localStorage
  useEffect(() => {
    localStorage.setItem('projects-column-order', JSON.stringify(columnOrder));
  }, [columnOrder]);

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
      <Badge variant="outline" className={cn(className, "font-mono tabular-nums")}>
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
    let className = 'text-[11px]';
    
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
        <div className="font-medium text-xs">{formattedDate}</div>
        <div className="text-[11px]">{label}</div>
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
      case 'approved': {
        // If start date is in the future - show countdown to start
        if (start > today) {
          const daysUntilStart = differenceInDays(start, today);
          return {
            display: `Starts in ${daysUntilStart} ${daysUntilStart === 1 ? 'day' : 'days'}`,
            status: 'planned' as const
          };
        }
        
        // If start date is today or past - show days remaining to completion
        const daysRemaining = differenceInDays(end, today);
        
        // If past due date
        if (daysRemaining < 0) {
          const overdueDays = Math.abs(daysRemaining);
          return {
            display: `${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} overdue`,
            status: 'overdue' as const
          };
        }
        
        // If within last 20% of schedule - show warning
        if (daysRemaining <= Math.ceil(totalDays * 0.2)) {
          return {
            display: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`,
            status: 'warning' as const
          };
        }
        
        // Normal - show days remaining
        return {
          display: `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`,
          status: 'on-track' as const
        };
      }
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


  const getProjectType = (type: string) => {
    return type === 'construction_project' ? 'Construction' : 'Work Order';
  };

  const hasEstimates = (projectId: string) => {
    return estimates.some(e => e.project_id === projectId);
  };

  const allColumns: FinancialTableColumn<ProjectWithFinancials>[] = [
    {
      key: 'project_number',
      label: 'Project #',
      sortable: true,
      getSortValue: (project) => project.project_number,
      render: (project) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="font-mono text-foreground/80 cursor-help whitespace-nowrap text-xs">
              {project.project_number}
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
      key: 'customer_po_number',
      label: 'Customer PO #',
      sortable: true,
      getSortValue: (project) => project.customer_po_number || '',
      render: (project) => (
        <span className="text-xs font-mono">
          {project.customer_po_number || <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'start_date',
      label: 'Start Date',
      align: 'right',
      sortable: true,
      getSortValue: (project) => project.start_date ? new Date(project.start_date).getTime() : 0,
      render: (project) => {
        if (!project.start_date) return <span className="text-muted-foreground text-[11px]">Not set</span>;
        
        const dateObj = new Date(project.start_date);
        const formattedDate = format(dateObj, 'MM/dd/yyyy');
        
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
                <div className="font-medium text-xs">{formattedDate}</div>
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
      getSortValue: (project) => project.end_date ? new Date(project.end_date).getTime() : 0,
      render: (project) => {
        if (!project.end_date) return <span className="text-muted-foreground text-[11px]">Not set</span>;
        
        const dateObj = new Date(project.end_date);
        const formattedDate = format(dateObj, 'MM/dd/yyyy');
        
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
        
        let className = 'font-medium text-xs';
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
        if (!durationData) return <span className="text-muted-foreground text-[11px]">N/A</span>;
        
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
              if (durationData.status === 'overdue') {
                return `${baseText}. Approved project is past its target completion date and should be moved to in-progress or reviewed.`;
              } else if (durationData.status === 'warning') {
                return `${baseText}. Approved project is nearing its start/completion date.`;
              } else if (durationData.display.includes('Starts in')) {
                return `${baseText}. Project is scheduled to begin soon.`;
              } else {
                return `${baseText}. Time remaining until target completion date.`;
              }
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
                  {extractDayNumber(durationData.display)}
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
      getSortValue: (project) => project.contracted_amount || 0,
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
                  <div className="font-medium text-xs font-mono tabular-nums text-muted-foreground">
                    {formatCurrency(latestEstimate.total_amount)}
                  </div>
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
                <div className="font-medium text-xs font-mono tabular-nums">{formatCurrency(project.contracted_amount)}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total from approved estimate plus approved change orders (includes billed contingency)</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'totalBudget',
      label: 'Total Budget',
      align: 'right' as const,
      sortable: true,
      getSortValue: (project) => (project.contracted_amount || 0) + (project.contingency_remaining || 0),
      render: (project: ProjectWithFinancials) => {
        const contractValue = project.contracted_amount || 0;
        const contingency = project.contingency_remaining || 0;
        const totalBudget = contractValue + contingency;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="font-medium text-xs font-mono tabular-nums">{formatCurrency(totalBudget)}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <p><strong>Contract Value:</strong> {formatCurrency(contractValue)}</p>
                <p><strong>Contingency Available:</strong> {formatCurrency(contingency)}</p>
                <p><strong>Total Budget:</strong> {formatCurrency(totalBudget)}</p>
              </div>
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
      getSortValue: (project) => project.originalContractAmount || 0,
      render: (project: ProjectWithFinancials) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-xs font-mono tabular-nums">{formatCurrency(project.originalContractAmount)}</div>
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
      align: 'right' as const,
      sortable: true,
      getSortValue: (project) => project.changeOrderRevenue || 0,
      render: (project: ProjectWithFinancials) => {
        const hasChangeOrders = (project.changeOrderCount || 0) > 0;
        const changeOrderRevenue = project.changeOrderRevenue || 0;
        const changeOrderCosts = project.changeOrderCosts || 0;
        const netImpact = changeOrderRevenue - changeOrderCosts;
        
        if (!hasChangeOrders) {
          return (
            <div className="text-right">
              <span className="text-muted-foreground text-[11px] font-mono tabular-nums">—</span>
            </div>
          );
        }
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="font-medium text-xs font-mono tabular-nums">
                  {formatCurrency(changeOrderRevenue)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <p><strong>Change Orders:</strong> {project.changeOrderCount} approved</p>
                <p><strong>Revenue Impact:</strong> {formatCurrency(changeOrderRevenue)}</p>
                <p><strong>Cost Impact:</strong> {formatCurrency(changeOrderCosts)}</p>
                <p><strong>Net Impact:</strong> {formatCurrency(netImpact)}</p>
                <p className="text-muted-foreground mt-1">
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
      key: 'contingency_remaining',
      label: 'Contingency Remaining',
      align: 'right' as const,
      sortable: true,
      getSortValue: (project) => project.contingency_remaining || 0,
      render: (project: ProjectWithFinancials) => {
        const contingency = project.contingency_remaining || 0;
        const contractValue = project.contracted_amount || 0;
        const contingencyPercent = contractValue > 0 
          ? (contingency / contractValue) * 100 
          : 0;
        
        if (contingency === 0) {
          return (
            <div className="text-right">
              <span className="text-muted-foreground text-[11px] font-mono tabular-nums">—</span>
            </div>
          );
        }
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
              <div className="font-medium text-xs font-mono tabular-nums">
                {formatCurrency(contingency)}
              </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <p><strong>Contingency Remaining:</strong> {formatCurrency(contingency)}</p>
                <p><strong>Percentage:</strong> {contingencyPercent.toFixed(1)}% of contract value</p>
                <p className="text-muted-foreground mt-1">
                  Available for unforeseen costs or can be billed via change orders
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
      getSortValue: (project) => project.originalEstimatedCosts || 0,
      render: (project: ProjectWithFinancials) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <div className="font-medium text-xs font-mono tabular-nums">{formatCurrency(project.originalEstimatedCosts)}</div>
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
      getSortValue: (project) => project.original_margin || 0,
      render: (project: ProjectWithFinancials) => {
        const originalMargin = project.original_margin || 0;
        const isPositive = originalMargin >= 0;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={`font-medium text-xs font-mono tabular-nums ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(originalMargin)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p><strong>Original Est. Margin:</strong> {formatCurrency(originalMargin)}</p>
                <p>Initial profit from original approved estimate</p>
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
      getSortValue: (project) => project.adjusted_est_costs || 0,
      render: (project) => {
        const hasApprovedEstimate = estimates.some(e => 
          e.project_id === project.id && e.status === 'approved'
        );
        
        if (!hasApprovedEstimate) return <span className="text-muted-foreground">-</span>;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="font-medium text-xs font-mono tabular-nums">
                  {formatCurrency(project.adjusted_est_costs || 0)}
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
      getSortValue: (project) => {
        const originalCosts = project.original_est_costs || 0;
        const adjustedCosts = project.adjusted_est_costs || 0;
        return adjustedCosts - originalCosts;
      },
      render: (project) => {
        const hasApprovedEstimate = estimates.some(e => 
          e.project_id === project.id && e.status === 'approved'
        );
        
        if (!hasApprovedEstimate) return <span className="text-muted-foreground">-</span>;
        
        const originalCosts = project.original_est_costs || 0; // Original COSTS (not prices)
        const adjustedCosts = project.adjusted_est_costs || 0; // Adjusted COSTS (not prices)
        const variance = adjustedCosts - originalCosts;
        const variancePercent = originalCosts > 0 ? (variance / originalCosts) * 100 : 0;
        const isIncrease = variance > 0;
        
        // Validation: Both should be costs, not prices
        const contractValue = project.contracted_amount || 0;
        if (originalCosts > contractValue || adjustedCosts > contractValue) {
          console.error('ERROR: Costs exceed contract value - likely using prices instead of costs');
        }
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={`font-medium text-xs font-mono tabular-nums ${
                  isIncrease ? 'text-red-600 dark:text-red-400' : 
                  variance < 0 ? 'text-green-600 dark:text-green-400' : 
                  'text-muted-foreground'
                }`}>
                  {variance === 0 ? '-' : 
                   (isIncrease ? '+' : '') + formatCurrency(variance)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div>
                <p><strong>Original Est. COSTS:</strong> {formatCurrency(originalCosts)}</p>
                <p><strong>Adjusted Est. COSTS:</strong> {formatCurrency(adjustedCosts)}</p>
                <p><strong>Variance:</strong> {formatCurrency(Math.abs(variance))} ({Math.abs(variancePercent).toFixed(1)}%)</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {isIncrease ? 'Costs increased from estimate' : 'Costs decreased from estimate (savings!)'}
                </p>
                <p className="text-xs font-bold">These are vendor COSTS, not client prices</p>
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
      getSortValue: (project) => project.projected_margin || 0,
      render: (project: ProjectWithFinancials) => {
        // Compute inline for transparency
        const contract = project.contracted_amount || 0;
        const adjustedCosts = project.adjusted_est_costs || 0;
        const derivedMargin = contract - adjustedCosts;
        
        // Use database value
        const dbMargin = project.projected_margin || 0;
        const isPositive = derivedMargin >= 0;
        
        // Check for sync discrepancy
        const hasSyncIssue = Math.abs(derivedMargin - dbMargin) > 1;
        
        // Calculate breakdown for tooltip
        const originalContract = project.originalContractAmount || 0;
        const originalCosts = project.original_est_costs || 0;
        const originalMargin = originalContract - originalCosts;
        
        const changeOrderRevenue = project.changeOrderRevenue || 0;
        const changeOrderCosts = project.changeOrderCosts || 0;
        const changeOrderNetMargin = changeOrderRevenue - changeOrderCosts;
        
        const quoteVariance = (adjustedCosts - originalCosts) - changeOrderCosts;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className={`font-medium text-xs font-mono tabular-nums flex items-center justify-end gap-1 ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(derivedMargin)}
                  {hasSyncIssue && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-300 text-orange-600">
                      sync
                    </Badge>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-2 text-xs">
                <p className="font-semibold border-b pb-1">Margin Breakdown</p>
                <div className="space-y-1 font-mono tabular-nums">
                  <div className="flex justify-between gap-4">
                    <span>Original Margin:</span>
                    <span>{formatCurrency(originalMargin)}</span>
                  </div>
                  {changeOrderNetMargin !== 0 && (
                    <div className="flex justify-between gap-4 text-blue-600 dark:text-blue-400">
                      <span>+ Change Orders:</span>
                      <span>{formatCurrency(changeOrderNetMargin)}</span>
                    </div>
                  )}
                  {quoteVariance !== 0 && (
                    <div className="flex justify-between gap-4 text-orange-600 dark:text-orange-400">
                      <span>{quoteVariance > 0 ? '−' : '+'} Quote Variance:</span>
                      <span>{formatCurrency(Math.abs(quoteVariance))}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 border-t pt-1 font-semibold">
                    <span>= Projected Margin:</span>
                    <span>{formatCurrency(derivedMargin)}</span>
                  </div>
                </div>
                {hasSyncIssue && (
                  <p className="text-orange-600 dark:text-orange-400 text-[10px] mt-2 border-t pt-1">
                    ⚠ DB value ({formatCurrency(dbMargin)}) differs from calculation. Refresh may be needed.
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }
    },
    {
      key: 'margin_percentage',
      label: 'Projected Margin %',
      align: 'right' as const,
      sortable: true,
      getSortValue: (project) => {
        const contract = project.contracted_amount || 0;
        return contract > 0 ? ((project.projected_margin || 0) / contract) * 100 : 0;
      },
      render: (project: ProjectWithFinancials) => {
        // Calculate projected margin percentage as: Projected Margin / Contract * 100
        const contract = project.contracted_amount || 0;
        const projectedMarginPct = contract > 0 
          ? ((project.projected_margin || 0) / contract) * 100 
          : 0;
        
        const tooltipContent = `Projected Margin Percentage: ${projectedMarginPct.toFixed(1)}%. Calculated as Projected Margin ($${formatCurrency(project.projected_margin || 0)}) ÷ Contract Value ($${formatCurrency(contract)}) × 100.`;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="flex items-center justify-end">
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
      key: 'actual_expenses',
      label: 'Actual Expenses',
      align: 'right',
      sortable: true,
      getSortValue: (project) => project.actualExpenses || 0,
      render: (project) => {
        const actualExpenses = project.actualExpenses || 0;
        const adjustedCosts = project.adjustedEstCosts || 0;
        const percentOfBudget = adjustedCosts > 0 ? (actualExpenses / adjustedCosts) * 100 : 0;
        
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-right cursor-help">
                <div className="font-medium text-xs font-mono tabular-nums">{formatCurrency(actualExpenses)}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p><strong>Total expenses incurred:</strong> {formatCurrency(actualExpenses)}</p>
              {adjustedCosts > 0 && (
                <>
                  <p><strong>Budget:</strong> {formatCurrency(adjustedCosts)}</p>
                  <p><strong>Used:</strong> {percentOfBudget.toFixed(1)}%</p>
                </>
              )}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'line_items',
      label: 'Line Items',
      align: 'center' as const,
      sortable: true,
      getSortValue: (project) => project.totalLineItemCount || 0,
      render: (project: ProjectWithFinancials) => {
        const count = project.totalLineItemCount || 0;
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-medium">
                  {count}
                </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total line items (estimate + approved change orders)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
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

  // Group by project - one project per group
  const sortedProjects = [...projects].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Convert to grouped format - one group per project
  const groupedData: FinancialTableGroup<ProjectWithFinancials>[] = sortedProjects.map(project => ({
    groupKey: project.id,
    groupLabel: (
      <div className="flex items-center gap-2">
        <span>{project.project_number} - {project.project_name}</span>
        {getStatusBadge(project.status)}
      </div>
    ),
    items: [project],
    isCollapsible: true,
    defaultExpanded: false,
  }));

  // Filter columns based on visibility AND sort by custom order
  const columns = columnOrder
    .map(key => allColumns.find(col => col.key === key))
    .filter((col): col is FinancialTableColumn<ProjectWithFinancials> => 
      col !== undefined && visibleColumns.includes(col.key)
    );

  const toggleAllGroups = () => {
    if (collapsedGroups.size > 0) {
      setCollapsedGroups(new Set());
    } else {
      const allKeys = new Set(groupedData.map(g => g.groupKey));
      setCollapsedGroups(allKeys);
    }
  };

  const collapseButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2"
          onClick={toggleAllGroups}
        >
          <ChevronsUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">
            {collapsedGroups.size > 0 ? 'Expand All' : 'Collapse All'}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {collapsedGroups.size > 0 ? 'Expand all groups' : 'Collapse all groups'}
      </TooltipContent>
    </Tooltip>
  );

  const ProjectsTable = FinancialTableTemplate<ProjectWithFinancials>;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </div>
          <div className="flex items-center gap-2">
            <ColumnSelector
              columns={columnDefinitions}
              visibleColumns={visibleColumns}
              onVisibilityChange={setVisibleColumns}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
            />
            {collapseButton}
          </div>
        </div>
        
        <ProjectsTable
          data={groupedData}
          columns={columns}
          isGrouped={true}
          collapsedGroups={collapsedGroups}
          onCollapsedGroupsChange={setCollapsedGroups}
          collapseAllButton={undefined}
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