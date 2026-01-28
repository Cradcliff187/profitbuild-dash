import { CheckCircle2, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { ContractGenerationResponse } from '@/types/contract';

interface ContractGenerationSuccessProps {
  result: ContractGenerationResponse;
  onClose: () => void;
}

export function ContractGenerationSuccess({ result, onClose }: ContractGenerationSuccessProps) {
  const handleDownload = (url: string | undefined, label: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${label}-${result.contractNumber}.${label.toLowerCase()}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handlePrint = (url: string | undefined) => {
    if (!url) return;
    const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}`;
    window.open(printUrl, '_blank');
    toast.info('Use Ctrl+P (or Cmd+P) to print, then select "Save as PDF"');
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-6">
      <CheckCircle2 className="h-12 w-12 text-green-500" />
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Contract generated successfully</h3>
        <p className="text-muted-foreground">
          Subcontractor Project Agreement <strong>{result.contractNumber}</strong> has been created
          and saved to project documents.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {result.docxUrl && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint(result.docxUrl)}
              title="Print / Save as PDF"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print / Save as PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(result.docxUrl, 'docx')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download DOCX
            </Button>
          </>
        )}
      </div>
      <Button onClick={onClose}>Close</Button>
    </div>
  );
}
