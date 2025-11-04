import React from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScheduleTask } from '@/types/schedule';

interface TaskReorderPanelProps {
  tasks: ScheduleTask[];
  onMoveUp: (taskId: string) => void;
  onMoveDown: (taskId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function TaskReorderPanel({ 
  tasks, 
  onMoveUp, 
  onMoveDown,
  isOpen,
  onToggle
}: TaskReorderPanelProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleContent>
        <Card className="p-3 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Reorder Tasks</h3>
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={onToggle}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {tasks.map((task, index) => (
              <div 
                key={task.id}
                className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onMoveUp(task.id)}
                    disabled={index === 0}
                    className="h-5 w-5 p-0"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onMoveDown(task.id)}
                    disabled={index === tasks.length - 1}
                    className="h-5 w-5 p-0"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {task.category?.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm truncate">{task.name}</span>
                  </div>
                </div>
                
                <span className="text-xs text-muted-foreground shrink-0">
                  Row {index + 1}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
