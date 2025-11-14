import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { TimeEntryListItem, TimeEntryFilters } from "@/types/timeEntry";

interface TimeEntryExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: TimeEntryListItem[];
  filters: TimeEntryFilters;
}

interface ExportOptions {
  format: 'csv';
  includeWorkerDetails: boolean;
  includeProjectDetails: boolean;
  includeTimeBreakdown: boolean;
  includeNotes: boolean;
}

export const TimeEntryExportModal: React.FC<TimeEntryExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  filters
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeWorkerDetails: true,
    includeProjectDetails: true,
    includeTimeBreakdown: true,
    includeNotes: true
  });

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions({ ...exportOptions, ...updates });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      if (entries.length === 0) {
        toast({
          title: "No data to export",
          description: "No time entries match the current filters.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      await exportToCSV(entries);
      
      toast({
        title: "Export successful",
        description: `Successfully exported ${entries.length} time entries`,
      });

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async (entries: TimeEntryListItem[]) => {
    // Build headers based on options
    const headers: string[] = ["Date"];

    if (exportOptions.includeWorkerDetails) {
      headers.push("Worker");
    }

    if (exportOptions.includeProjectDetails) {
      headers.push("Project Number", "Project Name", "Client", "Project Address");
    }

    if (exportOptions.includeTimeBreakdown) {
      headers.push("Start Time", "End Time", "Hours");
    }

    headers.push("Rate", "Amount", "Status");

    if (exportOptions.includeNotes) {
      headers.push("Notes");
    }

    headers.push("Submitted At");

    // Build rows
    const rows = entries.map((entry) => {
      const entryDate = new Date(entry.expense_date + "T12:00:00");
      const startTime = entry.start_time ? format(new Date(entry.start_time), "HH:mm") : "";
      const endTime = entry.end_time ? format(new Date(entry.end_time), "HH:mm") : "";
      const submittedAt = format(new Date(entry.created_at), "yyyy-MM-dd HH:mm");

      const row: string[] = [format(entryDate, "yyyy-MM-dd")];

      if (exportOptions.includeWorkerDetails) {
        row.push(entry.worker_name);
      }

      if (exportOptions.includeProjectDetails) {
        row.push(
          entry.project_number,
          entry.project_name,
          entry.client_name,
          entry.project_address || ""
        );
      }

      if (exportOptions.includeTimeBreakdown) {
        row.push(startTime, endTime, entry.hours.toFixed(2));
      }

      row.push(
        entry.hourly_rate.toFixed(2),
        entry.amount.toFixed(2),
        entry.approval_status || "pending"
      );

      if (exportOptions.includeNotes) {
        row.push(entry.note || "");
      }

      row.push(submittedAt);

      return row;
    });

    // Convert to CSV
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `time-entries-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Time Entries</span>
          </SheetTitle>
          <SheetDescription>
            Configure export options and download time entry data matching your filters
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 px-6 py-4">
            {/* Active Filters Summary */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {filters.status.length > 0 && (
                  <Badge variant="secondary">Status: {filters.status.join(', ')}</Badge>
                )}
                {filters.workerIds.length > 0 && (
                  <Badge variant="secondary">Workers: {filters.workerIds.length} selected</Badge>
                )}
                {filters.projectIds.length > 0 && (
                  <Badge variant="secondary">Projects: {filters.projectIds.length} selected</Badge>
                )}
                {(filters.dateFrom || filters.dateTo) && (
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    Date Range
                  </Badge>
                )}
                {entries.length > 0 && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <Clock className="h-3 w-3 mr-1" />
                    {entries.length} entries ({entries.reduce((sum, e) => sum + e.hours, 0).toFixed(1)} hours)
                  </Badge>
                )}
              </div>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={exportOptions.format} onValueChange={(value) => updateOptions({ format: value as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Options */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Include in Export</label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="workerDetails"
                    checked={exportOptions.includeWorkerDetails}
                    onCheckedChange={(checked) => updateOptions({ includeWorkerDetails: !!checked })}
                  />
                  <label htmlFor="workerDetails" className="text-sm cursor-pointer">Worker Details</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="projectDetails"
                    checked={exportOptions.includeProjectDetails}
                    onCheckedChange={(checked) => updateOptions({ includeProjectDetails: !!checked })}
                  />
                  <label htmlFor="projectDetails" className="text-sm cursor-pointer">Project Details</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="timeBreakdown"
                    checked={exportOptions.includeTimeBreakdown}
                    onCheckedChange={(checked) => updateOptions({ includeTimeBreakdown: !!checked })}
                  />
                  <label htmlFor="timeBreakdown" className="text-sm cursor-pointer">Time Breakdown (Start/End Times)</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes"
                    checked={exportOptions.includeNotes}
                    onCheckedChange={(checked) => updateOptions({ includeNotes: !!checked })}
                  />
                  <label htmlFor="notes" className="text-sm cursor-pointer">Notes</label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t flex space-x-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || entries.length === 0}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {entries.length} Entries
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

