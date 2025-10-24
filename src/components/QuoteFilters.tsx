import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Search, Calendar, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";

export interface QuoteSearchFilters {
  searchText: string;
  status: string[];
  payeeName: string[];
  clientName: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
}

interface QuoteFiltersProps {
  filters: QuoteSearchFilters;
  onFiltersChange: (filters: QuoteSearchFilters) => void;
  resultCount?: number;
  clients: Array<{ id: string; client_name: string; }>;
  payees: Array<{ id: string; payee_name: string; }>;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' }
];

export const QuoteFilters = ({
  filters,
  onFiltersChange,
  resultCount,
  clients,
  payees
}: QuoteFiltersProps) => {
  const updateFilters = (updates: Partial<QuoteSearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  };

  const togglePayee = (payeeName: string) => {
    const newPayees = filters.payeeName.includes(payeeName)
      ? filters.payeeName.filter(p => p !== payeeName)
      : [...filters.payeeName, payeeName];
    updateFilters({ payeeName: newPayees });
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
    if (filters.payeeName.length > 0) count++;
    if (filters.clientName.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
    return count;
  };

  const hasActiveFilters = (): boolean => {
    return getActiveFilterCount() > 0;
  };

  const handleClearFilters = () => {
    onFiltersChange({
      searchText: "",
      status: [],
      payeeName: [],
      clientName: [],
      dateRange: { start: null, end: null },
      amountRange: { min: null, max: null },
    });
  };

  return (
    <CollapsibleFilterSection
      title="Filter Quotes"
      hasActiveFilters={hasActiveFilters()}
      activeFilterCount={getActiveFilterCount()}
      onClearFilters={handleClearFilters}
      resultCount={resultCount}
      defaultExpanded={hasActiveFilters()}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Quick Search - Full Width */}
        <div className="relative md:col-span-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes, projects, payees, clients..."
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
                  : filters.status.length === STATUS_OPTIONS.length
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
                    onCheckedChange={() => toggleStatus(option.value)}
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

        {/* Payee Multi-Select Filter - Searchable Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-between text-xs"
            >
              <span className="truncate">
                {filters.payeeName.length === 0 
                  ? "All Payees" 
                  : filters.payeeName.length === payees.length
                  ? "All Payees"
                  : `${filters.payeeName.length} selected`
                }
              </span>
              <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search payees..." className="h-9" />
              <CommandEmpty>No payee found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ payeeName: payees.map(p => p.payee_name) })}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ payeeName: [] })}
                  >
                    Clear
                  </Button>
                </div>
                {payees.map((payee) => (
                  <CommandItem
                    key={payee.id}
                    value={payee.payee_name}
                    onSelect={() => togglePayee(payee.payee_name)}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        checked={filters.payeeName.includes(payee.payee_name)}
                        onCheckedChange={() => togglePayee(payee.payee_name)}
                        className="h-4 w-4"
                      />
                      <span>{payee.payee_name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
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

        {/* Amount Range */}
        <div className="flex gap-2 md:col-span-2">
          <Input
            type="number"
            placeholder="Min $"
            value={filters.amountRange.min || ''}
            onChange={(e) => updateFilters({ 
              amountRange: { 
                ...filters.amountRange, 
                min: e.target.value ? parseFloat(e.target.value) : null 
              }
            })}
            className="h-9"
          />
          <Input
            type="number"
            placeholder="Max $"
            value={filters.amountRange.max || ''}
            onChange={(e) => updateFilters({ 
              amountRange: { 
                ...filters.amountRange, 
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
