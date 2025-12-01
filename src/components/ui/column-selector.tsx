import { useState } from "react";
import { Settings2, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
}

interface ColumnSelectorProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onVisibilityChange: (visibleColumns: string[]) => void;
  columnOrder?: string[];
  onColumnOrderChange?: (newOrder: string[]) => void;
}

export function ColumnSelector({
  columns,
  visibleColumns,
  onVisibilityChange,
  columnOrder = columns.map(c => c.key),
  onColumnOrderChange,
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

  // Order columns based on columnOrder array
  const orderedColumns = columnOrder
    .map(key => columns.find(c => c.key === key))
    .filter((col): col is ColumnDefinition => col !== undefined);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onColumnOrderChange) return;
    
    // Map indices from orderedColumns (rendered list) back to columnOrder array
    // This is necessary because orderedColumns may have fewer items if columnOrder
    // contains columns that don't exist in the columns prop
    const orderedColumnKeys = orderedColumns.map(col => col.key);
    const sourceKey = orderedColumnKeys[result.source.index];
    const destKey = orderedColumnKeys[result.destination.index];
    
    // Find actual indices in columnOrder array
    const sourceIndex = columnOrder.indexOf(sourceKey);
    const destIndex = columnOrder.indexOf(destKey);
    
    if (sourceIndex === -1 || destIndex === -1) return;
    
    const items = Array.from(columnOrder);
    const [reorderedItem] = items.splice(sourceIndex, 1);
    items.splice(destIndex, 0, reorderedItem);
    
    onColumnOrderChange(items);
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-1 max-h-[400px] overflow-y-auto"
              >
                {orderedColumns.map((column, index) => {
                  const isVisible = visibleColumns.includes(column.key);
                  const isRequired = column.required;
                  
                  return (
                    <Draggable 
                      key={column.key} 
                      draggableId={column.key} 
                      index={index}
                      isDragDisabled={!onColumnOrderChange}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "flex items-center space-x-2 px-1 py-1.5 rounded",
                            snapshot.isDragging ? "bg-muted shadow-lg z-50" : "hover:bg-muted/50"
                          )}
                        >
                          {onColumnOrderChange && (
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <Checkbox
                            id={`column-${column.key}`}
                            checked={isVisible}
                            disabled={isRequired}
                            onCheckedChange={() => handleToggle(column.key)}
                            className="h-3 w-3"
                          />
                          <Label
                            htmlFor={`column-${column.key}`}
                            className={cn(
                              "text-xs flex-1 cursor-pointer",
                              isRequired && "text-muted-foreground"
                            )}
                          >
                            {column.label}
                            {isRequired && (
                              <span className="ml-1 text-[10px]">(required)</span>
                            )}
                          </Label>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </PopoverContent>
    </Popover>
  );
}
