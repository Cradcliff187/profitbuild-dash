import React from "react";
import { Filter, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ProjectStatus, PROJECT_STATUSES } from "@/types/project";

interface ProjectStatusFilterProps {
  selectedStatuses: ProjectStatus[];
  onStatusChange: (statuses: ProjectStatus[]) => void;
  projectCounts?: Record<ProjectStatus, number>;
}

export const ProjectStatusFilter = ({
  selectedStatuses,
  onStatusChange,
  projectCounts
}: ProjectStatusFilterProps) => {
  const handleStatusToggle = (status: ProjectStatus, checked: boolean) => {
    if (checked) {
      onStatusChange([...selectedStatuses, status]);
    } else {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    }
  };

  const handleSelectAll = () => {
    onStatusChange(PROJECT_STATUSES.map(s => s.value as ProjectStatus));
  };

  const handleClearAll = () => {
    onStatusChange([]);
  };

  const getStatusBadgeStyle = (status: ProjectStatus) => {
    const configs = {
      'estimating': 'bg-blue-100 text-blue-800 border-blue-200',
      'quoted': 'bg-purple-100 text-purple-800 border-purple-200',
      'approved': 'bg-green-100 text-green-800 border-green-200',
      'in_progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'complete': 'bg-gray-100 text-gray-800 border-gray-200',
      'on_hold': 'bg-orange-100 text-orange-800 border-orange-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return configs[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Filter className="h-4 w-4 mr-2" />
          Status
          {selectedStatuses.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
              {selectedStatuses.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between">
          Filter by Status
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleSelectAll}>
              All
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleClearAll}>
              None
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PROJECT_STATUSES.map((statusOption) => {
          const status = statusOption.value as ProjectStatus;
          const isChecked = selectedStatuses.includes(status);
          const count = projectCounts?.[status] || 0;
          
          return (
            <DropdownMenuCheckboxItem
              key={status}
              checked={isChecked}
              onCheckedChange={(checked) => handleStatusToggle(status, checked)}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs px-2 py-0.5 ${getStatusBadgeStyle(status)}`}
                >
                  {statusOption.label}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {count}
              </span>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};