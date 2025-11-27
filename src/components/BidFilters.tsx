import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export interface BidSearchFilters {
  searchText: string;
  clientName: string[];
  hasProject: boolean | null; // null = all, true = linked to project, false = no project
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface BidFiltersProps {
  filters: BidSearchFilters;
  onFiltersChange: (filters: BidSearchFilters) => void;
  resultCount?: number;
  leftActions?: React.ReactNode;
  actions?: React.ReactNode;
  clients: Array<{ id: string; client_name: string; }>;
}

export const BidFilters = ({
  filters,
  onFiltersChange,
  resultCount,
  leftActions,
  actions,
  clients
}: BidFiltersProps) => {
  const updateFilters = (updates: Partial<BidSearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
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
    if (filters.clientName.length > 0) count++;
    if (filters.hasProject !== null) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    return count;
  };

  const hasActiveFilters = () => {
    return getActiveFilterCount() > 0;
  };

  const handleClearFilters = () => {
    onFiltersChange({
      searchText: "",
      clientName: [],
      hasProject: null,
      dateRange: { start: null, end: null },
    });
  };

  return (
    <CollapsibleFilterSection
      title="Filter Bids"
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
        <div className="md:col-span-4">
          <Input
            placeholder="Search bids, clients, descriptions..."
            value={filters.searchText}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
            className="h-9"
          />
        </div>

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

        {/* Has Project Filter */}
        <Select
          value={filters.hasProject === null ? 'all' : filters.hasProject ? 'yes' : 'no'}
          onValueChange={(value) => updateFilters({ 
            hasProject: value === 'all' ? null : value === 'yes' 
          })}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Linked Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Linked to Project</SelectItem>
            <SelectItem value="no">No Project</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range */}
        <div className="flex gap-2 md:col-span-2">
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
      </div>
    </CollapsibleFilterSection>
  );
};
