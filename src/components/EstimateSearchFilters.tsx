import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Search, Calendar, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";

export interface SearchFilters {
  searchText: string;
  status: string[];
  projectType: string;
  clientName: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  amountRange: {
    min: number | null;
    max: number | null;
  };
  hasVersions: boolean | null;
}

interface EstimateSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  resultCount?: number;
  clients: Array<{ id: string; client_name: string; }>;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' }
];

export const EstimateSearchFilters: React.FC<EstimateSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
  resultCount,
  clients
}) => {

  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.searchText) count++;
    if (filters.status.length > 0) count++;
    if (filters.projectType) count++;
    if (filters.clientName) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
    if (filters.hasVersions !== null) count++;
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
      title="Filter Estimates"
      hasActiveFilters={hasActiveFilters()}
      activeFilterCount={getActiveFilterCount()}
      onClearFilters={handleClearFilters}
      resultCount={resultCount}
      defaultExpanded={hasActiveFilters()}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Quick Search - Full Width */}
        <div className="relative md:col-span-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search estimates, projects, clients..."
            value={filters.searchText}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
            className="pl-10 h-9"
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

        {/* Client Filter - Searchable Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full justify-between text-xs"
            >
              <span className="truncate">
                {filters.clientName || "All Clients"}
              </span>
              <ChevronDown className="h-3 w-3 ml-2 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clients..." className="h-9" />
              <CommandEmpty>No client found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                <CommandItem
                  onSelect={() => updateFilters({ clientName: "" })}
                  className="text-sm"
                >
                  <div className="flex items-center gap-2 w-full">
                    {!filters.clientName && <Check className="h-3 w-3" />}
                    <span className={!filters.clientName ? "font-medium" : ""}>All Clients</span>
                  </div>
                </CommandItem>
                {clients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.client_name}
                    onSelect={() => updateFilters({ clientName: client.client_name })}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {filters.clientName === client.client_name && (
                        <Check className="h-3 w-3" />
                      )}
                      <span>{client.client_name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Version Status */}
        <Select 
          value={filters.hasVersions === null ? "all" : filters.hasVersions.toString()}
          onValueChange={(value) => updateFilters({ 
            hasVersions: value === "all" ? null : value === "true" 
          })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All versions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All estimates</SelectItem>
            <SelectItem value="true">Multiple versions</SelectItem>
            <SelectItem value="false">Single version</SelectItem>
          </SelectContent>
        </Select>

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