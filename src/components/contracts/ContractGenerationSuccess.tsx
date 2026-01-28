import { CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(result.docxUrl, 'docx')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download DOCX
          </Button>
        )}
        {result.pdfUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload(result.pdfUrl, 'pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
      </div>
      <Button onClick={onClose}>Close</Button>
    </div>
  );
}
