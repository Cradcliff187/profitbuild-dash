import { useState, useMemo } from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { X, CalendarIcon, ChevronDown, ChevronRight, Search } from "lucide-react";
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
  is_null: 'Is Null',
  contains_any: 'Contains Any',
  contains_only: 'Contains Only',
  contains_all: 'Contains All'
};

export function SimpleFilterPanel({ filters, onFiltersChange, availableFields, dataSource }: SimpleFilterPanelProps) {
  const { clients, payees, workers, projects, isLoading: optionsLoading } = useReportFilterOptions();
  // Track open state for each multi-select popover by field key
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
  // Track search query for each multi-select popover
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  
  // Find universal filter fields
  const universalFields = useMemo(() => {
    const dateFields = availableFields.filter(f => f.type === 'date');
    const statusFields = availableFields.filter(f => f.key === 'status' || f.key === 'approval_status');
    const clientFields = availableFields.filter(f => f.key === 'client_name' && f.dataSource === 'clients');
    return { dateFields, statusFields, clientFields };
  }, [availableFields]);

  const universalFieldKeys = useMemo(() => {
    const keys = new Set<string>();
    if (universalFields.dateFields[0]) {
      keys.add(universalFields.dateFields[0].key);
    }
    if (universalFields.statusFields[0]) {
      keys.add(universalFields.statusFields[0].key);
    }
    if (universalFields.clientFields[0]) {
      keys.add(universalFields.clientFields[0].key);
    }
    return keys;
  }, [universalFields]);

  // Find custom filter fields based on data source (exclude universal fields)
  const customFields = useMemo(() => {
    const fields: Record<string, FieldMetadata[]> = {};
    
    // Get fields that aren't already in universal filters
    const nonUniversalFields = availableFields.filter(f => !universalFieldKeys.has(f.key));
    
    if (dataSource === 'projects') {
      fields['Project Composition'] = nonUniversalFields.filter(f => f.group === 'composition');
      fields['Financial Metrics'] = nonUniversalFields.filter(f => f.group === 'financial' && ['contracted_amount', 'current_margin', 'margin_percentage', 'total_expenses'].includes(f.key));
    } else if (dataSource === 'expenses') {
      fields['Category & Payee'] = nonUniversalFields.filter(f => ['category', 'payee_name'].includes(f.key));
      fields['Amount'] = nonUniversalFields.filter(f => f.key === 'amount');
    } else if (dataSource === 'quotes') {
      fields['Vendor'] = nonUniversalFields.filter(f => f.key === 'payee_name');
      fields['Amount'] = nonUniversalFields.filter(f => f.key === 'total_amount');
    } else if (dataSource === 'time_entries') {
      fields['Employee'] = nonUniversalFields.filter(f => f.key === 'worker_name');
      fields['Hours & Rate'] = nonUniversalFields.filter(f => ['hours', 'hourly_rate'].includes(f.key));
      fields['Amount'] = nonUniversalFields.filter(f => f.key === 'amount');
    } else if (dataSource === 'estimate_line_items') {
      fields['Category'] = nonUniversalFields.filter(f => f.key === 'category');
      fields['Quotes'] = nonUniversalFields.filter(f => ['has_quotes', 'quote_count', 'has_accepted_quote'].includes(f.key));
    } else if (dataSource === 'internal_costs') {
      fields['Category & Employee'] = nonUniversalFields.filter(f => ['category', 'worker_name'].includes(f.key));
      fields['Amount & Hours'] = nonUniversalFields.filter(f => ['amount', 'hours'].includes(f.key));
    }
    
    // Remove empty groups
    Object.keys(fields).forEach((key) => {
      if (fields[key].length === 0) {
        delete fields[key];
      }
    });
    
    return fields;
  }, [availableFields, dataSource, universalFieldKeys]);

  // Get or create filter for a specific field
  const getFilterForField = (fieldKey: string): ReportFilter | null => {
    return filters.find(f => f.field === fieldKey) || null;
  };

  const getFilterIndex = (fieldKey: string): number => {
    return filters.findIndex(f => f.field === fieldKey);
  };

  const updateOrAddFilter = (fieldKey: string, updates: Partial<ReportFilter>) => {
    const index = getFilterIndex(fieldKey);
    const field = getFieldMetadata(fieldKey);
    
    if (index >= 0) {
      // Update existing filter
      const newFilters = [...filters];
      newFilters[index] = { ...newFilters[index], ...updates };
      if (updates.field || updates.operator) {
        newFilters[index].value = '';
      }
      onFiltersChange(newFilters);
    } else {
      // Add new filter
      const defaultOperator = field?.allowedOperators?.[0] || 'equals';
      onFiltersChange([
        ...filters,
        {
          field: fieldKey,
          operator: defaultOperator,
          value: '',
          ...updates
        }
      ]);
    }
  };

  const removeFilterForField = (fieldKey: string) => {
    onFiltersChange(filters.filter(f => f.field !== fieldKey));
  };
  
  const updateFilter = (index: number, updates: Partial<ReportFilter>, baseFilter?: ReportFilter) => {
    // If index is out of bounds, create a new filter
    if (index >= filters.length) {
      // Use the baseFilter if provided (for new filters), otherwise find existing or create default
      const filterToUse = baseFilter || filters.find(f => f.field === updates.field) || {
        field: updates.field || availableFields[0]?.key || '',
        operator: 'equals',
        value: ''
      };
      const newFilter: ReportFilter = {
        ...filterToUse,
        ...updates
      };
      onFiltersChange([...filters, newFilter]);
      return;
    }
    
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    // Reset value when field or operator changes, BUT only if value wasn't explicitly provided in updates
    if ((updates.field || updates.operator) && updates.value === undefined) {
      newFilters[index].value = '';
    }
    onFiltersChange(newFilters);
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

    // If index is out of bounds, we need to create the filter first
    // We'll pass the filter as baseFilter to updateFilter

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
                    updateFilter(index, { value: newRange }, filter);
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
                    updateFilter(index, { value: newRange }, filter);
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
                  updateFilter(index, { value: date ? format(date, 'yyyy-MM-dd') : '' }, filter);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      }
    }

    // Multi-select for enum fields, dataSource fields, or 'in' operator
    // Always allow multiselection for these field types
    const supportsMultiSelect = field.enumValues || field.dataSource || filter.operator === 'in';
    const useMultiSelectForOperator = filter.operator === 'in' || filter.operator === 'equals' || filter.operator === 'not_equals';
    
    if (supportsMultiSelect && useMultiSelectForOperator) {
      const options = field.enumValues || getDataSourceOptions(field);
      const selectedValues = Array.isArray(filter.value) ? filter.value : (filter.value ? [String(filter.value)] : []);
      const allSelected = options.length > 0 && selectedValues.length === options.length;
      const someSelected = selectedValues.length > 0 && selectedValues.length < options.length;
      
      const popoverKey = `${filter.field}-${index}`;
      const isOpen = openPopovers[popoverKey] || false;
      
      return (
        <Popover 
          open={isOpen} 
          onOpenChange={(open) => {
            setOpenPopovers(prev => ({ ...prev, [popoverKey]: open }));
          }}
          modal={false}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
              disabled={optionsLoading}
            >
              <span className="truncate flex items-center gap-2">
                {selectedValues.length === 0 
                  ? `Select ${field.label.toLowerCase()}...`
                  : selectedValues.length === 1
                  ? (() => {
                      const option = options.find((opt: any) => {
                        const optValue = typeof opt === 'string' ? opt : opt.value || opt.label;
                        return optValue === selectedValues[0];
                      });
                      return typeof option === 'string' ? option : option?.label || selectedValues[0];
                    })()
                  : `${selectedValues.length} selected`
                }
                {selectedValues.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {selectedValues.length}
                  </Badge>
                )}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            {/* Search Input */}
            <div className="flex items-center border-b px-3 py-2">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Input 
                placeholder={`Search ${field.label.toLowerCase()}...`}
                value={searchQueries[popoverKey] || ''}
                onChange={(e) => {
                  setSearchQueries(prev => ({ ...prev, [popoverKey]: e.target.value }));
                }}
                className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            
            {/* Options List */}
            <ScrollArea className="h-[300px]">
              <div className="p-2 space-y-1">
                {/* Select All / Clear All */}
                {options.length > 1 && (
                  <div 
                    className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm"
                    onClick={() => {
                      if (allSelected) {
                        // Clear all
                        updateFilter(index, { 
                          value: [],
                          operator: filter.operator
                        }, filter);
                      } else {
                        // Select all
                        const allValues = options.map((opt: any) => {
                          const optValue = typeof opt === 'string' ? opt : opt.value || opt.label;
                          return String(optValue);
                        });
                        updateFilter(index, { 
                          value: allValues,
                          operator: 'in'
                        }, filter);
                      }
                    }}
                  >
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => {
                        if (allSelected) {
                          updateFilter(index, { 
                            value: [],
                            operator: filter.operator
                          }, filter);
                        } else {
                          const allValues = options.map((opt: any) => {
                            const optValue = typeof opt === 'string' ? opt : opt.value || opt.label;
                            return String(optValue);
                          });
                          updateFilter(index, { 
                            value: allValues,
                            operator: 'in'
                          }, filter);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={cn("h-4 w-4", someSelected && "opacity-50")}
                    />
                    <span className="text-sm font-medium">{allSelected ? 'Clear All' : 'Select All'}</span>
                  </div>
                )}
                
                {/* Filter and map options */}
                {(() => {
                  const searchQuery = (searchQueries[popoverKey] || '').toLowerCase();
                  const filteredOptions = options.filter((opt: any) => {
                    const label = typeof opt === 'string' ? opt : opt.label || opt.value;
                    return label.toLowerCase().includes(searchQuery);
                  });
                  
                  if (filteredOptions.length === 0) {
                    return (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No results found.
                      </div>
                    );
                  }
                  
                  return filteredOptions.map((option: any) => {
                    const value = typeof option === 'string' ? option : option.value || option.label;
                    const label = typeof option === 'string' ? option : option.label;
                    const isSelected = selectedValues.includes(String(value));
                    
                    const handleToggle = () => {
                      let newValues: string[];
                      
                      // Always allow multi-selection - toggle the value
                      newValues = isSelected
                        ? selectedValues.filter(v => v !== String(value))
                        : [...selectedValues, String(value)];
                      
                      // For multi-select fields (enum/dataSource), always use 'in' operator and always store as array
                      const updatedOperator = 'in';
                      
                      updateFilter(index, { 
                        value: newValues,
                        operator: updatedOperator
                      }, filter);
                    };
                    
                    return (
                      <div
                        key={value}
                        className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm"
                        onClick={handleToggle}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={handleToggle}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{label}</span>
                      </div>
                    );

                  });
                })()}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      );
    }
    
    // Data source dropdown (clients, payees, workers) - single select fallback for other operators
    if (field.dataSource && filter.operator === 'contains') {
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

  // Render a category composition filter with multi-select and match mode
  const renderCategoryCompositionFilter = (field: FieldMetadata, filter: ReportFilter | null) => {
    const options = field.enumValues || [];
    const currentValues = filter?.value && Array.isArray(filter.value) ? filter.value : [];
    const currentOperator = filter?.operator || 'contains_any';
    
    const handleCategoryToggle = (category: string) => {
      const newValues = currentValues.includes(category)
        ? currentValues.filter(v => v !== category)
        : [...currentValues, category];
      
      if (newValues.length === 0) {
        // Remove filter if no categories selected
        removeFilterForField(field.key);
      } else {
        updateOrAddFilter(field.key, {
          value: newValues,
          operator: currentOperator
        });
      }
    };
    
    const handleModeChange = (mode: 'contains_any' | 'contains_only' | 'contains_all') => {
      if (currentValues.length > 0) {
        updateOrAddFilter(field.key, {
          value: currentValues,
          operator: mode
        });
      }
    };
    
    const handleSelectAll = () => {
      if (currentValues.length === options.length) {
        // Clear all
        removeFilterForField(field.key);
      } else {
        // Select all
        updateOrAddFilter(field.key, {
          value: options,
          operator: currentOperator
        });
      }
    };
    
    // Format category labels for display
    const formatCategoryLabel = (cat: string) => {
      return cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };
    
    return (
      <div className="space-y-3 p-3 border rounded-md">
        {/* Match Mode Radio Buttons */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Match Mode</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${field.key}-any`}
                name={`${field.key}-mode`}
                value="contains_any"
                checked={currentOperator === 'contains_any'}
                onChange={() => handleModeChange('contains_any')}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <Label htmlFor={`${field.key}-any`} className="cursor-pointer font-normal text-sm">
                Has Any
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${field.key}-only`}
                name={`${field.key}-mode`}
                value="contains_only"
                checked={currentOperator === 'contains_only'}
                onChange={() => handleModeChange('contains_only')}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <Label htmlFor={`${field.key}-only`} className="cursor-pointer font-normal text-sm">
                Only These
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${field.key}-all`}
                name={`${field.key}-mode`}
                value="contains_all"
                checked={currentOperator === 'contains_all'}
                onChange={() => handleModeChange('contains_all')}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              <Label htmlFor={`${field.key}-all`} className="cursor-pointer font-normal text-sm">
                Has All
              </Label>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentOperator === 'contains_any' && 'Projects with at least one selected category'}
            {currentOperator === 'contains_only' && 'Projects with ONLY the selected categories'}
            {currentOperator === 'contains_all' && 'Projects with all selected categories (may have others)'}
          </div>
        </div>
        
        {/* Category Checkboxes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Categories</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 text-xs"
            >
              {currentValues.length === options.length ? 'Clear All' : 'Select All'}
            </Button>
          </div>
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-1">
              {options.map((category) => (
                <label
                  key={category}
                  htmlFor={`category-${category}`}
                  className="flex items-center space-x-3 p-2.5 hover:bg-accent/50 rounded-md cursor-pointer transition-colors"
                >
                  <Checkbox
                    id={`category-${category}`}
                    checked={currentValues.includes(category)}
                    onCheckedChange={() => handleCategoryToggle(category)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm flex-1 select-none">{formatCategoryLabel(category)}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Selected Categories Display */}
        {currentValues.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Selected ({currentValues.length})</Label>
            <div className="flex flex-wrap gap-1">
              {currentValues.map((cat) => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {formatCategoryLabel(cat)}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={() => handleCategoryToggle(cat)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render a boolean radio filter for Yes/No/Any selection
  const renderBooleanRadioFilter = (field: FieldMetadata, filter: ReportFilter | null) => {
    // Get current value: true, false, or null (Any)
    const currentValue = filter?.value === true || filter?.value === 'true' ? 'true' 
                       : filter?.value === false || filter?.value === 'false' ? 'false' 
                       : 'any';
    
    const handleRadioChange = (value: 'true' | 'false' | 'any') => {
      if (value === 'any') {
        // Remove the filter entirely for "Any"
        removeFilterForField(field.key);
      } else {
        // Add or update the filter with boolean value
        updateOrAddFilter(field.key, { 
          value: value === 'true',
          operator: 'equals'
        });
      }
    };
    
    return (
      <div className="flex items-center gap-4 p-2 border rounded-md">
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id={`${field.key}-yes`}
            name={field.key}
            value="true"
            checked={currentValue === 'true'}
            onChange={() => handleRadioChange('true')}
            className="h-4 w-4 text-primary focus:ring-primary"
          />
          <Label htmlFor={`${field.key}-yes`} className="cursor-pointer font-normal">
            Yes
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id={`${field.key}-no`}
            name={field.key}
            value="false"
            checked={currentValue === 'false'}
            onChange={() => handleRadioChange('false')}
            className="h-4 w-4 text-primary focus:ring-primary"
          />
          <Label htmlFor={`${field.key}-no`} className="cursor-pointer font-normal">
            No
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="radio"
            id={`${field.key}-any`}
            name={field.key}
            value="any"
            checked={currentValue === 'any'}
            onChange={() => handleRadioChange('any')}
            className="h-4 w-4 text-primary focus:ring-primary"
          />
          <Label htmlFor={`${field.key}-any`} className="cursor-pointer font-normal">
            Any
          </Label>
        </div>
      </div>
    );
  };

  // Render a simple multi-select filter for universal/custom filters
  const renderSimpleMultiSelect = (field: FieldMetadata, filter: ReportFilter | null) => {
    // Handle category composition filter specially
    if (field.key === 'category_list') {
      return renderCategoryCompositionFilter(field, filter);
    }
    
    // Handle boolean fields with radio buttons
    if (field.type === 'boolean') {
      return renderBooleanRadioFilter(field, filter);
    }
    
    const index = filter ? getFilterIndex(field.key) : -1;
    
    if (index >= 0 && filter) {
      return renderFilterValue(filter, index);
    }
    
    // No filter exists yet - show placeholder button that creates filter on interaction
    const defaultOperator = field.enumValues || field.dataSource ? 'in' : 'equals';
    const tempFilter: ReportFilter = {
      field: field.key,
      operator: defaultOperator,
      value: field.enumValues || field.dataSource ? [] : ''
    };
    
    // Render with a temporary index that will create the filter when user interacts
    // We'll handle the creation in renderFilterValue by checking if index === filters.length
    return renderFilterValue(tempFilter, filters.length);
  };

  const [universalOpen, setUniversalOpen] = useState(true);
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Universal Filters */}
      {(universalFields.dateFields.length > 0 || universalFields.statusFields.length > 0 || universalFields.clientFields.length > 0) && (
        <Collapsible open={universalOpen} onOpenChange={setUniversalOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold">
            <span>Universal Filters</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", universalOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Date Range Filter */}
            {universalFields.dateFields.length > 0 && (() => {
              const dateField = universalFields.dateFields[0];
              const filter = getFilterForField(dateField.key);
              const index = getFilterIndex(dateField.key);
              
              return (
                <div className="space-y-2">
                  <Label className="text-sm">Date Range</Label>
                  {index >= 0 && filter ? renderFilterValue(filter, index) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 justify-start text-left font-normal text-muted-foreground"
                        onClick={() => {
                          const newFilter: ReportFilter = {
                            field: dateField.key,
                            operator: 'between',
                            value: [null, null]
                          };
                          onFiltersChange([...filters, newFilter]);
                        }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Select date range
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Status Filter */}
            {universalFields.statusFields.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Status</Label>
                {renderSimpleMultiSelect(universalFields.statusFields[0], getFilterForField(universalFields.statusFields[0].key))}
              </div>
            )}

            {/* Client Filter */}
            {universalFields.clientFields.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Client</Label>
                {renderSimpleMultiSelect(universalFields.clientFields[0], getFilterForField(universalFields.clientFields[0].key))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Custom Filters */}
      {Object.keys(customFields).length > 0 && (
        <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold">
            <span>Custom Filters</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", customOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {Object.entries(customFields).map(([groupName, groupFields]) => (
              <div key={groupName} className="space-y-2">
                <Label className="text-sm font-semibold">{groupName}</Label>
                <div className="space-y-3">
                  {groupFields.map((fieldMeta) => (
                    <div key={fieldMeta.key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{fieldMeta.label}</Label>
                      {renderSimpleMultiSelect(fieldMeta, getFilterForField(fieldMeta.key))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
