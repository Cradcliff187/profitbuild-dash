import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ColumnSelector } from '@/components/ui/column-selector';
import { Search, ArrowUpDown } from 'lucide-react';
import { ScheduleTask } from '@/types/schedule';
import { useScheduleTableColumns } from '@/hooks/useScheduleTableColumns';
import { cn } from '@/lib/utils';
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

type SortField = 'name' | 'start' | 'end' | 'category' | 'progress' | 'estimated_cost' | 'actual_cost';
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

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = tasks.filter(task =>
        task.name.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query) ||
        task.schedule_notes?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'start' || sortField === 'end') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tasks, searchQuery, sortField, sortDirection]);

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      labor_internal: 'bg-blue-100 text-blue-800 border-blue-200',
      subcontractors: 'bg-purple-100 text-purple-800 border-purple-200',
      materials: 'bg-green-100 text-green-800 border-green-200',
      equipment: 'bg-amber-100 text-amber-800 border-amber-200',
      permits: 'bg-red-100 text-red-800 border-red-200',
      management: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return colors[category] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

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

  const calculateDuration = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const getProgressStatus = (progress: number): string => {
    if (progress === 0) return 'Not Started';
    if (progress === 100) return 'Complete';
    return 'In Progress';
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
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <ColumnSelector
            columns={columnDefinitions}
            visibleColumns={visibleColumns}
            onVisibilityChange={setVisibleColumns}
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
                {visibleColumns.includes('progress') && (
                  <TableHead>
                    <SortableHeader field="progress" label="Progress" />
                  </TableHead>
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
                    {searchQuery ? 'No tasks match your search' : 'No tasks scheduled'}
                  </TableCell>
                </TableRow>
              ) : (
                 filteredAndSortedTasks.map((task) => {
                  const duration = calculateDuration(task.start, task.end);
                  
                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onTaskClick(task)}
                    >
                      {visibleColumns.includes('name') && (
                        <TableCell className="sticky left-0 bg-background font-medium">
                          <div className="flex items-center gap-2">
                            {task.isChangeOrder && (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] px-1 py-0 h-4 bg-pink-50 text-pink-700 border-pink-200"
                                title={task.change_order_number ? `Change Order: ${task.change_order_number}` : 'Change Order'}
                              >
                                CO
                              </Badge>
                            )}
                            <span className="truncate">{task.name}</span>
                            {task.has_multiple_phases && task.phases && (
                              <Badge 
                                variant="secondary" 
                                className="text-[9px] px-1 py-0 h-4"
                                title={task.phases.map(p => 
                                  `Phase ${p.phase_number}: ${formatDate(p.start_date)} - ${formatDate(p.end_date)} (${p.duration_days}d)`
                                ).join('\n')}
                              >
                                {task.phases.length} Phases
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('category') && (
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", getCategoryColor(task.category))}>
                            {task.category.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.includes('start') && (
                        <TableCell className="whitespace-nowrap">{formatDate(task.start)}</TableCell>
                      )}
                      {visibleColumns.includes('end') && (
                        <TableCell className="whitespace-nowrap">{formatDate(task.end)}</TableCell>
                      )}
                      {visibleColumns.includes('duration') && (
                        <TableCell className="text-right tabular-nums">{duration} days</TableCell>
                      )}
                      {visibleColumns.includes('progress') && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={task.progress} className="h-1.5 flex-1" />
                            <span className="text-xs tabular-nums w-10 text-right">{task.progress}%</span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.includes('dependencies') && (
                        <TableCell>
                          {task.dependencies && task.dependencies.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {task.dependencies.map((dep, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0 h-4">
                                  {dep.task_name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.includes('notes') && (
                        <TableCell className="max-w-[200px]">
                          {task.schedule_notes && !task.has_multiple_phases ? (
                            <div className="truncate text-xs text-muted-foreground">{task.schedule_notes}</div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
