import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReceiptPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptUrl: string | null;
  timeEntryDetails?: {
    worker?: string;
    payee?: string;
    project: string;
    date: string;
    hours?: string;
    amount?: string;
  } | null;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  open,
  onOpenChange,
  receiptUrl,
  timeEntryDetails,
}) => {
  const isMobile = useIsMobile();
  
  if (!receiptUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1200px] w-full max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
        </DialogHeader>
        
        {/* Compact Receipt Details */}
        {timeEntryDetails && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 p-2 bg-muted/50 rounded text-xs mb-2">
            {timeEntryDetails.project && (
              <span>
                <strong className="font-semibold">Project:</strong> {timeEntryDetails.project}
              </span>
            )}
            {timeEntryDetails.date && (
              <span>
                <strong className="font-semibold">Date:</strong> {timeEntryDetails.date}
              </span>
            )}
            {timeEntryDetails.worker && (
              <span>
                <strong className="font-semibold">Worker:</strong> {timeEntryDetails.worker}
              </span>
            )}
            {timeEntryDetails.payee && (
              <span>
                <strong className="font-semibold">Payee:</strong> {timeEntryDetails.payee}
              </span>
            )}
            {timeEntryDetails.hours && (
              <span>
                <strong className="font-semibold">Hours:</strong> {timeEntryDetails.hours}
              </span>
            )}
            {timeEntryDetails.amount && (
              <span>
                <strong className="font-semibold">Amount:</strong> {timeEntryDetails.amount}
              </span>
            )}
          </div>
        )}

        {/* Receipt Image - Responsive Sizing */}
        <div className="flex justify-center items-center bg-muted/30 rounded-lg p-2 min-h-[500px] lg:min-h-[600px]">
          <img
            src={receiptUrl}
            alt="Receipt"
            className="max-w-full h-auto rounded shadow-lg cursor-pointer hover:opacity-95 transition-opacity"
            style={{ maxHeight: isMobile ? '70vh' : '85vh' }}
            onClick={() => window.open(receiptUrl, '_blank')}
            title="Click to open full size in new tab"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
