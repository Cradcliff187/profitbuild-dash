import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuoteStatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  TrendingUp
} from "lucide-react";
import { useEstimateQuoteStatus, EstimateLineItemQuoteStatus } from "@/hooks/useEstimateQuoteStatus";
import { CATEGORY_DISPLAY_MAP } from "@/types/estimate";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BrandedLoader } from "@/components/ui/branded-loader";

interface EstimateQuoteStatusViewProps {
  estimateId: string;
}

const getQuoteStatusBadgeVariant = (hasQuotes: boolean, hasAccepted: boolean) => {
  if (hasAccepted) return 'default';
  if (hasQuotes) return 'secondary';
  return 'destructive';
};

const getQuoteStatusLabel = (hasQuotes: boolean, hasAccepted: boolean, quoteCount: number) => {
  if (hasAccepted) return `Accepted (${quoteCount})`;
  if (hasQuotes) return `Pending (${quoteCount})`;
  return 'No Quotes';
};

// Removed - now using QuoteStatusBadge component

export function EstimateQuoteStatusView({ estimateId }: EstimateQuoteStatusViewProps) {
  const { lineItems, summary, isLoading, error } = useEstimateQuoteStatus(estimateId);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <BrandedLoader message="Loading quote status..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!summary || lineItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">No line items found for this estimate</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Line Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.total_line_items}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              With Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {summary.line_items_with_quotes}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.quote_coverage_percent.toFixed(1)}% coverage
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Without Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {summary.line_items_without_quotes}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(
                (summary.line_items_without_quotes / summary.total_line_items) * 100
              ).toFixed(1)}% need quotes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accepted Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {summary.line_items_with_accepted_quotes}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.total_accepted_quotes} accepted total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Quote Coverage</span>
              <span className="text-muted-foreground">
                {summary.quote_coverage_percent.toFixed(1)}%
              </span>
            </div>
            <Progress value={summary.quote_coverage_percent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {summary.line_items_with_quotes} of {summary.total_line_items} items have quotes
              </span>
              <span>{summary.total_quotes_received} quotes received</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items Quote Status</CardTitle>
          <CardDescription>
            Detailed view of each line item and its quote status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full border rounded-md" style={{ maxHeight: 'calc(100vh - 500px)' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price/Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Quote Status</TableHead>
                  <TableHead className="text-center">Quotes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => {
                  const isExpanded = expandedItems.has(item.line_item_id);
                  const hasQuotes = item.has_quotes;
                  const hasAccepted = item.has_accepted_quote;
                  
                  return (
                    <>
                      <TableRow 
                        key={item.line_item_id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          !hasQuotes && "bg-red-50/50"
                        )}
                        onClick={() => toggleItem(item.line_item_id)}
                      >
                        <TableCell>
                          {item.quote_count > 0 ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )
                          ) : (
                            <div className="w-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_DISPLAY_MAP[item.category] || item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={item.description}>
                            {item.description}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.unit || ''}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price_per_unit)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={getQuoteStatusBadgeVariant(hasQuotes, hasAccepted) as any}
                            className="text-xs"
                          >
                            {getQuoteStatusLabel(hasQuotes, hasAccepted, item.quote_count)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quote_count > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              {item.accepted_quote_count > 0 && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                              {item.pending_quote_count > 0 && (
                                <Clock className="h-4 w-4 text-yellow-600" />
                              )}
                              {item.rejected_quote_count > 0 && (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="text-sm font-medium">{item.quote_count}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expandable Quote Details */}
                      {isExpanded && item.quote_count > 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-3">
                              <div className="font-medium text-sm mb-3">Linked Quotes:</div>
                              <div className="grid gap-3">
                                {item.quote_details.map((quote, quoteIndex) => (
                                  <div
                                    key={quote.quote_id}
                                    className="flex items-center justify-between p-3 bg-background border rounded-lg"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <FileText className="h-4 w-4 text-muted-foreground" />
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">
                                          {quote.quote_number}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {quote.vendor || 'Unknown Vendor'}
                                        </div>
                                      </div>
                                      <QuoteStatusBadge status={quote.status} size="sm" />
                                    </div>
                                    <div className="flex items-center gap-4 ml-4">
                                      <div className="text-right">
                                        <div className="text-sm font-medium">
                                          {formatCurrency(quote.total_amount || 0)}
                                        </div>
                                        {quote.date_received && (
                                          <div className="text-xs text-muted-foreground">
                                            {format(new Date(quote.date_received), 'MMM dd, yyyy')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.total_quotes_received}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Quotes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.total_accepted_quotes}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Accepted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.total_pending_quotes}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {summary.total_rejected_quotes}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Rejected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {summary.total_expired_quotes}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Expired</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

