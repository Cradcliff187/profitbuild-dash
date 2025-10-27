import React from 'react';
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
  if (!receiptUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
        </DialogHeader>
        
        {/* Receipt Details */}
        {timeEntryDetails && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm mb-3">
            {timeEntryDetails.worker && (
              <div>
                <span className="text-muted-foreground">Worker:</span>
                <span className="ml-2 font-medium">{timeEntryDetails.worker}</span>
              </div>
            )}
            {timeEntryDetails.payee && (
              <div>
                <span className="text-muted-foreground">Payee:</span>
                <span className="ml-2 font-medium">{timeEntryDetails.payee}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Project:</span>
              <span className="ml-2 font-medium">{timeEntryDetails.project}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>
              <span className="ml-2 font-medium">{timeEntryDetails.date}</span>
            </div>
            {timeEntryDetails.hours && (
              <div>
                <span className="text-muted-foreground">Hours:</span>
                <span className="ml-2 font-medium">{timeEntryDetails.hours}</span>
              </div>
            )}
            {timeEntryDetails.amount && (
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <span className="ml-2 font-medium">{timeEntryDetails.amount}</span>
              </div>
            )}
          </div>
        )}

        {/* Receipt Image */}
        <div className="flex justify-center bg-muted/30 rounded-lg p-4">
          <img
            src={receiptUrl}
            alt="Receipt"
            className="max-w-full h-auto rounded shadow-lg"
            style={{ maxHeight: '60vh' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
