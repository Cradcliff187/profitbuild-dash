import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportField } from "@/utils/reportExporter";

interface ReportViewerProps {
  data: any[];
  fields: ReportField[];
  isLoading?: boolean;
}

function formatValue(value: any, type?: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Number(value));
    
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

export function ReportViewer({ data, fields, isLoading }: ReportViewerProps) {
  const formattedData = useMemo(() => {
    return data.map(row => {
      const formatted: any = {};
      fields.forEach(field => {
        formatted[field.key] = formatValue(row[field.key], field.type);
      });
      return formatted;
    });
  }, [data, fields]);

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
    <ScrollArea className="w-full border rounded-md" style={{ maxHeight: 'calc(100vh - 300px)' }}>
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map(field => (
              <TableHead key={field.key} className="font-semibold">
                {field.label}
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
      </Table>
    </ScrollArea>
  );
}

