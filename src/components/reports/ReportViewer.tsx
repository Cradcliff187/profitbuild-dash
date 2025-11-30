import { useMemo, useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportField } from "@/utils/reportExporter";
import { CompletePagination } from "@/components/ui/complete-pagination";
import { usePagination } from "@/hooks/usePagination";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportViewerProps {
  data: any[];
  fields: ReportField[];
  isLoading?: boolean;
  pageSize?: number;
}

function formatValue(value: any, type?: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'currency': {
      const numValue = Number(value);
      const isNegative = numValue < 0;
      const absValue = Math.abs(numValue);
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: 'never'
      }).format(absValue);
      return isNegative ? `(${formatted})` : formatted;
    }
    
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    
    case 'date':
      if (value) {
        return new Date(value).toLocaleDateString();
      }
      return '';
    
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value));
    
    default:
      return String(value);
  }
}

export function ReportViewer({ data, fields, isLoading, pageSize: initialPageSize = 50 }: ReportViewerProps) {
  // Page size state
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Handle column header click for sorting
  const handleSort = (fieldKey: string) => {
    if (sortColumn === fieldKey) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, start with ascending
      setSortColumn(fieldKey);
      setSortDirection('asc');
    }
  };

  // Sort data based on column and direction
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    const field = fields.find(f => f.key === sortColumn);
    if (!field) return data;

    return [...data].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle null/undefined values - place at end
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle different data types based on field type
      if (field.type === 'currency' || field.type === 'number') {
        const aNum = Number(aValue) || 0;
        const bNum = Number(bValue) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (field.type === 'percent') {
        // Strip % if present and compare as numbers
        const aNum = typeof aValue === 'string' 
          ? parseFloat(aValue.replace('%', '')) || 0
          : Number(aValue) || 0;
        const bNum = typeof bValue === 'string'
          ? parseFloat(bValue.replace('%', '')) || 0
          : Number(bValue) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (field.type === 'date') {
        const aDate = aValue instanceof Date ? aValue : new Date(aValue);
        const bDate = bValue instanceof Date ? bValue : new Date(bValue);
        const aTime = aDate.getTime();
        const bTime = bDate.getTime();
        
        // Handle invalid dates
        if (isNaN(aTime) && isNaN(bTime)) return 0;
        if (isNaN(aTime)) return 1;
        if (isNaN(bTime)) return -1;
        
        return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      }

      // Text comparison (case-insensitive)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }, [data, sortColumn, sortDirection, fields]);

  // Calculate totals for numeric fields (using original data, not sorted)
  const totals = useMemo(() => {
    const totalsMap: Record<string, number> = {};
    fields.forEach(field => {
      if (field.type === 'currency' || field.type === 'number') {
        totalsMap[field.key] = data.reduce((sum, row) => {
          const value = Number(row[field.key]) || 0;
          return sum + value;
        }, 0);
      } else if (field.type === 'percent') {
        // For percentages, calculate average
        const validValues = data
          .map(row => Number(row[field.key]))
          .filter(val => !isNaN(val) && val !== null && val !== undefined);
        if (validValues.length > 0) {
          totalsMap[field.key] = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        }
      }
    });
    return totalsMap;
  }, [data, fields]);

  // Pagination (on sorted data)
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
  } = usePagination({
    totalItems: sortedData.length,
    pageSize,
    initialPage: 1,
  });

  // Reset to first page when sort column changes (not when direction toggles)
  useEffect(() => {
    if (sortColumn !== null && currentPage !== 1) {
      goToPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortColumn]);

  // Reset to first page when page size changes
  useEffect(() => {
    goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const paginatedData = useMemo(() => {
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex]);

  const formattedData = useMemo(() => {
    return paginatedData.map(row => {
      const formatted: any = {};
      fields.forEach(field => {
        formatted[field.key] = formatValue(row[field.key], field.type);
      });
      return formatted;
    });
  }, [paginatedData, fields]);

  const formattedTotals = useMemo(() => {
    const formatted: any = {};
    fields.forEach(field => {
      if (field.type === 'currency' || field.type === 'number') {
        formatted[field.key] = formatValue(totals[field.key], field.type);
      } else if (field.type === 'percent') {
        formatted[field.key] = totals[field.key] !== undefined ? formatValue(totals[field.key], field.type) : '-';
      } else {
        formatted[field.key] = '';
      }
    });
    return formatted;
  }, [totals, fields]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading report data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">No data available for this report</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full border rounded-md overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {fields.map(field => (
                  <TableHead 
                    key={field.key} 
                    className={cn(
                      "font-semibold cursor-pointer select-none hover:bg-muted/50 transition-colors",
                      sortColumn === field.key && "bg-muted/30"
                    )}
                    onClick={() => handleSort(field.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{field.label}</span>
                      {sortColumn === field.key && (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4 inline" />
                        ) : (
                          <ChevronDown className="h-4 w-4 inline" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {formattedData.map((row, index) => (
                <TableRow key={index}>
                  {fields.map(field => (
                    <TableCell key={field.key} className="whitespace-nowrap">
                      {row[field.key] || '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="sticky bottom-0 bg-muted/50 border-t z-10">
              <TableRow className="font-semibold">
                {fields.map((field, index) => (
                  <TableCell key={field.key} className="whitespace-nowrap">
                    {index === 0 ? 'Total' : (formattedTotals[field.key] || '')}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
      
      {/* Pagination Info and Controls */}
      {data.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                }}
                className="border rounded px-2 py-1 text-sm bg-background"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
            
            {data.length > pageSize && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{endIndex} of {data.length} rows
                </div>
                <CompletePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              </div>
            )}
            {data.length <= pageSize && (
              <div className="text-sm text-muted-foreground">
                Showing {data.length} of {data.length} rows
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

