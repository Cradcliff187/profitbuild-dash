import React, { useState } from 'react';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Calendar, User, FileText, AlertTriangle, Target, CheckCircle2, Shield } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Quote } from '@/types/quote';
import { QuoteStatus } from '@/types/quote';
import type { Estimate } from '@/types/estimate';
import type { Project } from '@/types/project';
import type { Expense } from '@/types/expense';
import { calculateProjectMargin, getMarginStatusLevel, formatMarginCurrency } from '@/types/margin';
import { getThresholdStatusColor, getThresholdStatusLabel } from '@/utils/thresholdUtils';

interface QuoteAcceptanceModalProps {
  quote: Quote;
  estimate: Estimate;
  project: Project;
  expenses?: Expense[];
  onAccept: (updatedQuote: Quote) => void;
  onReject: (updatedQuote: Quote) => void;
  onClose: () => void;
}

export function QuoteAcceptanceModal({
  quote,
  estimate,
  project,
  expenses = [],
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

  // Calculate margin impact
  const currentMargin = calculateProjectMargin(project, expenses, [estimate]);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const projectedContractedAmount = (project.contracted_amount || 0) + quote.total;
  const projectedMarginAmount = projectedContractedAmount - totalExpenses;
  const projectedMarginPercentage = projectedContractedAmount > 0 
    ? (projectedMarginAmount / projectedContractedAmount) * 100 
    : 0;
  
  const currentMarginStatus = getMarginStatusLevel({
    ...currentMargin,
    margin_percentage: currentMargin.margin_percentage || 0
  });
  
  const projectedMarginStatus = getMarginStatusLevel({
    ...currentMargin,
    margin_percentage: projectedMarginPercentage
  });
  
  const marginChange = projectedMarginPercentage - (currentMargin.margin_percentage || 0);
  const isMarginImproving = marginChange > 0;

  // Warning configuration based on margin thresholds
  const getMarginWarningConfig = (margin: number) => {
    const minThreshold = project.minimum_margin_threshold || 10;
    const targetThreshold = project.target_margin || 20;
    
    if (margin < minThreshold) {
      return {
        type: 'critical',
        variant: 'destructive' as const,
        icon: AlertTriangle,
        className: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        title: 'Critical Margin Risk',
        description: `Accepting this quote will result in a margin of ${margin.toFixed(1)}% which is below your minimum threshold of ${minThreshold}%. This could significantly impact project profitability and may require immediate cost review.`
      };
    } else if (margin < targetThreshold) {
      return {
        type: 'warning',
        variant: 'default' as const,
        icon: Shield,
        className: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-400 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400',
        title: 'Margin Below Target',
        description: `This quote will result in a margin of ${margin.toFixed(1)}% which is below your target of ${targetThreshold}%. Consider negotiating the quote amount or reviewing project costs to improve profitability.`
      };
    } else {
      return {
        type: 'success',
        variant: 'default' as const,
        icon: CheckCircle2,
        className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400 [&>svg]:text-green-600 dark:[&>svg]:text-green-400',
        title: 'Healthy Margin',
        description: `This quote maintains a strong profit margin of ${margin.toFixed(1)}% which exceeds your target threshold of ${targetThreshold}%. The project profitability looks excellent.`
      };
    }
  };

  const warningConfig = getMarginWarningConfig(projectedMarginPercentage);

  const handleAccept = () => {
    const updatedQuote: Quote = {
      ...quote,
      status: QuoteStatus.ACCEPTED,
      accepted_date: new Date()
    };
    onAccept(updatedQuote);
    onClose();
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (rejectionReason.trim()) {
      const updatedQuote: Quote = {
        ...quote,
        status: QuoteStatus.REJECTED,
        rejection_reason: rejectionReason.trim()
      };
      onReject(updatedQuote);
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

          <div className="space-y-4">
            {/* Quote Details Header */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
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

            {/* Margin Impact Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Margin Impact Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Current Margin */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Current Margin</div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold">
                        {(currentMargin.margin_percentage || 0).toFixed(1)}%
                      </span>
                      <Badge 
                        variant="outline" 
                        style={{ 
                          borderColor: getThresholdStatusColor(currentMarginStatus),
                          color: getThresholdStatusColor(currentMarginStatus)
                        }}
                      >
                        {getThresholdStatusLabel(currentMarginStatus)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatMarginCurrency(currentMargin.current_margin || 0)}
                    </div>
                  </div>

                  {/* Projected Margin */}
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-sm text-muted-foreground mb-2">Projected Margin (if accepted)</div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-primary">
                        {projectedMarginPercentage.toFixed(1)}%
                      </span>
                      <Badge 
                        variant="outline"
                        style={{ 
                          borderColor: getThresholdStatusColor(projectedMarginStatus),
                          color: getThresholdStatusColor(projectedMarginStatus)
                        }}
                      >
                        {getThresholdStatusLabel(projectedMarginStatus)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatMarginCurrency(projectedMarginAmount)}
                    </div>
                  </div>
                </div>

                {/* Margin Change Summary */}
                <div className="p-4 rounded-lg border-2 border-dashed" 
                     style={{ 
                       borderColor: isMarginImproving ? 'hsl(var(--success))' : 'hsl(var(--destructive))',
                       backgroundColor: isMarginImproving ? 'hsl(var(--success) / 0.05)' : 'hsl(var(--destructive) / 0.05)'
                     }}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {isMarginImproving ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                    <span className="font-medium">
                      Margin {isMarginImproving ? 'Improvement' : 'Impact'}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`text-lg font-bold ${isMarginImproving ? 'text-green-600' : 'text-destructive'}`}>
                      {marginChange > 0 ? '+' : ''}{marginChange.toFixed(1)} percentage points
                    </span>
                  </div>
                  {(project.minimum_margin_threshold || project.target_margin) && (
                    <div className="mt-2 text-xs text-muted-foreground text-center">
                      Target: {project.target_margin || 20}% | Minimum: {project.minimum_margin_threshold || 10}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Margin Warning Alert */}
            <Alert variant={warningConfig.variant} className={warningConfig.className}>
              <warningConfig.icon className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {warningConfig.title}
                <Badge variant="outline" className="ml-auto">
                  {projectedMarginPercentage.toFixed(1)}% Margin
                </Badge>
              </AlertTitle>
              <AlertDescription className="mt-2">
                {warningConfig.description}
              </AlertDescription>
              {warningConfig.type === 'critical' && (
                <AlertDescription className="mt-3 font-medium">
                  <strong>Recommended Actions:</strong>
                  <ul className="mt-1 ml-4 list-disc text-sm">
                    <li>Negotiate a lower quote amount with the subcontractor</li>
                    <li>Review project scope to identify cost savings opportunities</li>
                    <li>Consider alternative subcontractors or approaches</li>
                  </ul>
                </AlertDescription>
              )}
            </Alert>

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
              className={`flex items-center gap-2 ${
                warningConfig.type === 'critical' 
                  ? 'bg-destructive hover:bg-destructive/90' 
                  : ''
              }`}
              variant={warningConfig.type === 'critical' ? 'destructive' : 'default'}
            >
              <CheckCircle className="h-4 w-4" />
              Accept Quote
              {warningConfig.type === 'critical' && (
                <AlertTriangle className="h-4 w-4 ml-1" />
              )}
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
            
            <div className="space-y-3">
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