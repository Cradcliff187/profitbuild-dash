import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar, ChevronUp, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";
import { ProjectStatus, PROJECT_STATUSES, JOB_TYPES } from "@/types/project";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export interface ProjectSearchFilters {
  searchText: string;
  status: ProjectStatus[];
  jobType: string[];
  clientName: string[];
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
  leftActions?: React.ReactNode;
  actions?: React.ReactNode;
  clients: Array<{ id: string; client_name: string; }>;
}

export const ProjectFilters = ({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients
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

  const toggleJobType = (jobType: string) => {
    const newJobTypes = filters.jobType.includes(jobType)
      ? filters.jobType.filter(j => j !== jobType)
      : [...filters.jobType, jobType];
    updateFilters({ jobType: newJobTypes });
  };

  const toggleClient = (clientName: string) => {
    const newClients = filters.clientName.includes(clientName)
      ? filters.clientName.filter(c => c !== clientName)
      : [...filters.clientName, clientName];
    updateFilters({ clientName: newClients });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.searchText) count++;
    if (filters.status.length > 0) count++;
    if (filters.jobType.length > 0) count++;
    if (filters.clientName.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.budgetRange.min !== null || filters.budgetRange.max !== null) count++;
    return count;
  };

  const hasActiveFilters = () => {
    return getActiveFilterCount() > 0;
  };

  const handleClearFilters = () => {
    onFiltersChange({
      searchText: "",
      status: [],
      jobType: [],
      clientName: [],
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
      activeFilterCount={getActiveFilterCount()}
      onClearFilters={handleClearFilters}
      resultCount={resultCount}
      defaultExpanded={hasActiveFilters()}
      leftActions={leftActions}
      actions={actions}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Quick Search - Full Width */}
        <div className="relative md:col-span-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects, clients, addresses..."
            value={filters.searchText}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
            className="pl-9 h-9"
          />
        </div>

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
                  : filters.status.length === PROJECT_STATUSES.length
                  ? "All Statuses"
                  : `${filters.status.length} selected`
                }
              </span>
              <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => updateFilters({ 
                    status: PROJECT_STATUSES.map(s => s.value as ProjectStatus) 
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
              
              {PROJECT_STATUSES.map((option) => (
                <div 
                  key={option.value}
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                  onClick={() => toggleStatus(option.value as ProjectStatus)}
                >
                  <Checkbox
                    checked={filters.status.includes(option.value as ProjectStatus)}
                    onCheckedChange={() => toggleStatus(option.value as ProjectStatus)}
                    className="h-4 w-4"
                  />
                  <label className="text-sm cursor-pointer flex-1">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Job Type Multi-Select Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 w-full justify-between text-xs"
            >
              <span className="truncate">
                {filters.jobType.length === 0 
                  ? "All Job Types" 
                  : filters.jobType.length === JOB_TYPES.length
                  ? "All Job Types"
                  : `${filters.jobType.length} selected`
                }
              </span>
              <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ jobType: [...JOB_TYPES] })}
                  >
                    Select All
                  </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => updateFilters({ jobType: [] })}
                >
                  Clear
                </Button>
              </div>
              
              {JOB_TYPES.map((type) => (
                <div 
                  key={type}
                  className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                  onClick={() => toggleJobType(type)}
                >
                  <Checkbox
                    checked={filters.jobType.includes(type)}
                    onCheckedChange={() => toggleJobType(type)}
                    className="h-4 w-4"
                  />
                  <label className="text-sm cursor-pointer flex-1">
                    {type}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Client Multi-Select Filter - Searchable Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-between text-xs"
            >
              <span className="truncate">
                {filters.clientName.length === 0 
                  ? "All Clients" 
                  : filters.clientName.length === clients.length
                  ? "All Clients"
                  : `${filters.clientName.length} selected`
                }
              </span>
              <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clients..." className="h-9" />
              <CommandEmpty>No client found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ clientName: clients.map(c => c.client_name) })}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ clientName: [] })}
                  >
                    Clear
                  </Button>
                </div>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.client_name}
                    onSelect={() => toggleClient(client.client_name)}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        checked={filters.clientName.includes(client.client_name)}
                        onCheckedChange={() => toggleClient(client.client_name)}
                        className="h-4 w-4"
                      />
                      <span>{client.client_name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

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
        <div className="flex gap-2 md:col-span-2">
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
      </div>
    </CollapsibleFilterSection>
  );
};