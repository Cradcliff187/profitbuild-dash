import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleFilterSectionProps {
  title: string;
  children: React.ReactNode;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  defaultExpanded?: boolean;
  alwaysExpanded?: boolean;
  resultCount?: number;
  className?: string;
  leftActions?: React.ReactNode;
  actions?: React.ReactNode;
}

export const CollapsibleFilterSection: React.FC<CollapsibleFilterSectionProps> = ({
  title,
  children,
  hasActiveFilters = false,
  activeFilterCount = 0,
  onClearFilters,
  defaultExpanded = false,
  alwaysExpanded = false,
  resultCount,
  className,
  leftActions,
  actions
}) => {
  const [isExpanded, setIsExpanded] = useState(
    alwaysExpanded === true ? true : (defaultExpanded ?? false)
  );

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden flex-1">
            <Filter className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {title}
              {resultCount !== undefined && hasActiveFilters && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({resultCount} result{resultCount !== 1 ? 's' : ''})
                </span>
              )}
            </span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-semibold flex-shrink-0">
                {activeFilterCount}
              </Badge>
            )}
            {leftActions && (
              <>
                <div className="h-4 w-px bg-border mx-1 flex-shrink-0" />
                {leftActions}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {actions}
            {onClearFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            {!alwaysExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 px-2"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-3 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
};