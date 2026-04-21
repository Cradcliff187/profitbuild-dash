import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { ListChecks, Link2Off } from "lucide-react";
import type { Quote, QuoteLineItem } from "@/types/quote";
import type { Estimate, LineItem } from "@/types/estimate";
import { getEstimateForQuote } from "@/utils/quoteFinancials";

interface QuoteCoverageCardProps {
  quote: Quote;
  estimates: Estimate[];
}

interface CoverageRow {
  key: string;
  description: string;
  category: string;
  quotedCost: number;
  estimatedCost: number | null;
  delta: number | null;
  unmatched: boolean;
  changeOrderNumber?: string;
}

function buildRows(quote: Quote, estimate: Estimate | undefined): CoverageRow[] {
  const estimateLines: LineItem[] = estimate?.lineItems ?? [];
  return quote.lineItems.map((qli: QuoteLineItem) => {
    const linkId = qli.estimateLineItemId || qli.estimate_line_item_id;
    const match = linkId ? estimateLines.find((l) => l.id === linkId) : undefined;
    const quotedCost = Number(qli.totalCost ?? qli.quantity * qli.costPerUnit ?? 0);
    const estimatedCost = match ? Number(match.totalCost ?? 0) : null;
    const delta = estimatedCost !== null ? quotedCost - estimatedCost : null;
    return {
      key: qli.id,
      description: qli.description || match?.description || "Untitled line",
      category: qli.category,
      quotedCost,
      estimatedCost,
      delta,
      unmatched: !match && !qli.changeOrderLineItemId,
      changeOrderNumber: qli.changeOrderNumber,
    };
  });
}

export function QuoteCoverageCard({ quote, estimates }: QuoteCoverageCardProps) {
  const estimate = getEstimateForQuote(quote, estimates);
  const rows = buildRows(quote, estimate);

  const totalQuoted = rows.reduce((sum, r) => sum + r.quotedCost, 0);
  const totalEstimated = rows.reduce(
    (sum, r) => sum + (r.estimatedCost ?? 0),
    0
  );
  const matchedRows = rows.filter((r) => r.estimatedCost !== null);
  const totalDelta = matchedRows.length
    ? totalQuoted -
      matchedRows.reduce((sum, r) => sum + (r.estimatedCost ?? 0), 0)
    : null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Coverage
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {rows.length} {rows.length === 1 ? "line" : "lines"}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            {quote.includes_labor && (
              <Badge variant="outline" className="text-[10px] font-normal">
                Labor
              </Badge>
            )}
            {quote.includes_materials && (
              <Badge variant="outline" className="text-[10px] font-normal">
                Materials
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            This quote has no line items.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((row) => (
              <CoverageRowItem key={row.key} row={row} />
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border bg-muted/30 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
            <div className="flex items-baseline justify-between gap-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Totals
              </div>
              <div className="flex items-baseline gap-6 tabular-nums">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Estimated
                  </div>
                  <div className="text-sm font-medium">
                    {formatCurrency(totalEstimated)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Quoted
                  </div>
                  <div className="text-sm font-semibold">
                    {formatCurrency(totalQuoted)}
                  </div>
                </div>
                {totalDelta !== null && (
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Δ
                    </div>
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        totalDelta < 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : totalDelta > 0
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {totalDelta < 0 ? "−" : totalDelta > 0 ? "+" : ""}
                      {formatCurrency(Math.abs(totalDelta))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoverageRowItem({ row }: { row: CoverageRow }) {
  const deltaTone =
    row.delta === null
      ? "text-muted-foreground"
      : row.delta < 0
      ? "text-emerald-600 dark:text-emerald-400"
      : row.delta > 0
      ? "text-orange-600 dark:text-orange-400"
      : "text-muted-foreground";

  return (
    <div className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {row.description}
          </span>
          {row.changeOrderNumber && (
            <Badge variant="outline" className="text-[10px] font-normal shrink-0">
              CO {row.changeOrderNumber}
            </Badge>
          )}
          {row.unmatched && (
            <Badge
              variant="outline"
              className="text-[10px] font-normal shrink-0 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800"
            >
              <Link2Off className="h-2.5 w-2.5 mr-1" />
              Unmatched
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
          {row.category.replace(/_/g, " ")}
        </p>
      </div>
      <div className="flex items-baseline gap-4 tabular-nums shrink-0 text-right">
        {row.estimatedCost !== null && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Est
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(row.estimatedCost)}
            </div>
          </div>
        )}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Quoted
          </div>
          <div className="text-sm font-medium">
            {formatCurrency(row.quotedCost)}
          </div>
        </div>
        {row.delta !== null && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Δ
            </div>
            <div className={cn("text-sm font-medium", deltaTone)}>
              {row.delta < 0 ? "−" : row.delta > 0 ? "+" : ""}
              {formatCurrency(Math.abs(row.delta))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
