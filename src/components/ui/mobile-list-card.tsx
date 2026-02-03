import React, { useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface MobileListCardMetric {
  label: string;
  value: React.ReactNode; // Allows pre-formatted values from existing logic
  subtext?: string;       // e.g., "(estimate)" indicator
}

export interface MobileListCardAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

export interface MobileListCardBadge {
  label: string;
  className: string; // Allows existing getStatusColor() functions
}

export interface MobileListCardProps {
  // === LEADING VISUAL ===
  leading?: React.ReactNode; // Icon, thumbnail, or avatar — renders left of title area

  // === IDENTITY ===
  title: string;
  subtitle?: string;
  badge?: MobileListCardBadge;
  secondaryBadge?: MobileListCardBadge; // e.g., "WORK ORDER" type badge

  // === METRICS (status-aware, passed from parent) ===
  metrics?: MobileListCardMetric[];
  metricsColumns?: 2 | 3; // Grid layout, default 2

  // === ATTENTION INDICATOR ===
  attention?: {
    message: string;
    variant: "warning" | "error" | "info";
  };

  // === ACTIONS ===
  onTap?: () => void;
  actions?: MobileListCardAction[];

  // === EXPANDABLE CONTENT ===
  expandable?: boolean;
  expandedContent?: React.ReactNode; // Existing expanded UI passed through
  defaultExpanded?: boolean;
  expandTriggerLabel?: string; // e.g., "View Details"

  // === SELECTION ===
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;

  // === STYLING ===
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MobileListCard({
  // Leading
  leading,

  // Identity
  title,
  subtitle,
  badge,
  secondaryBadge,

  // Metrics
  metrics = [],
  metricsColumns = 2,

  // Attention
  attention,

  // Actions
  onTap,
  actions = [],

  // Expandable
  expandable = false,
  expandedContent,
  defaultExpanded = false,
  expandTriggerLabel,

  // Selection
  selectable = false,
  selected = false,
  onSelectChange,

  // Styling
  className,
}: MobileListCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleCardTap = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest('[role="menuitem"]') ||
      target.closest('[data-state]') || // Radix UI elements
      target.closest('input[type="checkbox"]')
    ) {
      return;
    }
    onTap?.();
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      className={cn(
        "mobile-list-card",
        onTap && "cursor-pointer",
        className
      )}
      onClick={handleCardTap}
    >
      {/* === HEADER: Leading + Badge + Title + Actions === */}
      <CardHeader className="mobile-list-card-header">
        <div className="flex items-start justify-between gap-2">
          {/* Left: Checkbox (if selectable) + Leading + Title Area */}
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange?.(checked as boolean)}
                className="flex-shrink-0 mt-1"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {leading && (
              <div className="flex-shrink-0">
                {leading}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {/* Badges */}
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                {badge && badge.label && (
                  <Badge className={cn("mobile-list-card-badge", badge.className)}>
                    {badge.label}
                  </Badge>
                )}
                {secondaryBadge && secondaryBadge.label && (
                  <Badge variant="outline" className="mobile-list-card-badge">
                    {secondaryBadge.label}
                  </Badge>
                )}
              </div>
              {/* Title */}
              <h3 className="mobile-list-card-title">{title}</h3>
              {/* Subtitle */}
              {subtitle && (
                <p className="mobile-list-card-subtitle">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: Actions Menu */}
          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mobile-list-card-action h-8 w-8 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <React.Fragment key={action.label}>
                    {action.variant === "destructive" && index > 0 && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        action.variant === "destructive" && "text-destructive"
                      )}
                    >
                      <action.icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="mobile-list-card-content">
        {/* === ATTENTION INDICATOR === */}
        {attention && (
          <div
            className={cn(
              "mobile-list-card-attention",
              attention.variant === "warning" && "bg-warning/10 text-warning border-warning/20",
              attention.variant === "error" && "bg-destructive/10 text-destructive border-destructive/20",
              attention.variant === "info" && "bg-primary/10 text-primary border-primary/20"
            )}
          >
            {attention.message}
          </div>
        )}

        {/* === METRICS GRID === */}
        {metrics.length > 0 && (
          <div
            className={cn(
              "mobile-list-card-metrics",
              metricsColumns === 3 && "grid-cols-3"
            )}
          >
            {metrics.map((metric, index) => (
              <div key={index} className="mobile-list-card-metric">
                <p className="mobile-list-card-metric-label">{metric.label}</p>
                <p className="mobile-list-card-metric-value">
                  {metric.value}
                  {metric.subtext && (
                    <span className="mobile-list-card-metric-subtext">
                      {metric.subtext}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* === EXPANDABLE SECTION === */}
        {expandable && expandedContent && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="mobile-list-card-expand-trigger">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpandToggle}
                className="w-full justify-between h-8 text-xs text-muted-foreground"
              >
                {expandTriggerLabel || (isExpanded ? "Hide Details" : "View Details")}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </Button>
            </div>
            <CollapsibleContent>
              <div className="mobile-list-card-expanded">
                {expandedContent}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export default MobileListCard;
