import React, { useState, useEffect } from 'react';
import { ScheduleTask, TaskDependency, SchedulePhase } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskEditPanelProps {
  task: ScheduleTask;
  allTasks: ScheduleTask[];
  onClose: () => void;
  onSave: (task: ScheduleTask) => void;
}

export default function TaskEditPanel({ task, allTasks, onClose, onSave }: TaskEditPanelProps) {
  const [editedTask, setEditedTask] = useState<ScheduleTask>(task);
  const [phases, setPhases] = useState<SchedulePhase[]>([]);
  const [taskNotes, setTaskNotes] = useState('');
  const [singleStartDate, setSingleStartDate] = useState(task.start);
  const [singleDuration, setSingleDuration] = useState(
    Math.ceil((new Date(task.end).getTime() - new Date(task.start).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // Initialize phases and notes from task
  useEffect(() => {
    // Parse schedule_notes to extract phases and task-level notes
    let extractedPhases: any[] = [];
    let extractedNotes = '';
    
    if (task.schedule_notes) {
      try {
        const parsed = JSON.parse(task.schedule_notes);
        if (parsed.phases && Array.isArray(parsed.phases)) {
          extractedPhases = parsed.phases;
        }
        if (typeof parsed.notes === 'string') {
          extractedNotes = parsed.notes;
        }
      } catch (e) {
        // Not JSON - treat as plain text notes
        extractedNotes = task.schedule_notes;
      }
    }
    
    setPhases(extractedPhases);
    setTaskNotes(extractedNotes);
  }, [task]);

  // Update end date when single start/duration changes
  useEffect(() => {
    if (phases.length === 0) {
      const start = new Date(singleStartDate);
      const end = new Date(start);
      end.setDate(end.getDate() + singleDuration - 1);
      
      setEditedTask(prev => ({
        ...prev,
        start: singleStartDate,
        end: end.toISOString().split('T')[0]
      }));
    }
  }, [singleStartDate, singleDuration, phases.length]);

  const addPhase = () => {
    const lastPhase = phases[phases.length - 1];
    const newPhaseNumber = phases.length + 1;
    
    // Default to starting after last phase
    let startDate: string;
    if (lastPhase) {
      const lastEnd = new Date(lastPhase.end_date);
      lastEnd.setDate(lastEnd.getDate() + 1);
      startDate = lastEnd.toISOString().split('T')[0];
    } else {
      startDate = singleStartDate;
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // 7 days default
    
    setPhases([...phases, {
      phase_number: newPhaseNumber,
      start_date: startDate,
      end_date: endDate.toISOString().split('T')[0],
      duration_days: 7,
      description: ''
    }]);
  };

  const removePhase = (index: number) => {
    const updated = phases.filter((_, i) => i !== index);
    // Renumber phases
    const renumbered = updated.map((p, i) => ({ ...p, phase_number: i + 1 }));
    setPhases(renumbered);
  };

  const updatePhase = (index: number, field: keyof SchedulePhase, value: any) => {
    const updated = [...phases];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate duration if dates change
    if (field === 'start_date' || field === 'end_date') {
      const start = new Date(updated[index].start_date);
      const end = new Date(updated[index].end_date);
      updated[index].duration_days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    setPhases(updated);
  };

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
    try {
      let finalTask = { ...editedTask };
      
      if (phases.length > 0) {
        // Multi-phase: Calculate overall dates and serialize phases with notes
        const sortedPhases = [...phases].sort((a, b) => a.phase_number - b.phase_number);
        finalTask.start = sortedPhases[0].start_date;
        finalTask.end = sortedPhases[sortedPhases.length - 1].end_date;
        finalTask.phases = sortedPhases;
        finalTask.has_multiple_phases = phases.length > 1;
        
        // Serialize phases AND task-level notes to schedule_notes as JSON
        finalTask.schedule_notes = JSON.stringify({ 
          phases: sortedPhases,
          notes: taskNotes || undefined
        });
      } else {
        // Single phase: Clear phases and use simple dates
        finalTask.phases = undefined;
        finalTask.has_multiple_phases = false;
        
        // Store completion status AND task-level notes in schedule_notes
        finalTask.schedule_notes = JSON.stringify({ 
          completed: editedTask.completed || false,
          notes: taskNotes || undefined
        });
      }
      
      onSave(finalTask);
      toast.success(phases.length > 1
          ? `Task scheduled with ${phases.length} phases`
          : 'Task schedule updated');
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task schedule');
    }
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Edit Task Schedule</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Task Name */}
          <div>
            <Label className="text-xs">Task Name</Label>
            <Input value={editedTask.name} disabled className="bg-muted h-8 text-xs" />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs">Category</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={editedTask.isChangeOrder ? "destructive" : "secondary"} className="text-[10px]">
                {editedTask.isChangeOrder ? 'Change Order' : editedTask.category}
              </Badge>
            </div>
          </div>

          {/* Schedule Type Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Multiple Phases?</Label>
              <Button
                size="sm"
                variant={phases.length > 0 ? "default" : "outline"}
                onClick={() => {
                  if (phases.length === 0) {
                    addPhase();
                  } else {
                    setPhases([]);
                  }
                }}
                className="h-7 text-xs"
              >
                {phases.length > 0 ? 'Use Single Schedule' : 'Add Phases'}
              </Button>
            </div>
            <p className="text-xs text-blue-900">
              {phases.length > 0 
                ? `Task has ${phases.length} phase(s). Workers will return multiple times.`
                : 'Task scheduled for one continuous period.'
              }
            </p>
          </div>

          {/* Single Phase Inputs */}
          {phases.length === 0 && (
            <>
              <div>
                <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={singleStartDate}
                  onChange={(e) => setSingleStartDate(e.target.value)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="duration" className="text-xs">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={singleDuration}
                  onChange={(e) => setSingleDuration(parseInt(e.target.value) || 1)}
                  className="mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">End Date</Label>
                <Input 
                  value={editedTask.end} 
                  disabled 
                  className="bg-muted mt-1 h-8 text-xs"
                />
              </div>
              
              {/* Completion checkbox for single-phase tasks */}
              <div 
                className="flex items-center gap-2 cursor-pointer" 
                onClick={() => {
                  setEditedTask(prev => ({ ...prev, completed: !prev.completed }));
                }}
              >
                <Checkbox checked={editedTask.completed || false} className="h-3 w-3" />
                <Label className="text-xs cursor-pointer">Mark as Complete</Label>
              </div>
            </>
          )}

          {/* Multi-Phase Inputs */}
          {phases.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Schedule Phases</Label>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={addPhase}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Phase
                </Button>
              </div>
              
              {phases.map((phase, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-[10px]">Phase {phase.phase_number}</Badge>
                    {phases.length > 1 && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => removePhase(idx)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Description (Optional)</Label>
                      <Input 
                        placeholder="e.g., Primer coat"
                        value={phase.description || ''}
                        onChange={(e) => updatePhase(idx, 'description', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Start Date</Label>
                        <Input 
                          type="date"
                          value={phase.start_date}
                          onChange={(e) => updatePhase(idx, 'start_date', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Date</Label>
                        <Input 
                          type="date"
                          value={phase.end_date}
                          onChange={(e) => updatePhase(idx, 'end_date', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Duration: {phase.duration_days} days
                      </div>
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => updatePhase(idx, 'completed', !phase.completed)}
                      >
                        <Checkbox 
                          checked={phase.completed || false}
                          className="h-3 w-3"
                        />
                        <Label className="text-xs cursor-pointer">Complete</Label>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Dependencies */}
          <div>
            <Label className="text-xs">Dependencies (Optional)</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Select tasks that must finish before this one can start
            </p>
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {allTasks
                .filter(t => t.id !== task.id)
                .map(t => {
                  const isChecked = editedTask.dependencies.some(d => d.task_id === t.id);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleDependencyToggle(t.id)}
                    >
                      <Checkbox checked={isChecked} className="h-3 w-3" />
                      <div className="flex-1 text-xs truncate">
                        {t.name}
                      </div>
                      <Badge 
                        variant={t.isChangeOrder ? "outline" : "secondary"}
                        className="text-[9px] px-1 py-0 h-4"
                      >
                        {t.isChangeOrder ? 'CO' : t.category.substring(0, 3).toUpperCase()}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Task-Level Notes (available for both single and multi-phase) */}
          <div>
            <Label htmlFor="notes" className="text-xs">Task Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Any special scheduling considerations or general notes about this task..."
              className="mt-1 text-xs"
              rows={2}
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button onClick={handleSave} size="sm">
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
