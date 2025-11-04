import React, { useState, useEffect } from 'react';
import { ScheduleTask, TaskDependency } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface TaskEditPanelProps {
  task: ScheduleTask;
  allTasks: ScheduleTask[];
  onClose: () => void;
  onSave: (task: ScheduleTask) => void;
}

export default function TaskEditPanel({ task, allTasks, onClose, onSave }: TaskEditPanelProps) {
  const [editedTask, setEditedTask] = useState<ScheduleTask>(task);
  const [startDate, setStartDate] = useState(task.start);
  const [duration, setDuration] = useState(
    Math.ceil((new Date(task.end).getTime() - new Date(task.start).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  useEffect(() => {
    // Calculate end date when start or duration changes
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration - 1);
    
    setEditedTask(prev => ({
      ...prev,
      start: startDate,
      end: end.toISOString().split('T')[0]
    }));
  }, [startDate, duration]);

  const handleDependencyToggle = (taskId: string) => {
    const dependencyTask = allTasks.find(t => t.id === taskId);
    if (!dependencyTask) return;

    const exists = editedTask.dependencies.some(d => d.task_id === taskId);

    if (exists) {
      setEditedTask(prev => ({
        ...prev,
        dependencies: prev.dependencies.filter(d => d.task_id !== taskId)
      }));
    } else {
      const newDep: TaskDependency = {
        task_id: taskId,
        task_name: dependencyTask.name,
        task_type: dependencyTask.isChangeOrder ? 'change_order' : 'estimate',
        type: 'finish-to-start'
      };
      setEditedTask(prev => ({
        ...prev,
        dependencies: [...prev.dependencies, newDep]
      }));
    }
  };

  const handleSave = () => {
    onSave(editedTask);
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Task Name */}
          <div>
            <Label>Task Name</Label>
            <Input value={editedTask.name} disabled className="bg-muted" />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={editedTask.isChangeOrder ? "destructive" : "secondary"}>
                {editedTask.isChangeOrder ? 'Change Order' : editedTask.category}
              </Badge>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration">Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              className="mt-2"
            />
          </div>

          {/* End Date (Read-only) */}
          <div>
            <Label>End Date</Label>
            <Input 
              value={editedTask.end} 
              disabled 
              className="bg-muted mt-2"
            />
          </div>

          {/* Dependencies */}
          <div>
            <Label>Dependencies (Optional)</Label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Select tasks that must finish before this one can start
            </p>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {allTasks
                .filter(t => t.id !== task.id)
                .map(t => {
                  const isChecked = editedTask.dependencies.some(d => d.task_id === t.id);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleDependencyToggle(t.id)}
                    >
                      <Checkbox checked={isChecked} />
                      <div className="flex-1 text-sm">
                        {t.name}
                      </div>
                      <Badge 
                        variant={t.isChangeOrder ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {t.isChangeOrder ? 'CO' : t.category.substring(0, 3).toUpperCase()}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Hint Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>💡 Tips:</strong> Dependencies are optional and flexible. 
              We'll show warnings for unusual sequences, but you're free to schedule however you need.
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Schedule Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={editedTask.notes || ''}
              onChange={(e) => setEditedTask(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special scheduling considerations..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

