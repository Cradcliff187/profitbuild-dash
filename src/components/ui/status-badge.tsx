/**
 * Unified StatusBadge component
 * Use this everywhere instead of inline Badge styling
 * 
 * Single source of truth for all status badge rendering
 */

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getProjectStatusColor,
  getEstimateStatusColor,
  getExpenseStatusColor,
  getChangeOrderStatusColor,
  getQuoteStatusColor,
  type ProjectStatus,
  type EstimateStatus,
  type ExpenseStatus,
  type ChangeOrderStatus,
  type QuoteStatus,
} from "@/lib/statusColors";

// =============================================================================
// TYPES
// =============================================================================

type StatusType = 'project' | 'estimate' | 'expense' | 'change_order' | 'quote';

interface StatusBadgeProps {
  /** The status value */
  status: string;
  /** Type of status to determine color scheme */
  type: StatusType;
  /** Size variant */
  size?: 'xs' | 'sm' | 'default';
  /** Additional className */
  className?: string;
  /** Custom label (defaults to formatted status) */
  label?: string;
}

// =============================================================================
// SIZE VARIANTS
// =============================================================================

const sizeClasses = {
  xs: 'text-[10px] px-1.5 py-0 h-4 leading-none',      // Mobile compact
  sm: 'text-xs px-2 py-0.5 h-5',                       // Standard badges
  default: 'text-sm px-2.5 py-1',                      // Larger contexts
};

// =============================================================================
// COMPONENT
// =============================================================================

export const StatusBadge = ({ status, type, size = 'default', className, label }: StatusBadgeProps) => {
    // Get color based on type
    const getColorClass = () => {
      switch (type) {
        case 'project':
          return getProjectStatusColor(status as ProjectStatus);
        case 'estimate':
          return getEstimateStatusColor(status as EstimateStatus);
        case 'expense':
          return getExpenseStatusColor(status as ExpenseStatus);
        case 'change_order':
          return getChangeOrderStatusColor(status as ChangeOrderStatus);
        case 'quote':
          return getQuoteStatusColor(status as QuoteStatus);
        default:
          return getProjectStatusColor(status as ProjectStatus);
      }
    };

    // Format label
    const displayLabel = label || status.replace(/_/g, ' ');

    return (
      <Badge
        variant="outline"
        className={cn(
          sizeClasses[size],
          getColorClass(),
          'capitalize font-medium',
          className
        )}
      >
        {displayLabel}
      </Badge>
    );
};

StatusBadge.displayName = "StatusBadge";

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const ProjectStatusBadge = (props: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge {...props} type="project" />
);

export const EstimateStatusBadge = (props: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge {...props} type="estimate" />
);

export const ExpenseStatusBadge = (props: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge {...props} type="expense" />
);

export const ChangeOrderStatusBadge = (props: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge {...props} type="change_order" />
);

export const QuoteStatusBadge = (props: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge {...props} type="quote" />
);
