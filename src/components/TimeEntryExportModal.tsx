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
  includeWorker: boolean;
  includeEmployeeNumber: boolean;
  includeProjectNumber: boolean;
  includeProjectName: boolean;
  includeClient: boolean;
  includeProjectAddress: boolean;
  includeStartTime: boolean;
  includeEndTime: boolean;
  includeGrossHours: boolean;
  includeNetHours: boolean;
  includeLunchTaken: boolean;
  includeLunchDuration: boolean;
  includeHourlyRate: boolean;
  includeAmount: boolean;
  includeReceipt: boolean;
  includeStatus: boolean;
  includeNotes: boolean;
  includeCreatedAt: boolean;
  includeSubmittedAt: boolean;
  includeApprovedAt: boolean;
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
    includeWorker: true,
    includeEmployeeNumber: true,
    includeProjectNumber: true,
    includeProjectName: true,
    includeClient: true,
    includeProjectAddress: true,
    includeStartTime: true,
    includeEndTime: true,
    includeGrossHours: true,
    includeNetHours: true,
    includeLunchTaken: true,
    includeLunchDuration: true,
    includeHourlyRate: true,
    includeAmount: true,
    includeReceipt: true,
    includeStatus: true,
    includeNotes: true,
    includeCreatedAt: true,
    includeSubmittedAt: true,
    includeApprovedAt: true,
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
        gross_hours,
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
      const grossHours = entry.gross_hours ?? hours;

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
    // Build headers based on individual field options
    const headers: string[] = ["Work Date"];

    if (exportOptions.includeWorker) headers.push("Worker");
    if (exportOptions.includeEmployeeNumber) headers.push("Employee #");
    if (exportOptions.includeProjectNumber) headers.push("Project Number");
    if (exportOptions.includeProjectName) headers.push("Project Name");
    if (exportOptions.includeClient) headers.push("Client");
    if (exportOptions.includeProjectAddress) headers.push("Project Address");
    if (exportOptions.includeStartTime) headers.push("Start Time");
    if (exportOptions.includeEndTime) headers.push("End Time");
    if (exportOptions.includeGrossHours) headers.push("Gross Hours");
    if (exportOptions.includeNetHours) headers.push("Net Hours");
    if (exportOptions.includeLunchTaken) headers.push("Lunch Taken");
    if (exportOptions.includeLunchDuration) headers.push("Lunch Duration (min)");
    if (exportOptions.includeHourlyRate) headers.push("Hourly Rate");
    if (exportOptions.includeAmount) headers.push("Amount");
    if (exportOptions.includeReceipt) headers.push("Receipt");
    if (exportOptions.includeStatus) headers.push("Status");
    if (exportOptions.includeNotes) headers.push("Notes");
    if (exportOptions.includeCreatedAt) headers.push("Created At");
    if (exportOptions.includeSubmittedAt) headers.push("Submitted At");
    if (exportOptions.includeApprovedAt) headers.push("Approved At");

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

      if (exportOptions.includeWorker) row.push(entry.worker_name);
      if (exportOptions.includeEmployeeNumber) row.push(entry.payee?.employee_number || "");
      if (exportOptions.includeProjectNumber) row.push(entry.project_number);
      if (exportOptions.includeProjectName) row.push(entry.project_name);
      if (exportOptions.includeClient) row.push(entry.client_name);
      if (exportOptions.includeProjectAddress) row.push(entry.project_address || "");
      if (exportOptions.includeStartTime) row.push(startTime);
      if (exportOptions.includeEndTime) row.push(endTime);
      if (exportOptions.includeGrossHours) {
        const grossHours = entry.gross_hours != null ? entry.gross_hours.toFixed(2) : entry.hours.toFixed(2);
        row.push(grossHours);
      }
      if (exportOptions.includeNetHours) row.push(entry.hours.toFixed(2));
      if (exportOptions.includeLunchTaken) row.push(entry.lunch_taken ? "Yes" : "No");
      if (exportOptions.includeLunchDuration) {
        const lunchDuration = entry.lunch_taken ? (entry.lunch_duration_minutes?.toString() ?? "") : "";
        row.push(lunchDuration);
      }
      if (exportOptions.includeHourlyRate) row.push(entry.hourly_rate.toFixed(2));
      if (exportOptions.includeAmount) row.push(entry.amount.toFixed(2));
      if (exportOptions.includeReceipt) row.push(entry.attachment_url ? "Yes" : "No");
      if (exportOptions.includeStatus) row.push(entry.approval_status || "pending");
      if (exportOptions.includeNotes) row.push(entry.note || "");
      if (exportOptions.includeCreatedAt) row.push(createdAt);
      if (exportOptions.includeSubmittedAt) row.push(submittedAt);
      if (exportOptions.includeApprovedAt) row.push(approvedAt);

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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Fields to Export</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allTrue = Object.keys(exportOptions).reduce((acc, key) => {
                        if (key !== 'format' && key !== 'exportScope') acc[key] = true;
                        return acc;
                      }, {} as any);
                      updateOptions(allTrue);
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allFalse = Object.keys(exportOptions).reduce((acc, key) => {
                        if (key !== 'format' && key !== 'exportScope') acc[key] = false;
                        return acc;
                      }, {} as any);
                      updateOptions(allFalse);
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              
              {/* Worker Information */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Worker Information</div>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="worker"
                      checked={exportOptions.includeWorker}
                      onCheckedChange={(checked) => updateOptions({ includeWorker: !!checked })}
                    />
                    <label htmlFor="worker" className="text-sm cursor-pointer">Worker Name</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="employeeNumber"
                      checked={exportOptions.includeEmployeeNumber}
                      onCheckedChange={(checked) => updateOptions({ includeEmployeeNumber: !!checked })}
                    />
                    <label htmlFor="employeeNumber" className="text-sm cursor-pointer">Employee #</label>
                  </div>
                </div>
              </div>

              {/* Project Information */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Project Information</div>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="projectNumber"
                      checked={exportOptions.includeProjectNumber}
                      onCheckedChange={(checked) => updateOptions({ includeProjectNumber: !!checked })}
                    />
                    <label htmlFor="projectNumber" className="text-sm cursor-pointer">Project Number</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="projectName"
                      checked={exportOptions.includeProjectName}
                      onCheckedChange={(checked) => updateOptions({ includeProjectName: !!checked })}
                    />
                    <label htmlFor="projectName" className="text-sm cursor-pointer">Project Name</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="client"
                      checked={exportOptions.includeClient}
                      onCheckedChange={(checked) => updateOptions({ includeClient: !!checked })}
                    />
                    <label htmlFor="client" className="text-sm cursor-pointer">Client</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="projectAddress"
                      checked={exportOptions.includeProjectAddress}
                      onCheckedChange={(checked) => updateOptions({ includeProjectAddress: !!checked })}
                    />
                    <label htmlFor="projectAddress" className="text-sm cursor-pointer">Project Address</label>
                  </div>
                </div>
              </div>

              {/* Time & Hours */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Time & Hours</div>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="startTime"
                      checked={exportOptions.includeStartTime}
                      onCheckedChange={(checked) => updateOptions({ includeStartTime: !!checked })}
                    />
                    <label htmlFor="startTime" className="text-sm cursor-pointer">Start Time</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="endTime"
                      checked={exportOptions.includeEndTime}
                      onCheckedChange={(checked) => updateOptions({ includeEndTime: !!checked })}
                    />
                    <label htmlFor="endTime" className="text-sm cursor-pointer">End Time</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="grossHours"
                      checked={exportOptions.includeGrossHours}
                      onCheckedChange={(checked) => updateOptions({ includeGrossHours: !!checked })}
                    />
                    <label htmlFor="grossHours" className="text-sm cursor-pointer">Gross Hours</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="netHours"
                      checked={exportOptions.includeNetHours}
                      onCheckedChange={(checked) => updateOptions({ includeNetHours: !!checked })}
                    />
                    <label htmlFor="netHours" className="text-sm cursor-pointer">Net Hours</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lunchTaken"
                      checked={exportOptions.includeLunchTaken}
                      onCheckedChange={(checked) => updateOptions({ includeLunchTaken: !!checked })}
                    />
                    <label htmlFor="lunchTaken" className="text-sm cursor-pointer">Lunch Taken</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lunchDuration"
                      checked={exportOptions.includeLunchDuration}
                      onCheckedChange={(checked) => updateOptions({ includeLunchDuration: !!checked })}
                    />
                    <label htmlFor="lunchDuration" className="text-sm cursor-pointer">Lunch Duration</label>
                  </div>
                </div>
              </div>

              {/* Financial */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Financial</div>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hourlyRate"
                      checked={exportOptions.includeHourlyRate}
                      onCheckedChange={(checked) => updateOptions({ includeHourlyRate: !!checked })}
                    />
                    <label htmlFor="hourlyRate" className="text-sm cursor-pointer">Hourly Rate</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="amount"
                      checked={exportOptions.includeAmount}
                      onCheckedChange={(checked) => updateOptions({ includeAmount: !!checked })}
                    />
                    <label htmlFor="amount" className="text-sm cursor-pointer">Amount</label>
                  </div>
                </div>
              </div>

              {/* Status & Documentation */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Status & Documentation</div>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="status"
                      checked={exportOptions.includeStatus}
                      onCheckedChange={(checked) => updateOptions({ includeStatus: !!checked })}
                    />
                    <label htmlFor="status" className="text-sm cursor-pointer">Status</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="receipt"
                      checked={exportOptions.includeReceipt}
                      onCheckedChange={(checked) => updateOptions({ includeReceipt: !!checked })}
                    />
                    <label htmlFor="receipt" className="text-sm cursor-pointer">Receipt</label>
                  </div>
                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox
                      id="notes"
                      checked={exportOptions.includeNotes}
                      onCheckedChange={(checked) => updateOptions({ includeNotes: !!checked })}
                    />
                    <label htmlFor="notes" className="text-sm cursor-pointer">Notes</label>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Timestamps</div>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createdAt"
                      checked={exportOptions.includeCreatedAt}
                      onCheckedChange={(checked) => updateOptions({ includeCreatedAt: !!checked })}
                    />
                    <label htmlFor="createdAt" className="text-sm cursor-pointer">Created At</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="submittedAt"
                      checked={exportOptions.includeSubmittedAt}
                      onCheckedChange={(checked) => updateOptions({ includeSubmittedAt: !!checked })}
                    />
                    <label htmlFor="submittedAt" className="text-sm cursor-pointer">Submitted At</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="approvedAt"
                      checked={exportOptions.includeApprovedAt}
                      onCheckedChange={(checked) => updateOptions({ includeApprovedAt: !!checked })}
                    />
                    <label htmlFor="approvedAt" className="text-sm cursor-pointer">Approved At</label>
                  </div>
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

