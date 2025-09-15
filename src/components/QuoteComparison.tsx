import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Quote } from "@/types/quote";
import { Estimate } from "@/types/estimate";
import { ComparisonData } from "@/types/quote";

interface QuoteComparisonProps {
  quote: Quote;
  estimate: Estimate;
  onBack: () => void;
}

export const QuoteComparison = ({ quote, estimate, onBack }: QuoteComparisonProps) => {
  const calculateComparison = (): ComparisonData => {
    const estimateTotal = estimate.total;
    const quoteTotal = quote.total;
    const difference = quoteTotal - estimateTotal;
    const percentageDiff = estimateTotal > 0 ? (difference / estimateTotal) * 100 : 0;

    const categoryComparisons = {
      "Labor (Internal)": {
        estimate: estimate.subtotals.labor,
        quote: quote.subtotals.labor,
        difference: quote.subtotals.labor - estimate.subtotals.labor,
        percentageDiff: estimate.subtotals.labor > 0 ? 
          ((quote.subtotals.labor - estimate.subtotals.labor) / estimate.subtotals.labor) * 100 : 0
      },
      "Subcontractors": {
        estimate: estimate.subtotals.subcontractors,
        quote: quote.subtotals.subcontractors,
        difference: quote.subtotals.subcontractors - estimate.subtotals.subcontractors,
        percentageDiff: estimate.subtotals.subcontractors > 0 ? 
          ((quote.subtotals.subcontractors - estimate.subtotals.subcontractors) / estimate.subtotals.subcontractors) * 100 : 0
      },
      Materials: {
        estimate: estimate.subtotals.materials,
        quote: quote.subtotals.materials,
        difference: quote.subtotals.materials - estimate.subtotals.materials,
        percentageDiff: estimate.subtotals.materials > 0 ? 
          ((quote.subtotals.materials - estimate.subtotals.materials) / estimate.subtotals.materials) * 100 : 0
      },
      Equipment: {
        estimate: estimate.subtotals.equipment,
        quote: quote.subtotals.equipment,
        difference: quote.subtotals.equipment - estimate.subtotals.equipment,
        percentageDiff: estimate.subtotals.equipment > 0 ? 
          ((quote.subtotals.equipment - estimate.subtotals.equipment) / estimate.subtotals.equipment) * 100 : 0
      },
      Other: {
        estimate: estimate.subtotals.other,
        quote: quote.subtotals.other,
        difference: quote.subtotals.other - estimate.subtotals.other,
        percentageDiff: estimate.subtotals.other > 0 ? 
          ((quote.subtotals.other - estimate.subtotals.other) / estimate.subtotals.other) * 100 : 0
      }
    };

    return {
      estimateTotal,
      quoteTotal,
      difference,
      percentageDiff,
      categoryComparisons
    };
  };

  const comparison = calculateComparison();

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return "text-destructive";
    if (difference < 0) return "text-green-600";
    return "text-muted-foreground";
  };

  const getDifferenceIcon = (difference: number) => {
    if (difference > 0) return <TrendingUp className="h-4 w-4" />;
    if (difference < 0) return <TrendingDown className="h-4 w-4" />;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Original Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${comparison.estimateTotal.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {estimate.estimateNumber} • {format(estimate.date, "MMM dd, yyyy")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actual Quote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${comparison.quoteTotal.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {quote.quotedBy} • {format(quote.dateReceived, "MMM dd, yyyy")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-2 ${getDifferenceColor(comparison.difference)}`}>
              {getDifferenceIcon(comparison.difference)}
              ${Math.abs(comparison.difference).toFixed(2)}
            </div>
            <Badge 
              variant={
                comparison.difference > 0 ? "destructive" : 
                comparison.difference < 0 ? "default" : 
                "secondary"
              }
              className="mt-2"
            >
              {comparison.difference > 0 ? "Over Budget" : 
               comparison.difference < 0 ? "Under Budget" : 
               "On Budget"}
              {comparison.difference !== 0 && ` (${Math.abs(comparison.percentageDiff).toFixed(1)}%)`}
            </Badge>
          </CardContent>
        </Card>
      </div>

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
                  <h4 className="font-semibold text-lg">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Estimate</div>
                      <div className="font-semibold">${categoryData.estimate.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Quote</div>
                      <div className="font-semibold">${categoryData.quote.toFixed(2)}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Difference</div>
                      <div className={`font-semibold flex items-center gap-2 ${getDifferenceColor(categoryData.difference)}`}>
                        {getDifferenceIcon(categoryData.difference)}
                        {formatDifference(categoryData.difference, categoryData.percentageDiff)}
                      </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge 
                        variant={
                          categoryData.difference > 0 ? "destructive" : 
                          categoryData.difference < 0 ? "default" : 
                          "secondary"
                        }
                      >
                        {categoryData.difference > 0 ? "Over" : 
                         categoryData.difference < 0 ? "Under" : 
                         "On Target"}
                      </Badge>
                    </div>
                  </div>
                  {category !== "Other" && <Separator />}
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
                      {item.category} • {item.quantity} × ${item.rate.toFixed(2)}
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
                      {item.category} • {item.quantity} × ${item.rate.toFixed(2)}
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