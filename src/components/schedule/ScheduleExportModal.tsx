import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DatePicker } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Download, Table, Calendar, CalendarDays, Building2, FileText, Eye, X } from "lucide-react";
import { format } from "date-fns";
import { exportScheduleToCSV, exportScheduleToMSProject, exportScheduleByDay, exportAllProjectsSchedule } from '@/utils/scheduleExport';
import { exportGanttToPDF } from '@/utils/ganttPdfExport';
import { ScheduleTask } from '@/types/schedule';

interface ScheduleExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: ScheduleTask[];
  projectName: string;
  projectNumber?: string;
  clientName?: string;
  ganttContainerRef?: React.RefObject<HTMLDivElement>;
}

interface ExportOptions {
  format: 'csv' | 'ms-project' | 'daily-activity' | 'pdf';
  includeAllProjects: boolean;
  includeProgress: boolean;
  includeCosts: boolean;
  includeDependencies: boolean;
  includeNotes: boolean;
  sortBy: 'start_date' | 'category' | 'name';
  pdfDateRange: {
    start: Date | null;
    end: Date | null;
  };
  includeProjectHeader: boolean;
  includeTaskDetails: boolean;
}

export const ScheduleExportModal: React.FC<ScheduleExportModalProps> = ({
  isOpen,
  onClose,
  tasks,
  projectName,
  projectNumber,
  clientName,
  ganttContainerRef
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeAllProjects: false,
    includeProgress: true,
    includeCosts: true,
    includeDependencies: true,
    includeNotes: true,
    sortBy: 'start_date',
    pdfDateRange: {
      start: null,
      end: null
    },
    includeProjectHeader: true,
    includeTaskDetails: false
  });

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions({ ...exportOptions, ...updates });
  };

  const handlePreview = async () => {
    if (exportOptions.format !== 'pdf') {
      toast({
        title: "Preview Unavailable",
        description: "Preview is only available for PDF exports",
        variant: "destructive"
      });
      return;
    }

    if (!ganttContainerRef?.current) {
      toast({
        title: "PDF Preview Unavailable",
        description: "Gantt chart view is required for PDF preview. Please switch to Gantt view.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingPreview(true);
    
    try {
      const blob = await exportGanttToPDF({
        tasks,
        projectName,
        projectNumber,
        clientName,
        ganttContainer: ganttContainerRef.current,
        dateRange: exportOptions.pdfDateRange.start && exportOptions.pdfDateRange.end
          ? exportOptions.pdfDateRange
          : undefined,
        includeProjectHeader: exportOptions.includeProjectHeader,
        includeTaskDetails: exportOptions.includeTaskDetails,
        previewOnly: true
      });

      if (blob) {
        setPreviewBlob(blob);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Could not generate preview",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPreview(false);
    }
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

    // For PDF export, check if Gantt container is available
    if (exportOptions.format === 'pdf') {
      if (!ganttContainerRef?.current) {
        toast({
          title: "PDF Export Unavailable",
          description: "Gantt chart view is required for PDF export. Please switch to Gantt view.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsExporting(true);
    
    try {
      if (exportOptions.includeAllProjects) {
        // Export all projects (PDF not supported for all projects)
        if (exportOptions.format === 'pdf') {
          toast({
            title: "PDF Export Unavailable",
            description: "PDF export is only available for individual projects",
            variant: "destructive"
          });
          setIsExporting(false);
          return;
        }
        
        const result = await exportAllProjectsSchedule(exportOptions.format);
        
        toast({
          title: "✓ Export Complete",
          description: `Successfully exported ${result.projectCount} project${result.projectCount === 1 ? '' : 's'} with ${result.taskCount} task${result.taskCount === 1 ? '' : 's'}`,
          duration: 3000
        });
      } else {
        // Export single project
        if (exportOptions.format === 'pdf') {
          await exportGanttToPDF({
            tasks,
            projectName,
            projectNumber,
            clientName,
            ganttContainer: ganttContainerRef!.current!,
            dateRange: exportOptions.pdfDateRange.start && exportOptions.pdfDateRange.end
              ? exportOptions.pdfDateRange
              : undefined,
            includeProjectHeader: exportOptions.includeProjectHeader,
            includeTaskDetails: exportOptions.includeTaskDetails
          });

          toast({
            title: "✓ PDF Export Complete",
            description: `Successfully exported Gantt chart as PDF`,
            duration: 3000
          });
        } else if (exportOptions.format === 'ms-project') {
          exportScheduleToMSProject(tasks, projectName);
          toast({
            title: "✓ Export Complete",
            description: `Successfully exported ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
            duration: 3000
          });
        } else if (exportOptions.format === 'daily-activity') {
          exportScheduleByDay(tasks, projectName);
          toast({
            title: "✓ Export Complete",
            description: `Successfully exported ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
            duration: 3000
          });
        } else {
          exportScheduleToCSV(tasks, projectName, exportOptions);
          toast({
            title: "✓ Export Complete",
            description: `Successfully exported ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
            duration: 3000
          });
        }
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
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0 overflow-hidden">
          <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Export Project Schedule</span>
            </SheetTitle>
            <SheetDescription>
              Choose export format and options for your project schedule
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
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
                    <SelectItem value="pdf">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>PDF - Gantt Chart</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {exportOptions.format === 'ms-project' 
                    ? 'Compatible with MS Project and Primavera'
                    : exportOptions.format === 'daily-activity'
                    ? 'Day-by-day breakdown of all active tasks, starts, and ends'
                    : exportOptions.format === 'pdf'
                    ? 'Export Gantt chart as PDF (landscape, optimized for printing)'
                    : 'Opens in Excel, Google Sheets, or any spreadsheet app'}
                </p>
              </div>

              {/* PDF Date Range Selection */}
              {exportOptions.format === 'pdf' && !exportOptions.includeAllProjects && (
                <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-sm font-medium">Date Range (Optional)</Label>
                  <p className="text-xs text-blue-800 mb-2">
                    Select a date range to filter tasks. Only tasks in this period will be included. Leave empty to export all tasks.
                  </p>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 flex-1 justify-start text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {exportOptions.pdfDateRange.start 
                            ? format(exportOptions.pdfDateRange.start, "MMM dd, yyyy")
                            : "Start Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePicker
                          mode="single"
                          selected={exportOptions.pdfDateRange.start || undefined}
                          onSelect={(date) => setExportOptions({
                            ...exportOptions,
                            pdfDateRange: { ...exportOptions.pdfDateRange, start: date || null }
                          })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 flex-1 justify-start text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {exportOptions.pdfDateRange.end 
                            ? format(exportOptions.pdfDateRange.end, "MMM dd, yyyy")
                            : "End Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePicker
                          mode="single"
                          selected={exportOptions.pdfDateRange.end || undefined}
                          onSelect={(date) => setExportOptions({
                            ...exportOptions,
                            pdfDateRange: { ...exportOptions.pdfDateRange, end: date || null }
                          })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {(exportOptions.pdfDateRange.start || exportOptions.pdfDateRange.end) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setExportOptions({
                        ...exportOptions,
                        pdfDateRange: { start: null, end: null }
                      })}
                    >
                      Clear Date Range
                    </Button>
                  )}
                </div>
              )}

              {/* PDF Export Options */}
              {exportOptions.format === 'pdf' && !exportOptions.includeAllProjects && (
                <div className="space-y-3">
                  <Label>PDF Content Options</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose what to include in your PDF export. The Gantt chart is always included.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="projectHeader"
                        checked={exportOptions.includeProjectHeader}
                        onCheckedChange={(checked) => setExportOptions({ 
                          ...exportOptions, 
                          includeProjectHeader: !!checked 
                        })}
                      />
                      <label htmlFor="projectHeader" className="text-sm cursor-pointer">
                        Include Project Header (project name, number, client, export date)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="taskDetails"
                        checked={exportOptions.includeTaskDetails}
                        onCheckedChange={(checked) => setExportOptions({ 
                          ...exportOptions, 
                          includeTaskDetails: !!checked 
                        })}
                      />
                      <label htmlFor="taskDetails" className="text-sm cursor-pointer">
                        Include Task Notes Table (notes on separate page)
                      </label>
                    </div>
                  </div>
                </div>
              )}

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
          </div>
          
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isExporting || isGeneratingPreview}
            >
              Cancel
            </Button>

            {exportOptions.format === 'pdf' && !exportOptions.includeAllProjects && (
              <Button
                variant="secondary"
                onClick={handlePreview}
                disabled={isExporting || isGeneratingPreview || !ganttContainerRef?.current}
              >
                {isGeneratingPreview ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
            )}
            
            <Button
              onClick={handleExport}
              disabled={isExporting || isGeneratingPreview || (tasks.length === 0 && exportOptions.format !== 'pdf') || (exportOptions.format === 'pdf' && !ganttContainerRef?.current)}
            >
              {isExporting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* PDF Preview Dialog - Higher z-index to appear above Sheet */}
      <Dialog open={showPreview} onOpenChange={setShowPreview} modal={true}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 !z-[60]" data-preview-dialog>
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>PDF Preview</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewBlob && (
              <iframe
                src={URL.createObjectURL(previewBlob)}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
