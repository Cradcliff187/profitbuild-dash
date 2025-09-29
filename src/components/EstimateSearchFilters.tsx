import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CollapsibleFilterSection } from "@/components/ui/collapsible-filter-section";
import { Search, X, Calendar, Download } from "lucide-react";
import { format } from "date-fns";
import { EstimateExportModal } from "./EstimateExportModal";

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
  resultCount
}) => {
  const [showExportModal, setShowExportModal] = useState(false);

  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  };

  const removeStatus = (status: string) => {
    updateFilters({ status: filters.status.filter(s => s !== status) });
  };

  const hasActiveFilters = (): boolean => {
    return !!(filters.searchText || 
           filters.status.length > 0 || 
           filters.projectType || 
           filters.clientName ||
           filters.dateRange.start || 
           filters.dateRange.end ||
           filters.amountRange.min !== null || 
           filters.amountRange.max !== null ||
           filters.hasVersions !== null);
  };

  const handleClearFilters = () => {
    onReset();
  };

  return (
    <>
      <div className="space-y-3">
        {/* Quick Search Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Search Estimates</span>
              {resultCount !== undefined && (
                <Badge variant="outline" className="text-xs">{resultCount} results</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportModal(true)}
              className="h-8 px-2"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
          
          <div className="space-y-3">
            <Input
              placeholder="Search estimates, projects, clients..."
              value={filters.searchText}
              onChange={(e) => updateFilters({ searchText: e.target.value })}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button onClick={onSearch} className="flex-1 sm:flex-none">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
              {hasActiveFilters() && (
                <Button variant="outline" onClick={onReset} className="flex-1 sm:flex-none">
                  <X className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Status Badges */}
          {filters.status.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {filters.status.map(status => (
                <Badge key={status} variant="secondary" className="cursor-pointer">
                  {STATUS_OPTIONS.find(s => s.value === status)?.label}
                  <X 
                    className="h-3 w-3 ml-1" 
                    onClick={() => removeStatus(status)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        <CollapsibleFilterSection
          title="Advanced Filters"
          hasActiveFilters={hasActiveFilters()}
          onClearFilters={handleClearFilters}
          defaultExpanded={false}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Multi-Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    variant={filters.status.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStatus(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Client Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Input
                placeholder="Filter by client name"
                value={filters.clientName}
                onChange={(e) => updateFilters({ clientName: e.target.value })}
              />
            </div>

            {/* Has Versions Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Version Status</label>
              <Select 
                value={filters.hasVersions === null ? "all" : filters.hasVersions.toString()}
                onValueChange={(value) => updateFilters({ 
                  hasVersions: value === "all" ? null : value === "true" 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All estimates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All estimates</SelectItem>
                  <SelectItem value="true">Has multiple versions</SelectItem>
                  <SelectItem value="false">Single version only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-1" />
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
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-1" />
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

            {/* Amount Range */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Amount Range</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.amountRange.min || ''}
                  onChange={(e) => updateFilters({ 
                    amountRange: { 
                      ...filters.amountRange, 
                      min: e.target.value ? parseFloat(e.target.value) : null 
                    }
                  })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.amountRange.max || ''}
                  onChange={(e) => updateFilters({ 
                    amountRange: { 
                      ...filters.amountRange, 
                      max: e.target.value ? parseFloat(e.target.value) : null 
                    }
                  })}
                />
              </div>
            </div>
          </div>
        </CollapsibleFilterSection>
      </div>

      <EstimateExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={filters}
      />
    </>
  );
};