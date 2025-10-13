import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar, ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ProjectStatus, PROJECT_STATUSES, JOB_TYPES } from "@/types/project";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";

export interface ProjectSearchFilters {
  searchText: string;
  status: ProjectStatus[];
  jobType: string;
  clientName: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  budgetRange: {
    min: number | null;
    max: number | null;
  };
  sortBy: 'name' | 'date' | 'status' | 'margin';
  sortOrder: 'asc' | 'desc';
}

interface ProjectFiltersProps {
  filters: ProjectSearchFilters;
  onFiltersChange: (filters: ProjectSearchFilters) => void;
  resultCount?: number;
}

export const ProjectFilters = ({
  filters,
  onFiltersChange,
  resultCount,
}: ProjectFiltersProps) => {
  const updateFilters = (updates: Partial<ProjectSearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleStatus = (status: ProjectStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  };

  const hasActiveFilters = () => {
    return !!filters.searchText || 
           filters.status.length > 0 || 
           filters.jobType !== "all" || 
           !!filters.clientName ||
           !!filters.dateRange.start || 
           !!filters.dateRange.end ||
           filters.budgetRange.min !== null || 
           filters.budgetRange.max !== null ||
           filters.sortBy !== 'date' ||
           filters.sortOrder !== 'desc';
  };

  const handleClearFilters = () => {
    onFiltersChange({
      searchText: "",
      status: [],
      jobType: "all",
      clientName: "",
      dateRange: { start: null, end: null },
      budgetRange: { min: null, max: null },
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  return (
    <CollapsibleFilterSection
      title="Filter Projects"
      hasActiveFilters={hasActiveFilters()}
      onClearFilters={handleClearFilters}
      resultCount={resultCount}
      alwaysExpanded={true}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Quick Search - Full Width */}
        <div className="relative md:col-span-3 lg:col-span-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, clients, addresses..."
            value={filters.searchText}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
            className="pl-10 h-9"
          />
        </div>

        {/* Status Multi-Select - Compact Buttons */}
        <div className="md:col-span-2 lg:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            {PROJECT_STATUSES.map(option => (
              <Button
                key={option.value}
                variant={filters.status.includes(option.value as ProjectStatus) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStatus(option.value as ProjectStatus)}
                className="text-xs h-9"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Job Type Filter */}
        <Select value={filters.jobType} onValueChange={(value) => updateFilters({ jobType: value })}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All Job Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Job Types</SelectItem>
            {JOB_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Client Filter */}
        <Input
          placeholder="Client name"
          value={filters.clientName}
          onChange={(e) => updateFilters({ clientName: e.target.value })}
          className="h-9"
        />

        {/* Date Range */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 flex-1 justify-start text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {filters.dateRange.start ? format(filters.dateRange.start, "MMM dd") : "Start"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DatePicker
                mode="single"
                selected={filters.dateRange.start || undefined}
                onSelect={(date) => updateFilters({ 
                  dateRange: { ...filters.dateRange, start: date || null }
                })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 flex-1 justify-start text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {filters.dateRange.end ? format(filters.dateRange.end, "MMM dd") : "End"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DatePicker
                mode="single"
                selected={filters.dateRange.end || undefined}
                onSelect={(date) => updateFilters({ 
                  dateRange: { ...filters.dateRange, end: date || null }
                })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Budget Range */}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min $"
            value={filters.budgetRange.min || ''}
            onChange={(e) => updateFilters({ 
              budgetRange: { 
                ...filters.budgetRange, 
                min: e.target.value ? parseFloat(e.target.value) : null 
              }
            })}
            className="h-9"
          />
          <Input
            type="number"
            placeholder="Max $"
            value={filters.budgetRange.max || ''}
            onChange={(e) => updateFilters({ 
              budgetRange: { 
                ...filters.budgetRange, 
                max: e.target.value ? parseFloat(e.target.value) : null 
              }
            })}
            className="h-9"
          />
        </div>

        {/* Sorting */}
        <div className="flex gap-2">
          <Select value={filters.sortBy} onValueChange={(value: 'name' | 'date' | 'status' | 'margin') => updateFilters({ sortBy: value })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date Created</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="margin">Margin %</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
            className="h-9 w-9"
          >
            {filters.sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </CollapsibleFilterSection>
  );
};