import React, { useMemo } from 'react';
import { ScheduleTask } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import { calculateCriticalPath, calculateProjectDuration, isTaskOverdue } from './utils/scheduleCalculations';

interface ScheduleStatsProps {
  tasks: ScheduleTask[];
}

export default function ScheduleStats({ tasks }: ScheduleStatsProps) {
  // Memoize expensive calculations
  const stats = useMemo(() => {
    // Count completed phases across all tasks
    let completedPhases = 0;
    let totalPhases = 0;

    tasks.forEach(task => {
      if (task.has_multiple_phases && task.phases) {
        totalPhases += task.phases.length;
        completedPhases += task.phases.filter(p => p.completed === true).length;
      } else {
        totalPhases += 1;
        // Single-phase tasks use completed field
        if (task.completed === true) {
          completedPhases += 1;
        }
      }
    });

    // Find project start/end from all phases
    let projectStart: Date | null = null;
    let projectEnd: Date | null = null;

    tasks.forEach(task => {
      if (task.has_multiple_phases && task.phases) {
        task.phases.forEach(phase => {
          const start = new Date(phase.start_date);
          const end = new Date(phase.end_date);
          if (!projectStart || start < projectStart) projectStart = start;
          if (!projectEnd || end > projectEnd) projectEnd = end;
        });
      } else {
        const start = new Date(task.start);
        const end = new Date(task.end);
        if (!projectStart || start < projectStart) projectStart = start;
        if (!projectEnd || end > projectEnd) projectEnd = end;
      }
    });

    const formatShortDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Calculate project duration
    const totalDuration = calculateProjectDuration(tasks);

    // Calculate actual critical path
    const criticalPathIds = calculateCriticalPath(tasks);
    const criticalPathItems = criticalPathIds.length;

    return [
      {
        label: 'Project Duration',
        value: projectStart && projectEnd 
          ? `${formatShortDate(projectStart)} → ${formatShortDate(projectEnd)}`
          : 'Not scheduled',
        icon: Calendar,
        color: 'text-blue-600'
      },
      {
        label: 'Phases Completed',
        value: `${completedPhases} of ${totalPhases}`,
        icon: CheckCircle2,
        color: 'text-green-600'
      },
      {
        label: 'Total Duration',
        value: `${totalDuration} days`,
        icon: Calendar,
        color: 'text-blue-600'
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

