import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ReportFilter } from "@/hooks/useReportExecution";
import { FieldMetadata } from "./SimpleReportBuilder";

interface FilterSummaryProps {
  filters: ReportFilter[];
  availableFields: FieldMetadata[];
  onRemoveFilter: (index: number) => void;
  onClearAll: () => void;
}

const operatorLabels: Record<ReportFilter['operator'], string> = {
  equals: '=',
  not_equals: '≠',
  greater_than: '>',
  less_than: '<',
  contains: 'contains',
  in: 'in',
  between: 'between',
  is_null: 'is null',
  is_not_null: 'is not null',
  contains_any: 'contains any',
  contains_only: 'contains only',
  contains_all: 'contains all'
};

export function FilterSummary({ filters, availableFields, onRemoveFilter, onClearAll }: FilterSummaryProps) {
  if (filters.length === 0) {
    return null;
  }

  const getFieldLabel = (fieldKey: string): string => {
    const field = availableFields.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  };

  const formatFilterValue = (filter: ReportFilter): string => {
    if (filter.operator === 'is_null') {
      return '';
    }

    if (filter.operator === 'between') {
      if (Array.isArray(filter.value)) {
        return `${filter.value[0] || ''} - ${filter.value[1] || ''}`;
      }
      return String(filter.value || '');
    }

    if (filter.operator === 'in') {
      if (Array.isArray(filter.value)) {
        return filter.value.length === 1 
          ? filter.value[0] 
          : `${filter.value.length} values`;
      }
      return String(filter.value || '');
    }

    return String(filter.value || '');
  };

  return (
    <div className="space-y-2 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="text-sm font-medium">Active Filters</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 text-xs w-full sm:w-auto"
        >
          Clear All
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 w-full">
        {filters.map((filter, index) => {
          const fieldLabel = getFieldLabel(filter.field);
          const valueLabel = formatFilterValue(filter);
          const operatorLabel = operatorLabels[filter.operator];

          return (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 pr-1 py-1 max-w-full"
            >
              <span className="text-xs truncate max-w-full">
                {fieldLabel} {operatorLabel} {valueLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                onClick={() => onRemoveFilter(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

