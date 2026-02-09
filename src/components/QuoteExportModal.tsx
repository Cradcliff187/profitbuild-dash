import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileText, Table, Calendar } from "lucide-react";
import type { QuoteSearchFilters } from "./QuoteFilters";

interface QuoteExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: QuoteSearchFilters;
}

interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeLineItems: boolean;
  includeEstimateComparison: boolean;
  includeVendorDetails: boolean;
  includeFinancialVariance: boolean;
  groupBy: 'project' | 'client' | 'payee' | 'status' | 'none';
}

export const QuoteExportModal: React.FC<QuoteExportModalProps> = ({
  isOpen,
  onClose,
  filters
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeLineItems: true,
    includeEstimateComparison: true,
    includeVendorDetails: true,
    includeFinancialVariance: true,
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
        .from('quotes')
        .select(`
          *,
          projects (
            id,
            project_name,
            client_name,
            project_number
          ),
          estimates (
            id,
            estimate_number,
            total_amount
          ),
          payees (
            id,
            payee_name
          ),
          quote_line_items (*)
        `);

      // Apply filters
      if (filters.searchText) {
        query = query.or(`quote_number.ilike.%${filters.searchText}%,notes.ilike.%${filters.searchText}%`);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status as any);
      }

      if (filters.payeeName.length > 0) {
        const payeeIds = filters.payeeName.map(name => name); // Assume these are IDs
        query = query.in('payee_id', payeeIds);
      }

      if (filters.clientName.length > 0) {
        // Filter by client through projects table
        const { data: projectData } = await supabase
          .from('projects')
          .select('id')
          .in('client_name', filters.clientName);
        
        if (projectData && projectData.length > 0) {
          const projectIds = projectData.map(p => p.id);
          query = query.in('project_id', projectIds);
        }
      }

      if (filters.dateRange.start) {
        query = query.gte('date_received', filters.dateRange.start.toISOString().split('T')[0]);
      }

      if (filters.dateRange.end) {
        query = query.lte('date_received', filters.dateRange.end.toISOString().split('T')[0]);
      }

      if (filters.amountRange.min !== null) {
        query = query.gte('total', filters.amountRange.min);
      }

      if (filters.amountRange.max !== null) {
        query = query.lte('total', filters.amountRange.max);
      }

      const { data: quotes, error } = await query;

      if (error) throw error;

      // Process and export data based on format
      if (exportOptions.format === 'csv') {
        await exportToCSV(quotes);
      } else if (exportOptions.format === 'pdf') {
        await exportToPDF(quotes);
      } else if (exportOptions.format === 'excel') {
        await exportToExcel(quotes);
      }

      toast.success("Export Complete", { description: `Successfully exported ${quotes?.length || 0} quotes` });

      onClose();
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export Failed", { description: "There was an error exporting the data" });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async (quotes: any[]) => {
    const headers = [
      'Quote Number',
      'Project Name',
      'Client Name',
      'Payee',
      'Status',
      'Date Received',
      'Vendor Cost',
      'Valid Until'
    ];

    if (exportOptions.includeEstimateComparison) {
      headers.push('Estimate Number', 'Estimate Cost');
    }

    if (exportOptions.includeFinancialVariance) {
      headers.push('Cost Variance ($)', 'Cost Variance (%)');
    }

    if (exportOptions.includeVendorDetails) {
      headers.push('Quoted By', 'Notes');
    }

    const rows = quotes.map(quote => {
      const vendorCost = quote.quote_line_items?.reduce((sum: number, item: any) => 
        sum + (item.quantity || 0) * (item.cost_per_unit || 0), 0
      ) || quote.total || 0;

      const row = [
        quote.quote_number,
        quote.projects?.project_name || '',
        quote.projects?.client_name || '',
        quote.payees?.payee_name || '',
        quote.status,
        quote.date_received ? new Date(quote.date_received).toLocaleDateString() : '',
        vendorCost.toString(),
        quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : ''
      ];

      if (exportOptions.includeEstimateComparison) {
        row.push(
          quote.estimates?.estimate_number || '',
          quote.estimates?.total_amount?.toString() || ''
        );
      }

      if (exportOptions.includeFinancialVariance) {
        const estimateCost = quote.estimates?.total_amount || 0;
        const variance = vendorCost - estimateCost;
        const variancePercent = estimateCost > 0 ? ((variance / estimateCost) * 100).toFixed(1) : '0';
        row.push(variance.toString(), variancePercent);
      }

      if (exportOptions.includeVendorDetails) {
        row.push(quote.quoted_by || '', quote.notes || '');
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
    a.download = `quotes_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async (quotes: any[]) => {
    await exportToCSV(quotes);
    toast.info("PDF Export", { description: "PDF export converted to CSV format for now" });
  };

  const exportToExcel = async (quotes: any[]) => {
    await exportToCSV(quotes);
    toast.info("Excel Export", { description: "Excel export converted to CSV format for now" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Quotes</span>
          </SheetTitle>
          <SheetDescription>
            Configure export options and download quote data matching your filters
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
              {filters.clientName.length > 0 && (
                <Badge variant="secondary">Client: {filters.clientName.join(', ')}</Badge>
              )}
              {filters.payeeName.length > 0 && (
                <Badge variant="secondary">Payee: {filters.payeeName.join(', ')}</Badge>
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
                  id="estimateComparison"
                  checked={exportOptions.includeEstimateComparison}
                  onCheckedChange={(checked) => updateOptions({ includeEstimateComparison: !!checked })}
                />
                <label htmlFor="estimateComparison" className="text-sm">Estimate Comparison</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vendorDetails"
                  checked={exportOptions.includeVendorDetails}
                  onCheckedChange={(checked) => updateOptions({ includeVendorDetails: !!checked })}
                />
                <label htmlFor="vendorDetails" className="text-sm">Vendor Details</label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="financialVariance"
                  checked={exportOptions.includeFinancialVariance}
                  onCheckedChange={(checked) => updateOptions({ includeFinancialVariance: !!checked })}
                />
                <label htmlFor="financialVariance" className="text-sm">Financial Variance</label>
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
                <SelectItem value="payee">Payee</SelectItem>
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
