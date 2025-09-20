import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, X, Calendar, Download } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const hasActiveFilters = () => {
    return filters.searchText || 
           filters.status.length > 0 || 
           filters.projectType || 
           filters.clientName ||
           filters.dateRange.start || 
           filters.dateRange.end ||
           filters.amountRange.min !== null || 
           filters.amountRange.max !== null ||
           filters.hasVersions !== null;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search & Filter Estimates</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {resultCount !== undefined && (
                <Badge variant="secondary">{resultCount} results</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportModal(true)}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <Filter className="h-4 w-4 mr-1" />
                {isExpanded ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Search */}
          <div className="flex space-x-2">
            <Input
              placeholder="Search estimates, projects, clients..."
              value={filters.searchText}
              onChange={(e) => updateFilters({ searchText: e.target.value })}
              className="flex-1"
            />
            <Button onClick={onSearch}>
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
            {hasActiveFilters() && (
              <Button variant="outline" onClick={onReset}>
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
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

          {/* Expanded Filters */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
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
                  value={filters.hasVersions === null ? "" : filters.hasVersions.toString()}
                  onValueChange={(value) => updateFilters({ 
                    hasVersions: value === "" ? null : value === "true" 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All estimates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All estimates</SelectItem>
                    <SelectItem value="true">Has multiple versions</SelectItem>
                    <SelectItem value="false">Single version only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
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
                      <Button variant="outline" size="sm" className="flex-1">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount Range</label>
                <div className="flex space-x-2">
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
          )}
        </CardContent>
      </Card>

      <EstimateExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={filters}
      />
    </>
  );
};