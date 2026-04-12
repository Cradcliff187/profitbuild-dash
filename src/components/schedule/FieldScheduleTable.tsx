import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ScheduleTask } from '@/types/schedule';
import { FieldTaskSection } from './FieldTaskSection';

interface FieldScheduleTableProps {
  tasks: ScheduleTask[];
  projectId: string;
  onTaskUpdate: (task: ScheduleTask) => void;
}

function isDateInRange(start: string, end: string): boolean {
  const today = new Date();
  return today >= new Date(start) && today <= new Date(end);
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);
  return date > today && date <= weekFromNow;
}

function isTaskComplete(task: ScheduleTask): boolean {
  if (task.has_multiple_phases && task.phases) {
    return task.phases.every((p) => p.completed);
  }
  return task.completed || false;
}

export const FieldScheduleTable: React.FC<FieldScheduleTableProps> = ({
  tasks,
  projectId,
  onTaskUpdate,
}) => {
  // Group tasks into sections
  const { active, thisWeek, upcoming, completed } = useMemo(() => {
    const groups = {
      active: [] as ScheduleTask[],
      thisWeek: [] as ScheduleTask[],
      upcoming: [] as ScheduleTask[],
      completed: [] as ScheduleTask[],
    };

    for (const task of tasks) {
      if (isTaskComplete(task)) {
        groups.completed.push(task);
      } else if (isDateInRange(task.start, task.end)) {
        groups.active.push(task);
      } else if (isThisWeek(task.start)) {
        groups.thisWeek.push(task);
      } else {
        groups.upcoming.push(task);
      }
    }

    // Sort each group by start date
    const byStartDate = (a: ScheduleTask, b: ScheduleTask) =>
      new Date(a.start).getTime() - new Date(b.start).getTime();

    groups.active.sort(byStartDate);
    groups.thisWeek.sort(byStartDate);
    groups.upcoming.sort(byStartDate);
    groups.completed.sort(byStartDate);

    return groups;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No tasks scheduled</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <FieldTaskSection
        title="Today / Active"
        tasks={active}
        defaultOpen={true}
        projectId={projectId}
        onTaskUpdate={onTaskUpdate}
      />
      <FieldTaskSection
        title="This Week"
        tasks={thisWeek}
        defaultOpen={true}
        projectId={projectId}
        onTaskUpdate={onTaskUpdate}
      />
      <FieldTaskSection
        title="Upcoming"
        tasks={upcoming}
        defaultOpen={false}
        projectId={projectId}
        onTaskUpdate={onTaskUpdate}
      />
      <FieldTaskSection
        title="Completed"
        tasks={completed}
        defaultOpen={false}
        projectId={projectId}
        onTaskUpdate={onTaskUpdate}
      />
    </div>
  );
};
