import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Table, Calendar, CalendarDays, Building2 } from "lucide-react";
import { exportScheduleToCSV, exportScheduleToMSProject, exportScheduleByDay, exportAllProjectsSchedule } from '@/utils/scheduleExport';
import { ScheduleTask } from '@/types/schedule';

interface ScheduleExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: ScheduleTask[];
  projectName: string;
}

interface ExportOptions {
  format: 'csv' | 'ms-project' | 'daily-activity';
  includeAllProjects: boolean;
  includeProgress: boolean;
  includeCosts: boolean;
  includeDependencies: boolean;
  includeNotes: boolean;
  sortBy: 'start_date' | 'category' | 'name';
}

export const ScheduleExportModal: React.FC<ScheduleExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projectName
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeAllProjects: false,
    includeProgress: true,
    includeCosts: true,
    includeDependencies: true,
    includeNotes: true,
    sortBy: 'start_date'
  });

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions({ ...exportOptions, ...updates });
  };

  const handleExport = async () => {
    // If exporting all projects, don't need current project tasks
    if (!exportOptions.includeAllProjects && tasks.length === 0) {
      toast({
        title: "No Tasks to Export",
        description: "The schedule has no tasks to export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    
    try {
      if (exportOptions.includeAllProjects) {
        // Export all projects
        const result = await exportAllProjectsSchedule(exportOptions.format);
        
        toast({
          title: "✓ Export Complete",
          description: `Successfully exported ${result.projectCount} project${result.projectCount === 1 ? '' : 's'} with ${result.taskCount} task${result.taskCount === 1 ? '' : 's'}`,
          duration: 3000
        });
      } else {
        // Export single project
        if (exportOptions.format === 'ms-project') {
          exportScheduleToMSProject(tasks, projectName);
        } else if (exportOptions.format === 'daily-activity') {
          exportScheduleByDay(tasks, projectName);
        } else {
          exportScheduleToCSV(tasks, projectName, exportOptions);
        }

        toast({
          title: "✓ Export Complete",
          description: `Successfully exported ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
          duration: 3000
        });
      }

      onClose();
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "✗ Export Failed",
        description: error instanceof Error ? error.message : "There was an error exporting the schedule",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Project Schedule</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* All Projects Checkbox */}
          <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allProjects"
                checked={exportOptions.includeAllProjects}
                onCheckedChange={(checked) => updateOptions({ includeAllProjects: !!checked })}
              />
              <label htmlFor="allProjects" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Export All Projects
              </label>
            </div>
            <p className="text-xs text-amber-800 ml-6">
              {exportOptions.includeAllProjects 
                ? 'Will export schedules from all active projects with approved estimates/change orders'
                : `Exporting current project only (${tasks.length} task${tasks.length === 1 ? '' : 's'})`}
            </p>
          </div>

          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select 
              value={exportOptions.format} 
              onValueChange={(value) => updateOptions({ format: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center space-x-2">
                    <Table className="h-4 w-4" />
                    <span>CSV - Task List</span>
                  </div>
                </SelectItem>
                <SelectItem value="daily-activity">
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>Daily Activity Schedule</span>
                  </div>
                </SelectItem>
                <SelectItem value="ms-project">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Microsoft Project Format</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {exportOptions.format === 'ms-project' 
                ? 'Compatible with MS Project and Primavera'
                : exportOptions.format === 'daily-activity'
                ? 'Day-by-day breakdown of all active tasks, starts, and ends'
                : 'Opens in Excel, Google Sheets, or any spreadsheet app'}
            </p>
          </div>

          {/* Sort Order */}
          {exportOptions.format === 'csv' && (
            <div className="space-y-2">
              <Label>Sort Tasks By</Label>
              <Select 
                value={exportOptions.sortBy} 
                onValueChange={(value) => updateOptions({ sortBy: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start_date">Start Date (Chronological)</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="name">Task Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Include Options - Only for CSV */}
          {exportOptions.format === 'csv' && (
            <div className="space-y-3">
              <Label>Include in Export</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="progress"
                    checked={exportOptions.includeProgress}
                    onCheckedChange={(checked) => updateOptions({ includeProgress: !!checked })}
                  />
                  <label htmlFor="progress" className="text-sm cursor-pointer">
                    Progress & Status
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="costs"
                    checked={exportOptions.includeCosts}
                    onCheckedChange={(checked) => updateOptions({ includeCosts: !!checked })}
                  />
                  <label htmlFor="costs" className="text-sm cursor-pointer">
                    Cost Information
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dependencies"
                    checked={exportOptions.includeDependencies}
                    onCheckedChange={(checked) => updateOptions({ includeDependencies: !!checked })}
                  />
                  <label htmlFor="dependencies" className="text-sm cursor-pointer">
                    Task Dependencies
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes"
                    checked={exportOptions.includeNotes}
                    onCheckedChange={(checked) => updateOptions({ includeNotes: !!checked })}
                  />
                  <label htmlFor="notes" className="text-sm cursor-pointer">
                    Notes & Comments
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || tasks.length === 0}
          >
            {isExporting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Schedule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

