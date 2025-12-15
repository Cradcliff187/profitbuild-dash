import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ColumnSelector } from '@/components/ui/column-selector';
import { ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { ScheduleTask, TaskDependency } from '@/types/schedule';
import { useScheduleTableColumns } from '@/hooks/useScheduleTableColumns';
import { cn } from '@/lib/utils';
import { getCategoryBadgeClasses } from '@/utils/categoryColors';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ScheduleTableViewProps {
  tasks: ScheduleTask[];
  projectId: string;
  onTaskClick: (task: ScheduleTask) => void;
}

interface ScheduleTableRow {
  id: string;
  taskId: string;
  taskName: string;
  phaseNumber?: number;
  phaseDescription?: string;
  category: string;
  start: string;
  end: string;
  duration: number;
  isComplete: boolean;
  isChangeOrder: boolean;
  change_order_number?: string;
  dependencies?: TaskDependency[];
  notes?: string;
  originalTask: ScheduleTask;
}

type SortField = 'name' | 'start' | 'end' | 'category' | 'duration';
type SortDirection = 'asc' | 'desc';

export const ScheduleTableView: React.FC<ScheduleTableViewProps> = ({
  tasks,
  projectId,
  onTaskClick,
}) => {
  const { columnDefinitions, visibleColumns, setVisibleColumns } = useScheduleTableColumns(projectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('start');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const calculateDuration = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const extractNotesFromScheduleNotes = (scheduleNotes?: string): string | undefined => {
    if (!scheduleNotes) return undefined;
    
    try {
      const parsed = JSON.parse(scheduleNotes);
      return parsed.notes || undefined;
    } catch {
      return scheduleNotes;
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    // Expand tasks into phase rows
    const expandedRows: ScheduleTableRow[] = [];
    
    tasks.forEach(task => {
      if (task.has_multiple_phases && task.phases && task.phases.length > 0) {
        // Create one row per phase
        task.phases.forEach((phase, idx) => {
          expandedRows.push({
            id: `${task.id}-phase-${phase.phase_number}`,
            taskId: task.id,
            taskName: task.name,
            phaseNumber: phase.phase_number,
            phaseDescription: phase.description,
            category: task.category,
            start: phase.start_date,
            end: phase.end_date,
            duration: phase.duration_days,
            isComplete: phase.completed || false,
            isChangeOrder: task.isChangeOrder,
            change_order_number: task.change_order_number,
            dependencies: idx === 0 ? task.dependencies : undefined, // Only show dependencies on first phase
            notes: phase.notes,
            originalTask: task,
          });
        });
      } else {
        // Single row for non-phased tasks
        const duration = calculateDuration(task.start, task.end);
        expandedRows.push({
          id: task.id,
          taskId: task.id,
          taskName: task.name,
          category: task.category,
          start: task.start,
          end: task.end,
          duration,
          isComplete: task.completed || false,
          isChangeOrder: task.isChangeOrder,
          change_order_number: task.change_order_number,
          dependencies: task.dependencies,
          notes: extractNotesFromScheduleNotes(task.schedule_notes),
          originalTask: task,
        });
      }
    });

    // Apply search filter
    let filtered = expandedRows;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = expandedRows.filter(row =>
        row.taskName.toLowerCase().includes(query) ||
        row.category.toLowerCase().includes(query) ||
        row.phaseDescription?.toLowerCase().includes(query) ||
        row.notes?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'name') {
        aVal = a.taskName.toLowerCase();
        bVal = b.taskName.toLowerCase();
      } else if (sortField === 'start' || sortField === 'end') {
        aVal = new Date(a[sortField]).getTime();
        bVal = new Date(b[sortField]).getTime();
      } else if (sortField === 'category') {
        aVal = a.category.toLowerCase();
        bVal = b.category.toLowerCase();
      } else if (sortField === 'duration') {
        aVal = a.duration;
        bVal = b.duration;
      } else {
        aVal = a[sortField as keyof ScheduleTableRow];
        bVal = b[sortField as keyof ScheduleTableRow];
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tasks, searchQuery, sortField, sortDirection]);


  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const SortableHeader = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 hover:bg-transparent font-medium"
      onClick={() => handleSort(field)}
    >
      {label}
      <ArrowUpDown className={cn(
        "ml-1 h-3 w-3",
        sortField === field ? "text-primary" : "text-muted-foreground"
      )} />
    </Button>
  );

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <Card className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] h-8 text-sm"
          />
          <ColumnSelector
            columns={columnDefinitions}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
          />
          <div className="text-xs text-muted-foreground">
            {filteredAndSortedTasks.length} of {tasks.length} tasks
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {visibleColumns.includes('name') && (
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    <SortableHeader field="name" label="Task Name" />
                  </TableHead>
                )}
                {visibleColumns.includes('category') && (
                  <TableHead>
                    <SortableHeader field="category" label="Category" />
                  </TableHead>
                )}
                {visibleColumns.includes('start') && (
                  <TableHead>
                    <SortableHeader field="start" label="Start Date" />
                  </TableHead>
                )}
                {visibleColumns.includes('end') && (
                  <TableHead>
                    <SortableHeader field="end" label="End Date" />
                  </TableHead>
                )}
                {visibleColumns.includes('duration') && (
                  <TableHead className="text-right">Duration</TableHead>
                )}
                {visibleColumns.includes('status') && (
                  <TableHead>Status</TableHead>
                )}
                {visibleColumns.includes('dependencies') && (
                  <TableHead>Dependencies</TableHead>
                )}
                {visibleColumns.includes('notes') && (
                  <TableHead className="max-w-[200px]">Notes</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchQuery ? 'No phases match your search' : 'No tasks scheduled'}
                  </TableCell>
                </TableRow>
              ) : (
                 filteredAndSortedTasks.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onTaskClick(row.originalTask)}
                    >
                      {visibleColumns.includes('name') && (
                        <TableCell className="sticky left-0 bg-background font-medium">
                          <div className="flex items-center gap-2">
                            {row.isChangeOrder && (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] px-1 py-0 h-4 bg-pink-50 text-pink-700 border-pink-200"
                                title={row.change_order_number ? `Change Order: ${row.change_order_number}` : 'Change Order'}
                              >
                                CO
                              </Badge>
                            )}
                            <span className="truncate">
                              {row.taskName}
                              {row.phaseNumber !== undefined && (
                                <span className="text-muted-foreground ml-1">
                                  - Phase {row.phaseNumber}
                                  {row.phaseDescription && `: ${row.phaseDescription}`}
                                </span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('category') && (
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", getCategoryBadgeClasses(row.category))}>
                            {row.category.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('start') && (
                        <TableCell className="whitespace-nowrap">{formatDate(row.start)}</TableCell>
                      )}
                      {visibleColumns.includes('end') && (
                        <TableCell className="whitespace-nowrap">{formatDate(row.end)}</TableCell>
                      )}
                      {visibleColumns.includes('duration') && (
                        <TableCell className="text-right tabular-nums">{row.duration} days</TableCell>
                      )}
                      {visibleColumns.includes('status') && (
                        <TableCell>
                          {row.isComplete ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Incomplete</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes('dependencies') && (
                        <TableCell>
                          {row.dependencies && row.dependencies.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {row.dependencies.map((dep, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0 h-4">
                                  {dep.task_name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes('notes') && (
                        <TableCell className="max-w-[200px]">
                          {row.notes ? (
                            <div className="truncate text-xs text-muted-foreground">{row.notes}</div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
