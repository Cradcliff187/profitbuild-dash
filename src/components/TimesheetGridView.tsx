import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, addDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProjectSelectorNew } from "@/components/ProjectSelectorNew";
import { PayeeSelector } from "@/components/PayeeSelector";
import { TimesheetGridCell } from "@/components/TimesheetGridCell";
import { TimesheetWeekSelector } from "@/components/TimesheetWeekSelector";
import { TimesheetSummary } from "@/components/TimesheetSummary";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Payee, PayeeType } from "@/types/payee";
import { Project } from "@/types/project";
import { useQuery } from "@tanstack/react-query";

interface TimesheetEntry {
  workerId: string;
  workerName: string;
  hourlyRate: number;
  hours: Record<string, number | null>;
}

interface ValidationError {
  type: 'error' | 'warning' | 'info';
  message: string;
  rowIndex: number;
}

interface TimesheetGridViewProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedProjectId?: string;
}

export function TimesheetGridView({ open, onClose, onSuccess, preselectedProjectId }: TimesheetGridViewProps) {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState(preselectedProjectId || "");
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(addDays(startDate, 4));
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [showPayeeSelector, setShowPayeeSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("project_name");
      
      if (error) throw error;
      return data;
    },
  }) as { data: Project[] };

  const { data: internalPayees = [] } = useQuery({
    queryKey: ["payees-internal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payees")
        .select("*")
        .eq("is_active", true)
        .eq("is_internal", true)
        .eq("provides_labor", true)
        .order("payee_name");
      
      if (error) throw error;
      return data as Payee[];
    },
  });

  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  const workDates = dates.filter(date => !isWeekend(date));

  useEffect(() => {
    if (preselectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === preselectedProjectId);
      if (project) {
        setProjectId(preselectedProjectId);
        setSelectedProject(project);
      }
    }
  }, [preselectedProjectId, projects]);

  const updateHours = (workerId: string, date: string, hours: number | null) => {
    setEntries(prev => prev.map(entry =>
      entry.workerId === workerId
        ? { ...entry, hours: { ...entry.hours, [date]: hours } }
        : entry
    ));
  };

  const addWorker = (payeeId: string) => {
    const payee = internalPayees.find(p => p.id === payeeId);
    if (!payee) return;

    const initialHours: Record<string, number | null> = {};
    dates.forEach(date => {
      initialHours[format(date, 'yyyy-MM-dd')] = null;
    });

    setEntries(prev => [...prev, {
      workerId: payee.id,
      workerName: payee.payee_name,
      hourlyRate: payee.hourly_rate || 0,
      hours: initialHours
    }]);
    setShowPayeeSelector(false);
  };

  const removeWorker = (workerId: string) => {
    setEntries(prev => prev.filter(entry => entry.workerId !== workerId));
  };

  const validateTimesheet = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    entries.forEach((entry, index) => {
      const totalHours = Object.values(entry.hours).reduce((sum, h) => sum + (h || 0), 0);
      
      if (totalHours === 0) {
        errors.push({
          type: 'warning',
          message: `${entry.workerName} has no hours entered`,
          rowIndex: index
        });
      }

      if (!entry.hourlyRate || entry.hourlyRate === 0) {
        errors.push({
          type: 'error',
          message: `${entry.workerName} has no hourly rate set`,
          rowIndex: index
        });
      }

      Object.entries(entry.hours).forEach(([date, hours]) => {
        if (hours && hours > 12) {
          errors.push({
            type: 'warning',
            message: `${entry.workerName} has ${hours} hours on ${format(new Date(date), 'MMM d')}`,
            rowIndex: index
          });
        }
      });
    });

    return errors;
  };

  const handleSaveTimesheet = async () => {
    if (!projectId) {
      toast({
        title: "Project Required",
        description: "Please select a project before saving",
        variant: "destructive"
      });
      return;
    }

    const errors = validateTimesheet();
    setValidationErrors(errors);
    
    const criticalErrors = errors.filter(e => e.type === 'error');
    if (criticalErrors.length > 0) {
      toast({
        title: "Cannot Save",
        description: `Please fix ${criticalErrors.length} error(s) before saving`,
        variant: "destructive"
      });
      return;
    }

    const expenseRecords: any[] = [];
    
    entries.forEach(entry => {
      Object.entries(entry.hours).forEach(([date, hours]) => {
        if (hours && hours > 0) {
          expenseRecords.push({
            project_id: projectId,
            payee_id: entry.workerId,
            category: 'labor_internal',
            transaction_type: 'expense',
            amount: hours * entry.hourlyRate,
            expense_date: date,
            description: `Internal Labor - ${entry.workerName} - ${format(new Date(date), 'MMM d, yyyy')} - ${hours}hrs`,
            is_planned: false
          });
        }
      });
    });

    if (expenseRecords.length === 0) {
      toast({
        title: "No Hours Entered",
        description: "Please enter hours before saving",
        variant: "destructive"
      });
      return;
    }

    const totalAmount = expenseRecords.reduce((sum, r) => sum + r.amount, 0);
    const confirmed = window.confirm(
      `Create ${expenseRecords.length} expense records totaling $${totalAmount.toFixed(2)}?`
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert(expenseRecords);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${expenseRecords.length} labor expenses created successfully`
      });

      onSuccess();
      onClose();
      setEntries([]);
      setProjectId("");
    } catch (error) {
      console.error('Error saving timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to save timesheet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    
    // Reset all hours for new date range
    const initialHours: Record<string, number | null> = {};
    eachDayOfInterval({ start, end }).forEach(date => {
      initialHours[format(date, 'yyyy-MM-dd')] = null;
    });
    
    setEntries(prev => prev.map(entry => ({
      ...entry,
      hours: initialHours
    })));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Timesheet - Week of {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Project & Date Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Project</label>
                <ProjectSelectorNew
                  projects={projects}
                  selectedProject={selectedProject}
                  onSelect={(project) => {
                    setProjectId(project.id);
                    setSelectedProject(project);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Period</label>
                <TimesheetWeekSelector
                  startDate={startDate}
                  endDate={endDate}
                  onChange={handleDateRangeChange}
                />
              </div>
            </div>

            {/* Timesheet Grid */}
            <div className="border rounded-md overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <table className="w-full text-xs min-w-[640px]">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium w-48">Worker</th>
                    <th className="text-right p-2 font-medium w-20">Rate</th>
                    {workDates.map(date => (
                      <th key={date.toISOString()} className="text-center p-2 font-medium w-20">
                        <div>{format(date, 'EEE')}</div>
                        <div className="text-muted-foreground font-normal">{format(date, 'M/d')}</div>
                      </th>
                    ))}
                    <th className="text-right p-2 font-medium w-20">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, rowIndex) => {
                    const totalHours = Object.values(entry.hours).reduce((sum, h) => sum + (h || 0), 0);
                    const totalCost = totalHours * entry.hourlyRate;
                    const hasError = validationErrors.some(e => e.rowIndex === rowIndex && e.type === 'error');

                    return (
                      <tr key={entry.workerId} className={`border-t hover:bg-muted/30 ${hasError ? 'bg-destructive/5' : ''}`}>
                        <td className="p-2 font-medium">{entry.workerName}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">
                          ${entry.hourlyRate.toFixed(0)}
                        </td>
                        {workDates.map(date => {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          return (
                            <td key={dateStr} className="p-1">
                              <TimesheetGridCell
                                value={entry.hours[dateStr] || null}
                                onChange={(hours) => updateHours(entry.workerId, dateStr, hours)}
                                workerId={entry.workerId}
                                date={date}
                                hourlyRate={entry.hourlyRate}
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 text-right font-mono font-medium">
                          {totalHours.toFixed(1)}
                        </td>
                        <td className="p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWorker(entry.workerId)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={2 + workDates.length + 2} className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPayeeSelector(true)}
                        className="h-7"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Worker
                      </Button>
                    </td>
                  </tr>
                </tbody>
                {entries.length > 0 && (
                  <tfoot className="border-t bg-muted/30">
                    <tr>
                      <td colSpan={2} className="p-2 font-medium text-xs">Daily Total:</td>
                      {workDates.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dailyHours = entries.reduce((sum, entry) => sum + (entry.hours[dateStr] || 0), 0);
                        return (
                          <td key={dateStr} className="p-2 text-center font-mono font-medium text-xs">
                            {dailyHours.toFixed(1)}
                          </td>
                        );
                      })}
                      <td className="p-2 text-right font-mono font-medium text-xs">
                        {entries.reduce((sum, entry) => 
                          sum + Object.values(entry.hours).reduce((s, h) => s + (h || 0), 0), 0
                        ).toFixed(1)}
                      </td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="p-2 font-medium text-xs">Daily Cost:</td>
                      {workDates.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dailyCost = entries.reduce((sum, entry) => 
                          sum + ((entry.hours[dateStr] || 0) * entry.hourlyRate), 0
                        );
                        return (
                          <td key={dateStr} className="p-2 text-center font-mono font-medium text-xs">
                            ${dailyCost.toFixed(0)}
                          </td>
                        );
                      })}
                      <td className="p-2 text-right font-mono font-medium text-xs">
                        ${entries.reduce((sum, entry) => 
                          sum + Object.values(entry.hours).reduce((s, h) => s + (h || 0), 0) * entry.hourlyRate, 0
                        ).toFixed(0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Summary & Validation */}
            {entries.length > 0 && (
              <TimesheetSummary
                entries={entries}
                validationErrors={validationErrors}
              />
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} size="sm">
                Cancel
              </Button>
              <Button onClick={handleSaveTimesheet} disabled={loading || entries.length === 0} size="sm">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Timesheet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payee Selector Dialog */}
      <Dialog open={showPayeeSelector} onOpenChange={setShowPayeeSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Internal Worker</DialogTitle>
          </DialogHeader>
          <PayeeSelector
            value=""
            onValueChange={(payeeId) => {
              addWorker(payeeId);
              setShowPayeeSelector(false);
            }}
            placeholder="Select internal worker..."
            showLabel={false}
            filterInternal={true}
            filterLabor={true}
            defaultPayeeType={PayeeType.INTERNAL_LABOR}
            defaultIsInternal={true}
            defaultProvidesLabor={true}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
