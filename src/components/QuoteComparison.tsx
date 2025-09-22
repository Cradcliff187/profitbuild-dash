import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Quote } from "@/types/quote";
import { Estimate, LineItemCategory, CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { MarginComparisonData } from "@/types/quote";
import { VarianceBadge } from "@/components/ui/variance-badge";
import { calculateQuoteFinancials, compareQuoteToEstimate } from "@/utils/quoteFinancials";
import { calculateEstimateFinancials } from "@/utils/estimateFinancials";

interface QuoteComparisonProps {
  quote: Quote;
  estimate: Estimate;
  onBack: () => void;
}

export const QuoteComparison = ({ quote, estimate, onBack }: QuoteComparisonProps) => {
  // Calculate financial metrics using the new utilities
  const quoteFinancials = calculateQuoteFinancials(quote.lineItems);
  const estimateFinancials = calculateEstimateFinancials(estimate.lineItems);
  const categoryComparison = compareQuoteToEstimate(quote.lineItems, estimate.lineItems);

  // Enhanced margin calculations
  const yourTotalCost = estimateFinancials.totalCost;
  const yourTotalPrice = estimateFinancials.totalAmount;
  const vendorQuote = quoteFinancials.totalAmount;
  const vendorCost = quoteFinancials.totalCost;
  
  // Calculate your margin impact if you accept this quote
  const marginIfAccepted = yourTotalPrice > 0 ? ((yourTotalPrice - vendorQuote) / yourTotalPrice) * 100 : 0;
  const targetMargin = estimate.targetMarginPercent || 20;
  const minimumAcceptableQuote = yourTotalCost * (1 + targetMargin / 100);
  
  const getMarginStatus = (marginPercent: number): 'excellent' | 'acceptable' | 'marginal' | 'loss' => {
    if (marginPercent < 0) return 'loss';
    if (marginPercent < 10) return 'marginal';
    if (marginPercent < targetMargin) return 'acceptable';
    return 'excellent';
  };

  const marginStatus = getMarginStatus(marginIfAccepted);

  const getMarginStatusColor = (status: 'excellent' | 'acceptable' | 'marginal' | 'loss') => {
    switch (status) {
      case 'excellent': return 'text-primary';
      case 'acceptable': return 'text-green-600';
      case 'marginal': return 'text-yellow-600';
      case 'loss': return 'text-destructive';
    }
  };

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
            <div className="text-xl font-bold">${yourTotalCost.toFixed(2)}</div>
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
            <div className="text-xl font-bold">${yourTotalPrice.toFixed(2)}</div>
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
            <div className="text-xl font-bold">${vendorQuote.toFixed(2)}</div>
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
            <div className={`text-xl font-bold ${getMarginStatusColor(marginStatus)}`}>
              {marginIfAccepted.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant={
                marginStatus === 'excellent' ? 'default' :
                marginStatus === 'acceptable' ? 'secondary' :
                marginStatus === 'marginal' ? 'outline' : 'destructive'
              }>
                {marginStatus.charAt(0).toUpperCase() + marginStatus.slice(1)}
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
            <div className="text-xl font-bold">${minimumAcceptableQuote.toFixed(2)}</div>
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