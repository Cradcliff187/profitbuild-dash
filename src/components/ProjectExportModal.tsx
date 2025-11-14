import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ProjectSearchFilters } from "@/components/ProjectFilters";

interface ProjectExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ProjectSearchFilters;
}

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeFinancials: boolean;
  includeEstimates: boolean;
  includeQuotes: boolean;
  includeExpenses: boolean;
  includeChangeOrders: boolean;
  includeDates: boolean;
  groupBy: 'none' | 'client' | 'status' | 'job_type';
}

export function ProjectExportModal({ isOpen, onClose, filters }: ProjectExportModalProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeFinancials: true,
    includeEstimates: true,
    includeQuotes: true,
    includeExpenses: true,
    includeChangeOrders: true,
    includeDates: true,
    groupBy: 'none'
  });

  const updateOptions = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Build query with filters
      let query = supabase
        .from('projects')
        .select(`
          *,
          estimates(id, total_amount, status),
          quotes(id, total_amount, status),
          expenses(id, amount),
          change_orders(id, client_amount, cost_impact, status)
        `)
        .not('project_number', 'in', '("SYS-000","000-UNASSIGNED")');

      // Apply filters
      if (filters.searchText) {
        query = query.or(`project_name.ilike.%${filters.searchText}%,project_number.ilike.%${filters.searchText}%,client_name.ilike.%${filters.searchText}%`);
      }

      // Handle status array filter
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Handle job type array filter
      if (filters.jobType && filters.jobType.length > 0) {
        query = query.in('job_type', filters.jobType);
      }

      // Handle client name array filter
      if (filters.clientName && filters.clientName.length > 0) {
        query = query.in('client_name', filters.clientName);
      }

      // Handle date range filter
      if (filters.dateRange.start) {
        query = query.gte('start_date', filters.dateRange.start.toISOString());
      }
      if (filters.dateRange.end) {
        query = query.lte('end_date', filters.dateRange.end.toISOString());
      }

      // Handle budget range filter
      if (filters.budgetRange.min !== null) {
        query = query.gte('contracted_amount', filters.budgetRange.min);
      }
      if (filters.budgetRange.max !== null) {
        query = query.lte('contracted_amount', filters.budgetRange.max);
      }

      const { data: projects, error } = await query;

      if (error) throw error;

      if (!projects || projects.length === 0) {
        toast({
          title: "No data to export",
          description: "No projects match the current filters.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Process and export based on format
      if (exportOptions.format === 'csv') {
        await exportToCSV(projects);
      } else {
        // PDF and Excel not yet implemented, fall back to CSV
        await exportToCSV(projects);
        toast({
          title: "Note",
          description: `${exportOptions.format.toUpperCase()} export coming soon. Exported as CSV instead.`,
        });
      }

      toast({
        title: "Export successful",
        description: `Successfully exported ${projects.length} projects`,
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

  const exportToCSV = async (projects: any[]) => {
    // Build headers
    const headers: string[] = [
      'Project Number',
      'Project Name',
      'Client Name',
      'Status',
      'Job Type',
      'Address'
    ];

    if (exportOptions.includeFinancials) {
      headers.push(
        'Contracted Amount',
        'Margin %',
        'Current Margin $',
        'Original Est Costs',
        'Adjusted Costs',
        'Cost Variance'
      );
    }

    if (exportOptions.includeEstimates) {
      headers.push('Estimate Count', 'Total Estimated', 'Approved Estimate Amount');
    }

    if (exportOptions.includeQuotes) {
      headers.push('Quote Count', 'Total Quoted', 'Accepted Quotes Amount');
    }

    if (exportOptions.includeExpenses) {
      headers.push('Expense Count', 'Total Expenses');
    }

    if (exportOptions.includeChangeOrders) {
      headers.push('CO Count', 'CO Revenue', 'CO Costs', 'CO Net Margin');
    }

    if (exportOptions.includeDates) {
      headers.push('Start Date', 'End Date', 'Created Date');
    }

    // Sort projects if grouping is enabled
    let sortedProjects = [...projects];
    if (exportOptions.groupBy !== 'none') {
      const sortKey = exportOptions.groupBy === 'client' ? 'client_name' 
        : exportOptions.groupBy === 'status' ? 'status' 
        : 'job_type';
      sortedProjects.sort((a, b) => (a[sortKey] || '').localeCompare(b[sortKey] || ''));
    }

    // Build rows
    const rows: string[][] = [];
    let currentGroup = '';

    sortedProjects.forEach((project) => {
      // Add group header if needed
      if (exportOptions.groupBy !== 'none') {
        const groupValue = exportOptions.groupBy === 'client' ? project.client_name
          : exportOptions.groupBy === 'status' ? project.status
          : project.job_type;
        
        if (groupValue !== currentGroup) {
          currentGroup = groupValue;
          rows.push([`${exportOptions.groupBy.toUpperCase()}: ${groupValue || 'N/A'}`]);
          rows.push(headers);
        }
      }

      const row: string[] = [
        project.project_number || '',
        project.project_name || '',
        project.client_name || '',
        project.status || '',
        project.job_type || '',
        project.address || ''
      ];

      if (exportOptions.includeFinancials) {
        const costVariance = (project.adjusted_est_costs || 0) - (project.original_est_costs || 0);
        row.push(
          project.contracted_amount?.toFixed(2) || '0.00',
          project.margin_percentage?.toFixed(2) || '0.00',
          project.current_margin?.toFixed(2) || '0.00',
          project.original_est_costs?.toFixed(2) || '0.00',
          project.adjusted_est_costs?.toFixed(2) || '0.00',
          costVariance.toFixed(2)
        );
      }

      if (exportOptions.includeEstimates) {
        const estimateCount = project.estimates?.length || 0;
        const totalEstimated = project.estimates?.reduce((sum: number, e: any) => sum + (e.total_amount || 0), 0) || 0;
        const approvedTotal = project.estimates?.filter((e: any) => e.status === 'approved').reduce((sum: number, e: any) => sum + (e.total_amount || 0), 0) || 0;
        row.push(estimateCount.toString(), totalEstimated.toFixed(2), approvedTotal.toFixed(2));
      }

      if (exportOptions.includeQuotes) {
        const quoteCount = project.quotes?.length || 0;
        const totalQuoted = project.quotes?.reduce((sum: number, q: any) => sum + (q.total_amount || 0), 0) || 0;
        const acceptedTotal = project.quotes?.filter((q: any) => q.status === 'accepted').reduce((sum: number, q: any) => sum + (q.total_amount || 0), 0) || 0;
        row.push(quoteCount.toString(), totalQuoted.toFixed(2), acceptedTotal.toFixed(2));
      }

      if (exportOptions.includeExpenses) {
        const expenseCount = project.expenses?.length || 0;
        const totalExpenses = project.expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
        row.push(expenseCount.toString(), totalExpenses.toFixed(2));
      }

      if (exportOptions.includeChangeOrders) {
        const approvedCOs = project.change_orders?.filter((co: any) => co.status === 'approved') || [];
        const coCount = approvedCOs.length;
        const coRevenue = approvedCOs.reduce((sum: number, co: any) => sum + (co.client_amount || 0), 0);
        const coCosts = approvedCOs.reduce((sum: number, co: any) => sum + (co.cost_impact || 0), 0);
        const coNet = coRevenue - coCosts;
        row.push(coCount.toString(), coRevenue.toFixed(2), coCosts.toFixed(2), coNet.toFixed(2));
      }

      if (exportOptions.includeDates) {
        row.push(
          project.start_date ? format(new Date(project.start_date), 'yyyy-MM-dd') : '',
          project.end_date ? format(new Date(project.end_date), 'yyyy-MM-dd') : '',
          project.created_at ? format(new Date(project.created_at), 'yyyy-MM-dd') : ''
        );
      }

      rows.push(row);
    });

    // Add header row if not grouping
    if (exportOptions.groupBy === 'none') {
      rows.unshift(headers);
    }

    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `projects_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Export Projects</SheetTitle>
          <SheetDescription>
            Configure export options and download project data matching your filters
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 px-6 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={exportOptions.format} onValueChange={(value: any) => updateOptions('format', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Recommended)</SelectItem>
                <SelectItem value="excel">Excel (Coming Soon)</SelectItem>
                <SelectItem value="pdf">PDF (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Include in Export</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="financials"
                checked={exportOptions.includeFinancials}
                onCheckedChange={(checked) => updateOptions('includeFinancials', checked)}
              />
              <label htmlFor="financials" className="text-sm cursor-pointer">
                Financial Details
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="estimates"
                checked={exportOptions.includeEstimates}
                onCheckedChange={(checked) => updateOptions('includeEstimates', checked)}
              />
              <label htmlFor="estimates" className="text-sm cursor-pointer">
                Estimates Summary
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="quotes"
                checked={exportOptions.includeQuotes}
                onCheckedChange={(checked) => updateOptions('includeQuotes', checked)}
              />
              <label htmlFor="quotes" className="text-sm cursor-pointer">
                Quotes Summary
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="expenses"
                checked={exportOptions.includeExpenses}
                onCheckedChange={(checked) => updateOptions('includeExpenses', checked)}
              />
              <label htmlFor="expenses" className="text-sm cursor-pointer">
                Expenses Summary
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="changeOrders"
                checked={exportOptions.includeChangeOrders}
                onCheckedChange={(checked) => updateOptions('includeChangeOrders', checked)}
              />
              <label htmlFor="changeOrders" className="text-sm cursor-pointer">
                Change Orders Summary
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dates"
                checked={exportOptions.includeDates}
                onCheckedChange={(checked) => updateOptions('includeDates', checked)}
              />
              <label htmlFor="dates" className="text-sm cursor-pointer">
                Project Dates
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Group By</Label>
            <Select value={exportOptions.groupBy} onValueChange={(value: any) => updateOptions('groupBy', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="job_type">Job Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Export Projects
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
