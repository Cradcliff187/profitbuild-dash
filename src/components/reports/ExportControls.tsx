import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { exportToPDF, exportToExcel, exportToCSV, downloadBlob, ReportField } from "@/utils/reportExporter";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportControlsProps {
  reportName: string;
  data: any[];
  fields: ReportField[];
}

export function ExportControls({ reportName, data, fields }: ExportControlsProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleExportPDF = async () => {
    try {
      const blob = await exportToPDF(data, {
        reportName,
        fields,
        showDate: true
      });
      const filename = `${reportName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(blob, filename);
      toast({
        title: "PDF Exported",
        description: `Report exported as ${filename}`
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export PDF",
        variant: "destructive"
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await exportToExcel(data, {
        reportName,
        fields
      });
      const filename = `${reportName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xls`;
      downloadBlob(blob, filename);
      toast({
        title: "Excel Exported",
        description: `Report exported as ${filename}`
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export Excel",
        variant: "destructive"
      });
    }
  };

  const handleExportCSV = () => {
    try {
      const blob = exportToCSV(data, {
        reportName,
        fields
      });
      const filename = `${reportName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadBlob(blob, filename);
      toast({
        title: "CSV Exported",
        description: `Report exported as ${filename}`
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export CSV",
        variant: "destructive"
      });
    }
  };

  // Mobile: Use dropdown to save vertical space with proper PWA touch targets
  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full min-h-[44px]">
            <Download className="h-4 w-4 mr-2" />
            Export
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)] sm:w-56">
          <DropdownMenuItem onClick={handleExportPDF} className="min-h-[44px] cursor-pointer">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportExcel} className="min-h-[44px] cursor-pointer">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCSV} className="min-h-[44px] cursor-pointer">
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Desktop: Show separate buttons for better visibility and one-click access
  return (
    <div className="flex flex-row gap-2">
      <Button onClick={handleExportPDF} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
      <Button onClick={handleExportExcel} variant="outline" size="sm">
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Export Excel
      </Button>
      <Button onClick={handleExportCSV} variant="outline" size="sm">
        <FileText className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  );
}
