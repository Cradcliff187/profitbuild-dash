import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
}

interface ColumnSelectorProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onVisibilityChange: (visibleColumns: string[]) => void;
}

export function ColumnSelector({
  columns,
  visibleColumns,
  onVisibilityChange,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (columnKey: string) => {
    const column = columns.find(c => c.key === columnKey);
    if (column?.required) return;

    const isVisible = visibleColumns.includes(columnKey);
    if (isVisible) {
      const newVisible = visibleColumns.filter(k => k !== columnKey);
      if (newVisible.length > 0) {
        onVisibilityChange(newVisible);
      }
    } else {
      onVisibilityChange([...visibleColumns, columnKey]);
    }
  };

  const handleSelectAll = () => {
    onVisibilityChange(columns.map(c => c.key));
  };

  const handleDeselectAll = () => {
    const requiredColumns = columns.filter(c => c.required).map(c => c.key);
    onVisibilityChange(requiredColumns);
  };

  const visibleCount = visibleColumns.length;
  const totalCount = columns.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Settings2 className="h-3 w-3 mr-1" />
          Columns ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-medium">Show Columns</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={handleSelectAll}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={handleDeselectAll}
            >
              Reset
            </Button>
          </div>
        </div>
        <Separator className="mb-2" />
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {columns.map((column) => {
            const isVisible = visibleColumns.includes(column.key);
            const isRequired = column.required;
            
            return (
              <div
                key={column.key}
                className="flex items-center space-x-2 px-1 py-1.5 hover:bg-muted/50 rounded"
              >
                <Checkbox
                  id={`column-${column.key}`}
                  checked={isVisible}
                  disabled={isRequired}
                  onCheckedChange={() => handleToggle(column.key)}
                  className="h-3 w-3"
                />
                <Label
                  htmlFor={`column-${column.key}`}
                  className={`text-xs flex-1 cursor-pointer ${
                    isRequired ? 'text-muted-foreground' : ''
                  }`}
                >
                  {column.label}
                  {isRequired && (
                    <span className="ml-1 text-[10px]">(required)</span>
                  )}
                </Label>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
