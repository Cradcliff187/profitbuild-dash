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
  onClearFilters?: () => void;
  defaultExpanded?: boolean;
  resultCount?: number;
  className?: string;
}

export const CollapsibleFilterSection: React.FC<CollapsibleFilterSectionProps> = ({
  title,
  children,
  hasActiveFilters = false,
  onClearFilters,
  defaultExpanded = false,
  resultCount,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs h-5">Active</Badge>
            )}
            {resultCount !== undefined && (
              <Badge variant="outline" className="text-xs h-5">{resultCount}</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {hasActiveFilters && onClearFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
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
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 pb-3">
          {children}
        </CardContent>
      )}
    </Card>
  );
};