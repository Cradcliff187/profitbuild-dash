import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToPDF, exportToExcel, exportToCSV, downloadBlob, ReportField } from "@/utils/reportExporter";
import { useToast } from "@/hooks/use-toast";

interface ExportControlsProps {
  reportName: string;
  data: any[];
  fields: ReportField[];
}

export function ExportControls({ reportName, data, fields }: ExportControlsProps) {
  const { toast } = useToast();

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

  return (
    <div className="flex flex-wrap gap-2">
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

