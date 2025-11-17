import { useState, useMemo } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { X, CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ReportFilter } from "@/hooks/useReportExecution";
import { FieldMetadata } from './SimpleReportBuilder';
import { useReportFilterOptions } from "@/hooks/useReportFilterOptions";
import { cn } from "@/lib/utils";

interface SimpleFilterPanelProps {
  filters: ReportFilter[];
  onFiltersChange: (filters: ReportFilter[]) => void;
  availableFields: FieldMetadata[];
  dataSource: string;
}

const operatorLabels: Record<ReportFilter['operator'], string> = {
  equals: 'Equals',
  not_equals: 'Not Equals',
  greater_than: 'Greater Than',
  less_than: 'Less Than',
  contains: 'Contains',
  in: 'In',
  between: 'Between',
  is_null: 'Is Null'
};

export function SimpleFilterPanel({ filters, onFiltersChange, availableFields, dataSource }: SimpleFilterPanelProps) {
  const { clients, payees, workers, projects, isLoading: optionsLoading } = useReportFilterOptions();
  
  const addFilter = () => {
    onFiltersChange([
      ...filters,
      {
        field: availableFields[0]?.key || '',
        operator: 'equals',
        value: ''
      }
    ]);
  };

  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    // Reset value when field or operator changes
    if (updates.field || updates.operator) {
      newFilters[index].value = '';
    }
    onFiltersChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const getFieldMetadata = (fieldKey: string): FieldMetadata | undefined => {
    return availableFields.find(f => f.key === fieldKey);
  };

  const getAvailableOperators = (field: FieldMetadata): ReportFilter['operator'][] => {
    if (field.allowedOperators) {
      return field.allowedOperators;
    }
    
    // Default operators based on field type
    switch (field.type) {
      case 'date':
        return ['equals', 'greater_than', 'less_than', 'between', 'is_null'];
      case 'currency':
      case 'number':
        return ['equals', 'greater_than', 'less_than', 'between'];
      case 'percent':
        return ['equals', 'greater_than', 'less_than', 'between'];
      default:
        return ['equals', 'not_equals', 'contains', 'in', 'is_null'];
    }
  };

  const getDataSourceOptions = (field: FieldMetadata) => {
    switch (field.dataSource) {
      case 'clients':
        return clients;
      case 'payees':
        return payees;
      case 'workers':
        return workers;
      case 'projects':
        return projects;
      default:
        return [];
    }
  };

  const renderFilterValue = (filter: ReportFilter, index: number) => {
    const field = getFieldMetadata(filter.field);
    if (!field || filter.operator === 'is_null') {
      return null;
    }

    // Date fields
    if (field.type === 'date') {
      if (filter.operator === 'between') {
        const dateRange = Array.isArray(filter.value) ? filter.value : [null, null];
        return (
          <div className="flex gap-2 flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange[0] && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange[0] ? format(new Date(dateRange[0]), "MMM dd, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange[0] ? new Date(dateRange[0]) : undefined}
                  onSelect={(date) => {
                    const newRange = [date ? format(date, 'yyyy-MM-dd') : null, dateRange[1]];
                    updateFilter(index, { value: newRange });
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange[1] && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange[1] ? format(new Date(dateRange[1]), "MMM dd, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange[1] ? new Date(dateRange[1]) : undefined}
                  onSelect={(date) => {
                    const newRange = [dateRange[0], date ? format(date, 'yyyy-MM-dd') : null];
                    updateFilter(index, { value: newRange });
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      } else {
        const dateValue = filter.value ? (typeof filter.value === 'string' ? filter.value : format(new Date(filter.value), 'yyyy-MM-dd')) : '';
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(new Date(dateValue), "MMM dd, yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue ? new Date(dateValue) : undefined}
                onSelect={(date) => {
                  updateFilter(index, { value: date ? format(date, 'yyyy-MM-dd') : '' });
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      }
    }

    // Multi-select for 'in' operator or enum fields
    if (filter.operator === 'in' || (field.enumValues && filter.operator === 'equals')) {
      const options = field.enumValues || getDataSourceOptions(field);
      const selectedValues = Array.isArray(filter.value) ? filter.value : (filter.value ? [filter.value] : []);
      
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
            >
              <span className="truncate">
                {selectedValues.length === 0 
                  ? `Select ${field.label.toLowerCase()}...`
                  : selectedValues.length === 1
                  ? selectedValues[0]
                  : `${selectedValues.length} selected`
                }
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder={`Search ${field.label.toLowerCase()}...`} />
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const value = typeof option === 'string' ? option : option.value || option.label;
                  const label = typeof option === 'string' ? option : option.label;
                  const isSelected = selectedValues.includes(value);
                  return (
                    <CommandItem
                      key={value}
                      onSelect={() => {
                        let newValues: string[];
                        if (filter.operator === 'in') {
                          newValues = isSelected
                            ? selectedValues.filter(v => v !== value)
                            : [...selectedValues, value];
                        } else {
                          newValues = isSelected ? [] : [value];
                        }
                        updateFilter(index, { value: filter.operator === 'in' ? newValues : newValues[0] || '' });
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="mr-2"
                      />
                      {label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    // Data source dropdown (clients, payees, workers)
    if (field.dataSource && filter.operator !== 'contains') {
      const options = getDataSourceOptions(field);
      const selectedValue = typeof filter.value === 'string' ? filter.value : '';
      
      return (
        <Select
          value={selectedValue}
          onValueChange={(value) => updateFilter(index, { value })}
          disabled={optionsLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Number/currency fields with range support
    if ((field.type === 'currency' || field.type === 'number' || field.type === 'percent') && filter.operator === 'between') {
      const range = Array.isArray(filter.value) ? filter.value : ['', ''];
      return (
        <div className="flex gap-2 flex-1">
          <Input
            type="number"
            placeholder="Min"
            value={range[0] || ''}
            onChange={(e) => {
              const newRange = [e.target.value, range[1] || ''];
              updateFilter(index, { value: newRange });
            }}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Max"
            value={range[1] || ''}
            onChange={(e) => {
              const newRange = [range[0] || '', e.target.value];
              updateFilter(index, { value: newRange });
            }}
            className="flex-1"
          />
        </div>
      );
    }

    if (field.type === 'currency' || field.type === 'number' || field.type === 'percent') {
      return (
        <Input
          type="number"
          step={field.type === 'currency' ? '0.01' : field.type === 'percent' ? '0.1' : '1'}
          value={filter.value || ''}
          onChange={(e) => updateFilter(index, { value: e.target.value })}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className="flex-1"
        />
      );
    }

    // Text input for everything else
    return (
      <Input
        type="text"
        value={filter.value || ''}
        onChange={(e) => updateFilter(index, { value: e.target.value })}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        className="flex-1"
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Filters</Label>
        <Button onClick={addFilter} variant="outline" size="sm">
          Add Filter
        </Button>
      </div>

      {filters.length === 0 && (
        <div className="text-sm text-muted-foreground py-4">
          No filters applied. Click "Add Filter" to filter the report data.
        </div>
      )}

      {filters.map((filter, index) => {
        const field = getFieldMetadata(filter.field);
        const availableOps = field ? getAvailableOperators(field) : Object.keys(operatorLabels) as ReportFilter['operator'][];
        
        return (
          <div key={index} className="flex gap-2 items-end p-3 border rounded-md bg-card">
            <div className="flex-1 space-y-2 min-w-0">
              <Label className="text-xs">Field</Label>
              <Select
                value={filter.field}
                onValueChange={(value) => {
                  const newField = getFieldMetadata(value);
                  const defaultOp = newField?.allowedOperators?.[0] || 'equals';
                  updateFilter(index, { field: value, operator: defaultOp });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map(f => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2 min-w-0">
              <Label className="text-xs">Operator</Label>
              <Select
                value={filter.operator}
                onValueChange={(value) => updateFilter(index, { operator: value as ReportFilter['operator'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableOps.map((op) => (
                    <SelectItem key={op} value={op}>
                      {operatorLabels[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-2 space-y-2 min-w-0">
              {filter.operator !== 'is_null' && (
                <>
                  <Label className="text-xs">Value</Label>
                  {renderFilterValue(filter, index)}
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFilter(index)}
              className="h-10 w-10 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
