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
import { parseDateOnly } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";

interface TimeEntryExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: TimeEntryListItem[];
  filters: TimeEntryFilters;
  totalCount: number;
}

interface ExportOptions {
  format: 'csv';
  includeWorkerDetails: boolean;
  includeProjectDetails: boolean;
  includeTimeBreakdown: boolean;
  includeNotes: boolean;
  exportScope: 'current_page' | 'all_filtered';
}

export const TimeEntryExportModal: React.FC<TimeEntryExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  filters,
  totalCount
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeWorkerDetails: true,
    includeProjectDetails: true,
    includeTimeBreakdown: true,
    includeNotes: true,
    exportScope: 'current_page'
  });

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions({ ...exportOptions, ...updates });
  };

  const calculateHours = (
    startTime: string | null,
    endTime: string | null,
    description: string,
    lunchTaken: boolean,
    lunchDurationMinutes: number | null
  ): number => {
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const grossHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const lunchHours = lunchTaken && lunchDurationMinutes ? lunchDurationMinutes / 60 : 0;
      return Math.max(0, grossHours - lunchHours);
    }
    const timeMatch = description?.match(/(\d+\.?\d*)\s*hours?/i);
    return timeMatch ? parseFloat(timeMatch[1]) : 0;
  };

  const fetchAllFilteredEntries = async (): Promise<TimeEntryListItem[]> => {
    let query = supabase
      .from('expenses')
      .select(`
        id,
        expense_date,
        start_time,
        end_time,
        amount,
        description,
        approval_status,
        rejection_reason,
        created_at,
        submitted_for_approval_at,
        approved_at,
        approved_by,
        user_id,
        payee_id,
        project_id,
        attachment_url,
        is_locked,
        lunch_taken,
        lunch_duration_minutes,
        payees!inner(payee_name, hourly_rate, employee_number),
        projects!inner(project_number, project_name, client_name, address)
      `)
      .eq('category', 'labor_internal')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.dateFrom) query = query.gte('expense_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('expense_date', filters.dateTo);
    if (filters.status.length > 0) query = query.in('approval_status', filters.status);
    if (filters.workerIds.length > 0) query = query.in('payee_id', filters.workerIds);
    if (filters.projectIds.length > 0) query = query.in('project_id', filters.projectIds);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((entry: any) => {
      const lunchTaken = entry.lunch_taken || false;
      const lunchDurationMinutes = entry.lunch_duration_minutes ?? null;
      const hours = calculateHours(
        entry.start_time,
        entry.end_time,
        entry.description,
        lunchTaken,
        lunchDurationMinutes
      );
      const grossHours =
        entry.start_time && entry.end_time
          ? (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60)
          : hours;

      return {
        id: entry.id,
        expense_date: entry.expense_date,
        start_time: entry.start_time,
        end_time: entry.end_time,
        amount: entry.amount,
        description: entry.description,
        approval_status: entry.approval_status,
        rejection_reason: entry.rejection_reason,
        created_at: entry.created_at,
        submitted_for_approval_at: entry.submitted_for_approval_at,
        approved_at: entry.approved_at,
        approved_by: entry.approved_by,
        user_id: entry.user_id,
        worker_name: entry.payees?.payee_name ?? 'Unknown',
        project_number: entry.projects?.project_number ?? '',
        project_name: entry.projects?.project_name ?? '',
        client_name: entry.projects?.client_name ?? '',
        project_address: entry.projects?.address ?? null,
        hours,
        hourly_rate: entry.payees?.hourly_rate ?? 0,
        note: entry.description,
        attachment_url: entry.attachment_url,
        payee_id: entry.payee_id,
        project_id: entry.project_id,
        is_locked: entry.is_locked,
        lunch_taken: lunchTaken,
        lunch_duration_minutes: lunchDurationMinutes,
        gross_hours: grossHours,
        payee: entry.payees ? { employee_number: entry.payees.employee_number } : undefined,
      };
    });
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let entriesToExport = entries;

      if (exportOptions.exportScope === 'all_filtered') {
        toast({
          title: "Fetching entries",
          description: `Loading all ${totalCount} filtered entries...`,
        });
        entriesToExport = await fetchAllFilteredEntries();
      }

      if (entriesToExport.length === 0) {
        toast({
          title: "No data to export",
          description: "No time entries match the current filters.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      await exportToCSV(entriesToExport);

      toast({
        title: "Export successful",
        description: `Successfully exported ${entriesToExport.length} time entries`,
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
    const headers: string[] = ["Work Date"];

    if (exportOptions.includeWorkerDetails) {
      headers.push("Worker");
    }

    if (exportOptions.includeProjectDetails) {
      headers.push("Project Number", "Project Name", "Client", "Project Address");
    }

    if (exportOptions.includeTimeBreakdown) {
      headers.push("Start Time", "End Time", "Gross Hours", "Lunch Taken", "Lunch Duration (min)", "Net Hours");
    }

    headers.push("Rate", "Amount", "Status");

    if (exportOptions.includeNotes) {
      headers.push("Notes");
    }

    headers.push("Created At", "Submitted At", "Approved At");

    // Build rows
    const rows = entries.map((entry) => {
      const entryDate = parseDateOnly(entry.expense_date);
      const startTime = entry.start_time ? format(new Date(entry.start_time), "HH:mm") : "";
      const endTime = entry.end_time ? format(new Date(entry.end_time), "HH:mm") : "";
      const createdAt = entry.created_at
        ? format(new Date(entry.created_at), "yyyy-MM-dd HH:mm")
        : "";
      const submittedAt = entry.submitted_for_approval_at
        ? format(new Date(entry.submitted_for_approval_at), "yyyy-MM-dd HH:mm")
        : "";
      const approvedAt = entry.approved_at
        ? format(new Date(entry.approved_at), "yyyy-MM-dd HH:mm")
        : "";

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
        const grossHours = entry.gross_hours != null ? entry.gross_hours.toFixed(2) : entry.hours.toFixed(2);
        const lunchTaken = entry.lunch_taken ? "Yes" : "No";
        const lunchDuration = entry.lunch_taken ? (entry.lunch_duration_minutes?.toString() ?? "") : "";
        const netHours = entry.hours.toFixed(2);
        row.push(startTime, endTime, grossHours, lunchTaken, lunchDuration, netHours);
      }

      row.push(
        entry.hourly_rate.toFixed(2),
        entry.amount.toFixed(2),
        entry.approval_status || "pending"
      );

      if (exportOptions.includeNotes) {
        row.push(entry.note || "");
      }

      row.push(createdAt, submittedAt, approvedAt);

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

            {/* Export Scope */}
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">Export Scope</label>
              <Select
                value={exportOptions.exportScope}
                onValueChange={(value) => updateOptions({ exportScope: value as 'current_page' | 'all_filtered' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_page">
                    Current Page Only ({entries.length} entries)
                  </SelectItem>
                  <SelectItem value="all_filtered">
                    All Filtered Entries ({totalCount} total)
                  </SelectItem>
                </SelectContent>
              </Select>
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
            disabled={
              isExporting ||
              (exportOptions.exportScope === 'current_page' ? entries.length === 0 : totalCount === 0)
            }
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
                Export {exportOptions.exportScope === 'current_page' ? entries.length : totalCount} Entries
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

