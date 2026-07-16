import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ScheduleTask } from '@/types/schedule';
import { FieldTaskSection } from './FieldTaskSection';
import { parseDateOnly } from '@/utils/scheduleNotes';

interface FieldScheduleTableProps {
  tasks: ScheduleTask[];
  projectId: string;
  onTaskUpdate: (task: ScheduleTask) => void;
}

function isDateInRange(start: string, end: string): boolean {
  const today = new Date();
  return today >= parseDateOnly(start) && today <= parseDateOnly(end);
}

function isThisWeek(dateStr: string): boolean {
  const date = parseDateOnly(dateStr);
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);
  return date > today && date <= weekFromNow;
}

/**
 * An incomplete task whose window has already closed. Previously there was no
 * such group, and the fallthrough put late work under "Upcoming": `isDateInRange`
 * needs today INSIDE the window and `isThisWeek` needs `start > today`, so a task
 * that ended in the past and was never completed matched neither and landed in
 * the else-branch. A crew being told late work is upcoming is misinformation,
 * not a cosmetic gap.
 */
function isOverdue(endStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseDateOnly(endStr);
  end.setHours(0, 0, 0, 0);
  return end < today;
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
  // Group tasks into sections. Order matters: overdue is checked BEFORE the
  // window/upcoming tests, since a closed-window task fails both and would
  // otherwise fall through to "Upcoming".
  const { overdue, active, thisWeek, upcoming, completed } = useMemo(() => {
    const groups = {
      overdue: [] as ScheduleTask[],
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
      } else if (isOverdue(task.end)) {
        groups.overdue.push(task);
      } else if (isThisWeek(task.start)) {
        groups.thisWeek.push(task);
      } else {
        groups.upcoming.push(task);
      }
    }

    // Sort each group by start date
    const byStartDate = (a: ScheduleTask, b: ScheduleTask) =>
      new Date(a.start).getTime() - new Date(b.start).getTime();

    groups.overdue.sort(byStartDate);
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
      {/* Overdue leads and opens: it's the only group that needs a decision. */}
      <FieldTaskSection
        title="Overdue"
        tasks={overdue}
        defaultOpen={true}
        tone="destructive"
        projectId={projectId}
        onTaskUpdate={onTaskUpdate}
      />
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
      {/* Open by default. Tasks are this screen's payload, and on a project
          whose work is all in the future (common — most projects aren't in
          their active window today) Today/Active and This Week render nothing,
          so a collapsed Upcoming meant a worker opened the schedule and saw
          zero tasks. Completed stays closed: it's history, not payload. */}
      <FieldTaskSection
        title="Upcoming"
        tasks={upcoming}
        defaultOpen={true}
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
