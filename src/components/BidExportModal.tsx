import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import type { BranchBid } from '@/types/bid';

interface BidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bids: BranchBid[];
}

interface ExportOptions {
  format: 'csv';
  includeClientDetails: boolean;
  includeProjectDetails: boolean;
  includeCreatorDetails: boolean;
  includeDates: boolean;
  includeDescription: boolean;
}

export const BidExportModal: React.FC<BidExportModalProps> = ({
  isOpen,
  onClose,
  bids
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeClientDetails: true,
    includeProjectDetails: true,
    includeCreatorDetails: true,
    includeDates: true,
    includeDescription: true
  });

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions({ ...exportOptions, ...updates });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      if (bids.length === 0) {
        toast({
          title: "No data to export",
          description: "No bids available to export.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      await exportToCSV(bids);
      
      toast({
        title: "Export successful",
        description: `Successfully exported ${bids.length} bids`,
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

  const exportToCSV = async (bids: BranchBid[]) => {
    // Build headers based on options
    const headers: string[] = ["Bid Name"];

    if (exportOptions.includeDescription) {
      headers.push("Description");
    }

    if (exportOptions.includeClientDetails) {
      headers.push("Client Name", "Company Name");
    }

    if (exportOptions.includeProjectDetails) {
      headers.push("Project Type", "Job Type", "Address", "Linked Project");
    }

    if (exportOptions.includeCreatorDetails) {
      headers.push("Created By", "Creator Email");
    }

    if (exportOptions.includeDates) {
      headers.push("Created Date", "Last Updated");
    }

    // Build rows
    const rows = bids.map((bid) => {
      const row: string[] = [`"${bid.name || ""}"`];

      if (exportOptions.includeDescription) {
        row.push(`"${bid.description || ""}"`);
      }

      if (exportOptions.includeClientDetails) {
        const clientName = bid.clients?.client_name || "";
        const companyName = bid.clients?.company_name || "";
        row.push(`"${clientName}"`, `"${companyName}"`);
      }

      if (exportOptions.includeProjectDetails) {
        const projectType = bid.project_type ? bid.project_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : "";
        const jobType = bid.job_type || "";
        const address = bid.address || "";
        const linkedProject = bid.projects ? `${bid.projects.project_number} - ${bid.projects.project_name}` : "";
        row.push(`"${projectType}"`, `"${jobType}"`, `"${address}"`, `"${linkedProject}"`);
      }

      if (exportOptions.includeCreatorDetails) {
        const creatorName = bid.profiles?.full_name || "";
        const creatorEmail = bid.profiles?.email || "";
        row.push(`"${creatorName}"`, `"${creatorEmail}"`);
      }

      if (exportOptions.includeDates) {
        const createdDate = bid.created_at ? format(new Date(bid.created_at), "yyyy-MM-dd HH:mm") : "";
        const updatedDate = bid.updated_at ? format(new Date(bid.updated_at), "yyyy-MM-dd HH:mm") : "";
        row.push(createdDate, updatedDate);
      }

      return row;
    });

    // Convert to CSV
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => {
        // Cell is already quoted for string fields, just return as is
        if (typeof cell === 'string' && cell.startsWith('"')) {
          return cell;
        }
        // For non-quoted cells (like dates), quote them
        return `"${String(cell).replace(/"/g, '""')}"`;
      }).join(","))
      .join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bids-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Bids</span>
          </SheetTitle>
          <SheetDescription>
            Configure export options and download bid data
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 px-6 py-4">
            {/* Summary */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Export Summary:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  {bids.length} bids
                </Badge>
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
                    id="description"
                    checked={exportOptions.includeDescription}
                    onCheckedChange={(checked) => updateOptions({ includeDescription: !!checked })}
                  />
                  <label htmlFor="description" className="text-sm cursor-pointer">Description</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="clientDetails"
                    checked={exportOptions.includeClientDetails}
                    onCheckedChange={(checked) => updateOptions({ includeClientDetails: !!checked })}
                  />
                  <label htmlFor="clientDetails" className="text-sm cursor-pointer">Client Details</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="projectDetails"
                    checked={exportOptions.includeProjectDetails}
                    onCheckedChange={(checked) => updateOptions({ includeProjectDetails: !!checked })}
                  />
                  <label htmlFor="projectDetails" className="text-sm cursor-pointer">Project Details (Type, Address, etc.)</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="creatorDetails"
                    checked={exportOptions.includeCreatorDetails}
                    onCheckedChange={(checked) => updateOptions({ includeCreatorDetails: !!checked })}
                  />
                  <label htmlFor="creatorDetails" className="text-sm cursor-pointer">Creator Details</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dates"
                    checked={exportOptions.includeDates}
                    onCheckedChange={(checked) => updateOptions({ includeDates: !!checked })}
                  />
                  <label htmlFor="dates" className="text-sm cursor-pointer">Dates (Created & Updated)</label>
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
            disabled={isExporting || bids.length === 0}
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
                Export {bids.length} Bids
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

