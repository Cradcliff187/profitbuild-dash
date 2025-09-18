import React, { useState } from 'react';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Calendar, User, FileText, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VarianceBadge } from '@/components/ui/variance-badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Quote } from '@/types/quote';
import type { Estimate } from '@/types/estimate';

interface QuoteAcceptanceModalProps {
  quote: Quote;
  estimate: Estimate;
  onAccept: (quote: Quote) => void;
  onReject: (quote: Quote, reason: string) => void;
  onClose: () => void;
}

export function QuoteAcceptanceModal({
  quote,
  estimate,
  onAccept,
  onReject,
  onClose,
}: QuoteAcceptanceModalProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Calculate variance
  const variance = quote.total - estimate.total_amount;
  const percentageDiff = estimate.total_amount !== 0 
    ? (variance / estimate.total_amount) * 100 
    : 0;

  // Format dates
  const dateReceived = new Date(quote.dateReceived).toLocaleDateString();
  const validUntil = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : null;
  const isExpiringSoon = quote.valid_until 
    ? new Date(quote.valid_until).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 
    : false;

  const handleAccept = () => {
    onAccept(quote);
    onClose();
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (rejectionReason.trim()) {
      onReject(quote, rejectionReason.trim());
      onClose();
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setRejectionReason('');
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review Quote: {quote.quoteNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quote Details Header */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Subcontractor:</span>
                    <span>{quote.quotedBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Date Received:</span>
                    <span>{dateReceived}</span>
                  </div>
                  {validUntil && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Valid Until:</span>
                      <span className={isExpiringSoon ? 'text-destructive font-medium' : ''}>
                        {validUntil}
                      </span>
                      {isExpiringSoon && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Expiring Soon
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Materials Included:</span>
                    <Badge variant={quote.includes_materials ? "default" : "secondary"}>
                      {quote.includes_materials ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Labor Included:</span>
                    <Badge variant={quote.includes_labor ? "default" : "secondary"}>
                      {quote.includes_labor ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amount Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Amount Comparison</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Original Estimate</div>
                    <div className="text-2xl font-bold">
                      {estimate.total_amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">Quote Amount</div>
                    <div className="text-2xl font-bold text-primary">
                      {quote.total.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Difference</div>
                    <div className="flex items-center justify-center gap-2">
                      {variance > 0 ? (
                        <TrendingUp className="h-5 w-5 text-destructive" />
                      ) : variance < 0 ? (
                        <TrendingDown className="h-5 w-5 text-green-600" />
                      ) : null}
                      <VarianceBadge
                        variance={variance}
                        percentage={percentageDiff}
                        type="estimate"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Labor</div>
                    <div className="font-medium">
                      {quote.subtotals.labor.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Materials</div>
                    <div className="font-medium">
                      {quote.subtotals.materials.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Equipment</div>
                    <div className="font-medium">
                      {quote.subtotals.equipment.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Other</div>
                    <div className="font-medium">
                      {quote.subtotals.other.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {quote.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {quote.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectClick}
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject Quote
            </Button>
            <Button
              onClick={handleAccept}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Accept Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Modal */}
      <Dialog open={showRejectModal} onOpenChange={handleRejectCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this quote. This will help with future communications and record keeping.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejecting this quote..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleRejectCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim()}
            >
              Reject Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}