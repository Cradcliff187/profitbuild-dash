import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { TimeEntryFilters } from "@/types/timeEntry";
import { useIsMobile } from "@/hooks/use-mobile";

interface TimeEntrySearchFiltersProps {
  filters: TimeEntryFilters;
  onFiltersChange: (filters: TimeEntryFilters) => void;
  onReset: () => void;
  resultCount?: number;
  workers: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; number: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export const TimeEntrySearchFilters: React.FC<TimeEntrySearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  workers,
  projects
}) => {
  const isMobile = useIsMobile();

  const updateFilters = (updates: Partial<TimeEntryFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  };

  const toggleWorker = (workerId: string) => {
    const newWorkers = filters.workerIds.includes(workerId)
      ? filters.workerIds.filter(w => w !== workerId)
      : [...filters.workerIds, workerId];
    updateFilters({ workerIds: newWorkers });
  };

  const toggleProject = (projectId: string) => {
    const newProjects = filters.projectIds.includes(projectId)
      ? filters.projectIds.filter(p => p !== projectId)
      : [...filters.projectIds, projectId];
    updateFilters({ projectIds: newProjects });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.workerIds.length > 0) count++;
    if (filters.projectIds.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  };

  const hasActiveFilters = (): boolean => {
    return getActiveFilterCount() > 0;
  };

  const handleClearFilters = () => {
    onReset();
  };

  return (
    <CollapsibleFilterSection
      title="Filter Time Entries"
      hasActiveFilters={hasActiveFilters()}
      activeFilterCount={getActiveFilterCount()}
      onClearFilters={handleClearFilters}
      resultCount={resultCount}
      defaultExpanded={hasActiveFilters()}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Status Multi-Select Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 w-full justify-between text-xs"
            >
              <span className="truncate">
                {filters.status.length === 0 
                  ? "All Statuses" 
                  : filters.status.length === STATUS_OPTIONS.length
                  ? "All Statuses"
                  : `${filters.status.length} selected`
                }
              </span>
              <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className={isMobile ? "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] p-2" : "w-56 p-2"} 
            align={isMobile ? "end" : "start"}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => updateFilters({ 
                    status: STATUS_OPTIONS.map(s => s.value) 
                  })}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => updateFilters({ status: [] })}
                >
                  Clear
                </Button>
              </div>
              
              {STATUS_OPTIONS.map((option) => (
                <div 
                  key={option.value}
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                  onClick={() => toggleStatus(option.value)}
                >
                  <Checkbox
                    checked={filters.status.includes(option.value)}
                    className="h-4 w-4 pointer-events-none"
                  />
                  <label className="text-sm cursor-pointer flex-1">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Worker Multi-Select Filter - Searchable Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-between text-xs"
            >
              <span className="truncate">
                {filters.workerIds.length === 0 
                  ? "All Workers" 
                  : filters.workerIds.length === workers.length
                  ? "All Workers"
                  : `${filters.workerIds.length} selected`
                }
              </span>
              <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className={isMobile ? "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] p-0" : "w-64 p-0"} 
            align={isMobile ? "end" : "start"}
          >
            <Command>
              <CommandInput placeholder="Search workers..." className="h-9" />
              <CommandEmpty>No worker found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ workerIds: workers.map(w => w.id) })}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ workerIds: [] })}
                  >
                    Clear
                  </Button>
                </div>
                {workers.map((worker) => (
                  <CommandItem
                    key={worker.id}
                    value={worker.name}
                    onSelect={() => toggleWorker(worker.id)}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        checked={filters.workerIds.includes(worker.id)}
                        className="h-4 w-4 pointer-events-none"
                      />
                      <span>{worker.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Project Multi-Select Filter - Searchable Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-between text-xs"
            >
              <span className="truncate">
                {filters.projectIds.length === 0 
                  ? "All Projects" 
                  : filters.projectIds.length === projects.length
                  ? "All Projects"
                  : `${filters.projectIds.length} selected`
                }
              </span>
              <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className={isMobile ? "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] p-0" : "w-64 p-0"} 
            align={isMobile ? "end" : "start"}
          >
            <Command>
              <CommandInput placeholder="Search projects..." className="h-9" />
              <CommandEmpty>No project found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ projectIds: projects.map(p => p.id) })}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ projectIds: [] })}
                  >
                    Clear
                  </Button>
                </div>
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`${project.number} ${project.name}`}
                    onSelect={() => toggleProject(project.id)}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        checked={filters.projectIds.includes(project.id)}
                        className="h-4 w-4 pointer-events-none"
                      />
                      <span>{project.number} - {project.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Date Range */}
        <div className="flex flex-col sm:flex-row gap-2 md:col-span-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 flex-1 justify-start text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {filters.dateFrom ? format(new Date(filters.dateFrom), "MMM dd") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DatePicker
                mode="single"
                selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                onSelect={(date) => updateFilters({ 
                  dateFrom: date ? format(date, 'yyyy-MM-dd') : null
                })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 flex-1 justify-start text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {filters.dateTo ? format(new Date(filters.dateTo), "MMM dd") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DatePicker
                mode="single"
                selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                onSelect={(date) => updateFilters({ 
                  dateTo: date ? format(date, 'yyyy-MM-dd') : null
                })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </CollapsibleFilterSection>
  );
};