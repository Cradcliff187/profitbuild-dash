import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";

export interface ReceiptFilters {
  dateFrom: string | null;
  dateTo: string | null;
  status: string[];
  payeeIds: string[];
  projectIds: string[];
  amountRange: {
    min: number | null;
    max: number | null;
  };
}

interface ReceiptSearchFiltersProps {
  filters: ReceiptFilters;
  onFiltersChange: (filters: ReceiptFilters) => void;
  onReset: () => void;
  resultCount?: number;
  payees: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; number: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export const ReceiptSearchFilters: React.FC<ReceiptSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  payees,
  projects
}) => {

  const updateFilters = (updates: Partial<ReceiptFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  };

  const togglePayee = (payeeId: string) => {
    const newPayees = filters.payeeIds.includes(payeeId)
      ? filters.payeeIds.filter(p => p !== payeeId)
      : [...filters.payeeIds, payeeId];
    updateFilters({ payeeIds: newPayees });
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
    if (filters.payeeIds.length > 0) count++;
    if (filters.projectIds.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
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
      title="Filter Receipts"
      hasActiveFilters={hasActiveFilters()}
      activeFilterCount={getActiveFilterCount()}
      onClearFilters={handleClearFilters}
      resultCount={resultCount}
      defaultExpanded={hasActiveFilters()}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* Date Range */}
        <div className="flex gap-2 md:col-span-2">
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
                {filters.payeeIds.length === 0 
                  ? "All Payees" 
                  : filters.payeeIds.length === payees.length
                  ? "All Payees"
                  : `${filters.payeeIds.length} selected`
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
                    onClick={() => updateFilters({ payeeIds: payees.map(p => p.id) })}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => updateFilters({ payeeIds: [] })}
                  >
                    Clear
                  </Button>
                </div>
                {payees.map((payee) => (
                  <CommandItem
                    key={payee.id}
                    value={payee.name}
                    onSelect={() => togglePayee(payee.id)}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        checked={filters.payeeIds.includes(payee.id)}
                        onCheckedChange={() => togglePayee(payee.id)}
                        className="h-4 w-4"
                      />
                      <span>{payee.name}</span>
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
          <PopoverContent className="w-64 p-0" align="start">
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
                        onCheckedChange={() => toggleProject(project.id)}
                        className="h-4 w-4"
                      />
                      <span>{project.number} - {project.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

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
            className="h-9 text-xs"
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
            className="h-9 text-xs"
          />
        </div>
      </div>
    </CollapsibleFilterSection>
  );
};