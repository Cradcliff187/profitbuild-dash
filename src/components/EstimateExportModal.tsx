import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Table, Calendar } from "lucide-react";
import type { SearchFilters } from "./EstimateSearchFilters";

interface EstimateExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
}

interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeLineItems: boolean;
  includeVersionHistory: boolean;
  includeProjectDetails: boolean;
  includeFinancialSummary: boolean;
  groupBy: 'project' | 'client' | 'status' | 'none';
}

export const EstimateExportModal: React.FC<EstimateExportModalProps> = ({
  isOpen,
  onClose,
  filters
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeLineItems: true,
    includeVersionHistory: false,
    includeProjectDetails: true,
    includeFinancialSummary: true,
    groupBy: 'project'
  });

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions({ ...exportOptions, ...updates });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Build query based on filters
      let query = supabase
        .from('estimates')
        .select(`
          *,
          projects (
            id,
            project_name,
            client_name,
            project_number
          ),
          estimate_line_items (*)
        `);

      // Apply filters
      if (filters.searchText) {
        query = query.or(`estimate_number.ilike.%${filters.searchText}%,notes.ilike.%${filters.searchText}%`);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status as any);
      }

      if (filters.dateRange.start) {
        query = query.gte('date_created', filters.dateRange.start.toISOString().split('T')[0]);
      }

      if (filters.dateRange.end) {
        query = query.lte('date_created', filters.dateRange.end.toISOString().split('T')[0]);
      }

      if (filters.amountRange.min !== null) {
        query = query.gte('total_amount', filters.amountRange.min);
      }

      if (filters.amountRange.max !== null) {
        query = query.lte('total_amount', filters.amountRange.max);
      }

      const { data: estimates, error } = await query;

      if (error) throw error;

      // Process and export data based on format
      if (exportOptions.format === 'csv') {
        await exportToCSV(estimates);
      } else if (exportOptions.format === 'pdf') {
        await exportToPDF(estimates);
      } else if (exportOptions.format === 'excel') {
        await exportToExcel(estimates);
      }

      toast({
        title: "Export Complete",
        description: `Successfully exported ${estimates?.length || 0} estimates`
      });

      onClose();
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async (estimates: any[]) => {
    const headers = [
      'Estimate Number',
      'Project Name',
      'Client Name',
      'Status',
      'Date Created',
      'Total Amount',
      'Version Number',
      'Is Current Version'
    ];

    if (exportOptions.includeProjectDetails) {
      headers.push('Project Number', 'Project Address');
    }

    if (exportOptions.includeFinancialSummary) {
      headers.push('Contingency %', 'Contingency Amount', 'Target Margin %');
    }

    const rows = estimates.map(estimate => {
      const row = [
        estimate.estimate_number,
        estimate.projects?.project_name || '',
        estimate.projects?.client_name || '',
        estimate.status,
        new Date(estimate.date_created).toLocaleDateString(),
        estimate.total_amount?.toString() || '0',
        estimate.version_number?.toString() || '1',
        estimate.is_current_version ? 'Yes' : 'No'
      ];

      if (exportOptions.includeProjectDetails) {
        row.push(estimate.projects?.project_number || '', ''); // Address would need to be added to query
      }

      if (exportOptions.includeFinancialSummary) {
        row.push(
          estimate.contingency_percent?.toString() || '0',
          estimate.contingency_amount?.toString() || '0',
          estimate.target_margin_percent?.toString() || '0'
        );
      }

      return row;
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estimates_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async (estimates: any[]) => {
    // For PDF export, we'd typically use a library like jsPDF
    // For now, we'll convert to CSV as a fallback
    await exportToCSV(estimates);
    toast({
      title: "PDF Export",
      description: "PDF export converted to CSV format for now",
      variant: "default"
    });
  };

  const exportToExcel = async (estimates: any[]) => {
    // For Excel export, we'd typically use a library like xlsx
    // For now, we'll convert to CSV as a fallback
    await exportToCSV(estimates);
    toast({
      title: "Excel Export",
      description: "Excel export converted to CSV format for now",
      variant: "default"
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Estimates</span>
          </SheetTitle>
          <SheetDescription>
            Configure export options and download estimate data matching your filters
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
              {filters.searchText && (
                <Badge variant="secondary">Search: {filters.searchText}</Badge>
              )}
              {filters.clientName && (
                <Badge variant="secondary">Client: {filters.clientName}</Badge>
              )}
              {(filters.dateRange.start || filters.dateRange.end) && (
                <Badge variant="secondary">
                  <Calendar className="h-3 w-3 mr-1" />
                  Date Range
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
                <SelectItem value="csv">
                  <div className="flex items-center space-x-2">
                    <Table className="h-4 w-4" />
                    <span>CSV (Recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center space-x-2">
                    <Table className="h-4 w-4" />
                    <span>Excel</span>
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>PDF Report</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Include in Export</label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lineItems"
                  checked={exportOptions.includeLineItems}
                  onCheckedChange={(checked) => updateOptions({ includeLineItems: !!checked })}
                />
                <label htmlFor="lineItems" className="text-sm">Line Items Details</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="versionHistory"
                  checked={exportOptions.includeVersionHistory}
                  onCheckedChange={(checked) => updateOptions({ includeVersionHistory: !!checked })}
                />
                <label htmlFor="versionHistory" className="text-sm">Version History</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="projectDetails"
                  checked={exportOptions.includeProjectDetails}
                  onCheckedChange={(checked) => updateOptions({ includeProjectDetails: !!checked })}
                />
                <label htmlFor="projectDetails" className="text-sm">Project Details</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="financialSummary"
                  checked={exportOptions.includeFinancialSummary}
                  onCheckedChange={(checked) => updateOptions({ includeFinancialSummary: !!checked })}
                />
                <label htmlFor="financialSummary" className="text-sm">Financial Summary</label>
              </div>
            </div>
          </div>

          {/* Group By */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Results By</label>
            <Select value={exportOptions.groupBy} onValueChange={(value) => updateOptions({ groupBy: value as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="status">Status</SelectItem>
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
            disabled={isExporting}
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
                Export
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};