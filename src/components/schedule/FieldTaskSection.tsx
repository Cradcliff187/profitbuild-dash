import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScheduleTask } from '@/types/schedule';
import { FieldTaskCard } from './FieldTaskCard';

interface FieldTaskSectionProps {
  title: string;
  tasks: ScheduleTask[];
  defaultOpen: boolean;
  projectId: string;
  onTaskUpdate: (task: ScheduleTask) => void;
}

export function FieldTaskSection({
  title,
  tasks,
  defaultOpen,
  projectId,
  onTaskUpdate,
}: FieldTaskSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (tasks.length === 0) return null;

  const handleToggleComplete = (task: ScheduleTask) => {
    const updated = { ...task, completed: !task.completed };
    onTaskUpdate(updated);
  };

  const handleTogglePhase = (task: ScheduleTask, phaseNumber: number) => {
    if (!task.phases) return;
    const updated = { ...task };
    updated.phases = task.phases.map((p) =>
      p.phase_number === phaseNumber ? { ...p, completed: !p.completed } : p
    );
    onTaskUpdate(updated);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 active:bg-muted/80 transition-colors min-h-[44px]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
              {tasks.length}
            </Badge>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
        <div className="space-y-2 pt-2">
          {tasks.map((task) => (
            <FieldTaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              onToggleComplete={handleToggleComplete}
              onTogglePhase={handleTogglePhase}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
