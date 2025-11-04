import React, { useMemo } from 'react';
import { ScheduleTask } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle2, TrendingDown, AlertTriangle } from 'lucide-react';
import { calculateCriticalPath, calculateProjectDuration, isTaskOverdue } from './utils/scheduleCalculations';

interface ScheduleStatsProps {
  tasks: ScheduleTask[];
}

export default function ScheduleStats({ tasks }: ScheduleStatsProps) {
  // Memoize expensive calculations
  const stats = useMemo(() => {
    // Calculate stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.progress === 100).length;
    const inProgressTasks = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
    
    // Calculate schedule variance
    const today = new Date();
    const overdueTasks = tasks.filter(t => isTaskOverdue(t, today)).length;

    // Calculate project duration
    const totalDuration = calculateProjectDuration(tasks);

    // Calculate actual critical path
    const criticalPathIds = calculateCriticalPath(tasks);
    const criticalPathItems = criticalPathIds.length;

    return [
      {
        label: 'Total Duration',
        value: `${totalDuration} days`,
        icon: Calendar,
        color: 'text-blue-600'
      },
      {
        label: 'Tasks Completed',
        value: `${completedTasks} of ${totalTasks}`,
        icon: CheckCircle2,
        color: 'text-green-600'
      },
      {
        label: 'Schedule Status',
        value: overdueTasks > 0 ? `${overdueTasks} overdue` : 'On Track',
        icon: overdueTasks > 0 ? AlertTriangle : TrendingDown,
        color: overdueTasks > 0 ? 'text-red-600' : 'text-green-600'
      },
      {
        label: 'Critical Path Items',
        value: `${criticalPathItems} tasks`,
        icon: AlertTriangle,
        color: 'text-orange-600'
      }
    ];
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

