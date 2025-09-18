import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Quote } from "@/types/quote";
import { Estimate, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { MarginComparisonData } from "@/types/quote";
import { VarianceBadge } from "@/components/ui/variance-badge";

interface QuoteComparisonProps {
  quote: Quote;
  estimate: Estimate;
  onBack: () => void;
}

export const QuoteComparison = ({ quote, estimate, onBack }: QuoteComparisonProps) => {
  // Helper function to calculate estimate totals from line items
  const calculateEstimateTotals = (estimate: Estimate) => {
    const subtotals = {
      labor_internal: 0,
      subcontractors: 0,
      materials: 0,
      equipment: 0,
      other: 0
    };

    estimate.lineItems.forEach(item => {
      subtotals[item.category] += item.total;
    });

    const total = Object.values(subtotals).reduce((sum, val) => sum + val, 0);
    return { subtotals, total };
  };

  // Helper function to calculate estimate costs from line items
  const calculateEstimateCosts = (estimate: Estimate) => {
    const costSubtotals = {
      labor_internal: 0,
      subcontractors: 0,
      materials: 0,
      equipment: 0,
      other: 0
    };

    estimate.lineItems.forEach(item => {
      costSubtotals[item.category] += item.quantity * item.costPerUnit;
    });

    const totalCost = Object.values(costSubtotals).reduce((sum, val) => sum + val, 0);
    return { costSubtotals, totalCost };
  };

  const getMarginStatus = (marginPercent: number): 'excellent' | 'acceptable' | 'marginal' | 'loss' => {
    if (marginPercent < 0) return 'loss';
    if (marginPercent < 10) return 'marginal';
    if (marginPercent < (estimate.targetMarginPercent || 20)) return 'acceptable';
    return 'excellent';
  };

  const getMarginStatusColor = (status: 'excellent' | 'acceptable' | 'marginal' | 'loss') => {
    switch (status) {
      case 'excellent': return 'text-primary';
      case 'acceptable': return 'text-green-600';
      case 'marginal': return 'text-yellow-600';
      case 'loss': return 'text-destructive';
    }
  };

  const calculateMarginComparison = (): MarginComparisonData => {
    const estimateTotals = calculateEstimateTotals(estimate);
    const estimateCosts = calculateEstimateCosts(estimate);
    const estimateTotal = estimateTotals.total;
    const quoteTotal = quote.total;
    const difference = quoteTotal - estimateTotal;
    const percentageDiff = estimateTotal > 0 ? (difference / estimateTotal) * 100 : 0;

    const yourTotalCost = estimateCosts.totalCost;
    const yourTotalPrice = estimateTotal;
    const vendorQuote = quoteTotal;
    const marginIfAccepted = yourTotalPrice > 0 ? ((yourTotalPrice - vendorQuote) / yourTotalPrice) * 100 : 0;
    const targetMargin = estimate.targetMarginPercent || 20;
    const minimumAcceptableQuote = yourTotalCost * (1 + targetMargin / 100);
    const marginStatus = getMarginStatus(marginIfAccepted);

    const categoryComparisons = {
      labor_internal: {
        estimate: estimateTotals.subtotals.labor_internal,
        quote: quote.subtotals.labor,
        difference: quote.subtotals.labor - estimateTotals.subtotals.labor_internal,
        percentageDiff: estimateTotals.subtotals.labor_internal > 0 ? 
          ((quote.subtotals.labor - estimateTotals.subtotals.labor_internal) / estimateTotals.subtotals.labor_internal) * 100 : 0
      },
      subcontractors: {
        estimate: estimateTotals.subtotals.subcontractors,
        quote: quote.subtotals.subcontractors,
        difference: quote.subtotals.subcontractors - estimateTotals.subtotals.subcontractors,
        percentageDiff: estimateTotals.subtotals.subcontractors > 0 ? 
          ((quote.subtotals.subcontractors - estimateTotals.subtotals.subcontractors) / estimateTotals.subtotals.subcontractors) * 100 : 0
      },
      materials: {
        estimate: estimateTotals.subtotals.materials,
        quote: quote.subtotals.materials,
        difference: quote.subtotals.materials - estimateTotals.subtotals.materials,
        percentageDiff: estimateTotals.subtotals.materials > 0 ? 
          ((quote.subtotals.materials - estimateTotals.subtotals.materials) / estimateTotals.subtotals.materials) * 100 : 0
      },
      equipment: {
        estimate: estimateTotals.subtotals.equipment,
        quote: quote.subtotals.equipment,
        difference: quote.subtotals.equipment - estimateTotals.subtotals.equipment,
        percentageDiff: estimateTotals.subtotals.equipment > 0 ? 
          ((quote.subtotals.equipment - estimateTotals.subtotals.equipment) / estimateTotals.subtotals.equipment) * 100 : 0
      },
      permits: {
        estimate: 0,
        quote: 0,
        difference: 0,
        percentageDiff: 0
      },
      management: {
        estimate: 0,
        quote: 0,
        difference: 0,
        percentageDiff: 0
      },
      other: {
        estimate: estimateTotals.subtotals.other,
        quote: quote.subtotals.other,
        difference: quote.subtotals.other - estimateTotals.subtotals.other,
        percentageDiff: estimateTotals.subtotals.other > 0 ? 
          ((quote.subtotals.other - estimateTotals.subtotals.other) / estimateTotals.subtotals.other) * 100 : 0
      }
    };

    const categoryMarginAnalysis = {
      labor_internal: {
        yourCost: estimateCosts.costSubtotals.labor_internal,
        yourPrice: estimateTotals.subtotals.labor_internal,
        vendorQuote: quote.subtotals.labor,
        marginIfAccepted: estimateTotals.subtotals.labor_internal > 0 ? 
          ((estimateTotals.subtotals.labor_internal - quote.subtotals.labor) / estimateTotals.subtotals.labor_internal) * 100 : 0,
        minimumAcceptable: estimateCosts.costSubtotals.labor_internal * (1 + targetMargin / 100),
        status: getMarginStatus(estimateTotals.subtotals.labor_internal > 0 ? 
          ((estimateTotals.subtotals.labor_internal - quote.subtotals.labor) / estimateTotals.subtotals.labor_internal) * 100 : 0)
      },
      subcontractors: {
        yourCost: estimateCosts.costSubtotals.subcontractors,
        yourPrice: estimateTotals.subtotals.subcontractors,
        vendorQuote: quote.subtotals.subcontractors,
        marginIfAccepted: estimateTotals.subtotals.subcontractors > 0 ? 
          ((estimateTotals.subtotals.subcontractors - quote.subtotals.subcontractors) / estimateTotals.subtotals.subcontractors) * 100 : 0,
        minimumAcceptable: estimateCosts.costSubtotals.subcontractors * (1 + targetMargin / 100),
        status: getMarginStatus(estimateTotals.subtotals.subcontractors > 0 ? 
          ((estimateTotals.subtotals.subcontractors - quote.subtotals.subcontractors) / estimateTotals.subtotals.subcontractors) * 100 : 0)
      },
      materials: {
        yourCost: estimateCosts.costSubtotals.materials,
        yourPrice: estimateTotals.subtotals.materials,
        vendorQuote: quote.subtotals.materials,
        marginIfAccepted: estimateTotals.subtotals.materials > 0 ? 
          ((estimateTotals.subtotals.materials - quote.subtotals.materials) / estimateTotals.subtotals.materials) * 100 : 0,
        minimumAcceptable: estimateCosts.costSubtotals.materials * (1 + targetMargin / 100),
        status: getMarginStatus(estimateTotals.subtotals.materials > 0 ? 
          ((estimateTotals.subtotals.materials - quote.subtotals.materials) / estimateTotals.subtotals.materials) * 100 : 0)
      },
      equipment: {
        yourCost: estimateCosts.costSubtotals.equipment,
        yourPrice: estimateTotals.subtotals.equipment,
        vendorQuote: quote.subtotals.equipment,
        marginIfAccepted: estimateTotals.subtotals.equipment > 0 ? 
          ((estimateTotals.subtotals.equipment - quote.subtotals.equipment) / estimateTotals.subtotals.equipment) * 100 : 0,
        minimumAcceptable: estimateCosts.costSubtotals.equipment * (1 + targetMargin / 100),
        status: getMarginStatus(estimateTotals.subtotals.equipment > 0 ? 
          ((estimateTotals.subtotals.equipment - quote.subtotals.equipment) / estimateTotals.subtotals.equipment) * 100 : 0)
      },
      permits: {
        yourCost: 0,
        yourPrice: 0,
        vendorQuote: 0,
        marginIfAccepted: 0,
        minimumAcceptable: 0,
        status: 'acceptable' as const
      },
      management: {
        yourCost: 0,
        yourPrice: 0,
        vendorQuote: 0,
        marginIfAccepted: 0,
        minimumAcceptable: 0,
        status: 'acceptable' as const
      },
      other: {
        yourCost: estimateCosts.costSubtotals.other,
        yourPrice: estimateTotals.subtotals.other,
        vendorQuote: quote.subtotals.other,
        marginIfAccepted: estimateTotals.subtotals.other > 0 ? 
          ((estimateTotals.subtotals.other - quote.subtotals.other) / estimateTotals.subtotals.other) * 100 : 0,
        minimumAcceptable: estimateCosts.costSubtotals.other * (1 + targetMargin / 100),
        status: getMarginStatus(estimateTotals.subtotals.other > 0 ? 
          ((estimateTotals.subtotals.other - quote.subtotals.other) / estimateTotals.subtotals.other) * 100 : 0)
      }
    };

    return {
      estimateTotal,
      quoteTotal,
      difference,
      percentageDiff,
      categoryComparisons,
      yourTotalCost,
      yourTotalPrice,
      vendorQuote,
      marginIfAccepted,
      minimumAcceptableQuote,
      marginStatus,
      categoryMarginAnalysis
    };
  };

  const comparison = calculateMarginComparison();

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return "text-destructive"; // Higher than estimate = red
    if (difference < 0) return "text-green-600"; // Lower than estimate = green
    return "text-muted-foreground";
  };

  const getDifferenceIcon = (difference: number) => {
    if (difference > 0) return <TrendingUp className="h-4 w-4" />; // Higher = up arrow
    if (difference < 0) return <TrendingDown className="h-4 w-4" />; // Lower = down arrow
    return null;
  };

  const formatDifference = (difference: number, percentage: number) => {
    const sign = difference >= 0 ? "+" : "";
    return `${sign}$${difference.toFixed(2)} (${sign}${percentage.toFixed(1)}%)`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quotes
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{quote.projectName}</h2>
          <p className="text-muted-foreground">
            Estimate vs Quote Comparison
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${comparison.yourTotalCost.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Actual cost basis
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${comparison.yourTotalPrice.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {estimate.estimate_number}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendor Quote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${comparison.vendorQuote.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {quote.quotedBy}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Margin if Accepted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${getMarginStatusColor(comparison.marginStatus)}`}>
              {comparison.marginIfAccepted.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={
                comparison.marginStatus === 'excellent' ? 'default' :
                comparison.marginStatus === 'acceptable' ? 'secondary' :
                comparison.marginStatus === 'marginal' ? 'outline' : 'destructive'
              }>
                {comparison.marginStatus.charAt(0).toUpperCase() + comparison.marginStatus.slice(1)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Minimum Acceptable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${comparison.minimumAcceptableQuote.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {estimate.targetMarginPercent || 20}% target margin
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Margin Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Margin Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">${(comparison.yourTotalPrice - comparison.vendorQuote).toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Margin Dollar Impact</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">${(comparison.vendorQuote - comparison.yourTotalCost).toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Profit Above Cost</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className={`text-2xl font-bold ${
                comparison.vendorQuote <= comparison.minimumAcceptableQuote ? 'text-green-600' : 'text-destructive'
              }`}>
                {comparison.vendorQuote <= comparison.minimumAcceptableQuote ? 'ACCEPT' : 'NEGOTIATE'}
              </div>
              <div className="text-sm text-muted-foreground">Recommendation</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {(Object.keys(comparison.categoryComparisons) as Array<keyof typeof comparison.categoryComparisons>).map((category) => {
              const categoryData = comparison.categoryComparisons[category];
              
              return (
                <div key={category} className="space-y-3">
                  <h4 className="font-semibold text-lg">{CATEGORY_DISPLAY_MAP[category]}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Your Cost</div>
                      <div className="font-semibold">${comparison.categoryMarginAnalysis[category].yourCost.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Your Price</div>
                      <div className="font-semibold">${comparison.categoryMarginAnalysis[category].yourPrice.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Vendor Quote</div>
                      <div className="font-semibold">${comparison.categoryMarginAnalysis[category].vendorQuote.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Your Margin</div>
                      <div className={`font-semibold ${getMarginStatusColor(comparison.categoryMarginAnalysis[category].status)}`}>
                        {comparison.categoryMarginAnalysis[category].marginIfAccepted.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Min Acceptable</div>
                      <div className="font-semibold">${comparison.categoryMarginAnalysis[category].minimumAcceptable.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge 
                        variant={
                          comparison.categoryMarginAnalysis[category].status === 'excellent' ? "default" :
                          comparison.categoryMarginAnalysis[category].status === 'acceptable' ? "secondary" :
                          comparison.categoryMarginAnalysis[category].status === 'marginal' ? "outline" :
                          "destructive"
                        }
                      >
                        {comparison.categoryMarginAnalysis[category].status.charAt(0).toUpperCase() + 
                         comparison.categoryMarginAnalysis[category].status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  {category !== "other" && <Separator />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Line Items Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estimate Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Original Estimate Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {estimate.lineItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.category} • {item.quantity} × ${item.pricePerUnit.toFixed(2)}
                    </div>
                  </div>
                  <div className="font-semibold">${item.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quote Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quote Items ({quote.quotedBy})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quote.lineItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.category} • {item.quantity} × ${item.pricePerUnit.toFixed(2)}
                    </div>
                  </div>
                  <div className="font-semibold">${item.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quote Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};