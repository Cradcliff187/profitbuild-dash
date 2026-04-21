import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, GitCompare, Pencil, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { QuoteStatusSelector } from "@/components/QuoteStatusSelector";
import { QuoteStatus, type Quote } from "@/types/quote";
import { isFeatureEnabled } from "@/lib/featureFlags";
import type { MarginIfAccepted, SignedCostVariance } from "@/utils/quoteFinancials";

interface QuoteViewHeroProps {
  quote: Quote;
  variance: SignedCostVariance;
  margin: MarginIfAccepted;
  currentStatus: QuoteStatus | string;
  hasGeneratedContract: boolean;
  peerCount?: number;
  onStatusChange: (next: QuoteStatus) => void;
  onEdit: () => void;
  onGenerateContract: () => void;
  onCompare?: () => void;
}

export function QuoteViewHero({
  quote,
  variance,
  margin,
  currentStatus,
  hasGeneratedContract,
  peerCount = 0,
  onStatusChange,
  onEdit,
  onGenerateContract,
  onCompare,
}: QuoteViewHeroProps) {
  const [editGuardOpen, setEditGuardOpen] = useState(false);
  const isAccepted =
    currentStatus === QuoteStatus.ACCEPTED || currentStatus === "accepted";

  const varianceTone =
    variance.status === "under"
      ? "text-emerald-600 dark:text-emerald-400"
      : variance.status === "over"
      ? "text-orange-600 dark:text-orange-400"
      : variance.status === "on"
      ? "text-foreground"
      : "text-muted-foreground";

  const VarianceIcon =
    variance.status === "under"
      ? TrendingDown
      : variance.status === "over"
      ? TrendingUp
      : null;

  const varianceDisplay = (() => {
    if (variance.status === "none" || variance.signedAmount === null) {
      return { headline: "No baseline", sub: "Quote has no matched estimate lines" };
    }
    if (variance.status === "on") {
      return {
        headline: formatCurrency(0),
        sub: "On estimate",
      };
    }
    const sign = variance.status === "under" ? "−" : "+";
    return {
      headline: `${sign}${formatCurrency(variance.amount)}`,
      sub:
        variance.status === "under"
          ? `Under estimate by ${variance.percentage.toFixed(1)}%`
          : `Over estimate by ${variance.percentage.toFixed(1)}%`,
    };
  })();

  const handleEditClick = () => {
    if (isAccepted && hasGeneratedContract) {
      setEditGuardOpen(true);
    } else {
      onEdit();
    }
  };

  return (
    <>
      <Card className="mb-4 overflow-hidden">
        <CardContent className="p-0">
          <div className="grid gap-0 xl:grid-cols-[minmax(260px,1fr)_auto_auto]">
            {/* Identity */}
            <div className="p-5 md:p-6 border-b xl:border-b-0 xl:border-r border-border/60 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] font-medium text-muted-foreground mb-1.5">
                Quote {quote.quoteNumber}
              </p>
              <h2
                className="text-xl md:text-2xl font-semibold tracking-tight truncate"
                title={quote.quotedBy}
              >
                {quote.quotedBy}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Received {format(new Date(quote.dateReceived), "MMM d, yyyy")}
                {quote.valid_until && (
                  <>
                    {" · Valid until "}
                    {format(new Date(quote.valid_until), "MMM d, yyyy")}
                  </>
                )}
              </p>
            </div>

            {/* Variance — the one screaming number */}
            <div className="px-5 py-5 md:px-8 md:py-6 border-b xl:border-b-0 xl:border-r border-border/60 flex flex-col justify-center xl:min-w-[220px]">
              <p className="text-[11px] uppercase tracking-[0.14em] font-medium text-muted-foreground mb-1.5">
                vs Estimate
              </p>
              <div className={cn("flex items-baseline gap-2", varianceTone)}>
                {VarianceIcon && (
                  <VarianceIcon className="h-5 w-5 self-center shrink-0" />
                )}
                <span className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums leading-none">
                  {varianceDisplay.headline}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                {varianceDisplay.sub}
              </p>
              {variance.baseline !== null && (
                <p className="text-[11px] text-muted-foreground/80 mt-1 tabular-nums">
                  {formatCurrency(variance.quotedCost)} quoted ·{" "}
                  {formatCurrency(variance.baseline)} estimated
                </p>
              )}
              {margin.available && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-medium text-muted-foreground mb-1">
                    Margin if accepted
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-lg font-semibold tabular-nums",
                        margin.status === "excellent"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : margin.status === "on-target"
                          ? "text-foreground"
                          : margin.status === "marginal"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {margin.marginPercent.toFixed(1)}%
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      target {margin.targetMarginPercent}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-5 md:p-6 flex flex-col gap-3 xl:min-w-[220px]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] font-medium text-muted-foreground mb-1.5">
                  Status
                </p>
                <QuoteStatusSelector
                  quoteId={quote.id}
                  currentStatus={currentStatus as QuoteStatus}
                  quoteNumber={quote.quoteNumber}
                  payeeName={quote.quotedBy}
                  projectId={quote.project_id}
                  totalAmount={variance.quotedCost}
                  onStatusChange={onStatusChange}
                  showLabel={false}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditClick}
                  className="flex-1"
                  data-testid="quote-edit-btn"
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                {isAccepted && isFeatureEnabled("contracts") && (
                  <Button
                    size="sm"
                    onClick={onGenerateContract}
                    className="flex-1"
                    data-testid="generate-contract-btn"
                  >
                    <FileText className="h-4 w-4 mr-1.5" />
                    {hasGeneratedContract ? "Regenerate" : "Contract"}
                  </Button>
                )}
              </div>
              {onCompare && peerCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCompare}
                  className="justify-start -ml-2 text-muted-foreground hover:text-foreground"
                  data-testid="quote-compare-btn"
                >
                  <GitCompare className="h-4 w-4 mr-1.5" />
                  Compare vs {peerCount}{" "}
                  {peerCount === 1 ? "peer" : "peers"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={editGuardOpen} onOpenChange={setEditGuardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit accepted quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This quote has a generated contract. Editing will leave the
              contract out of date — you'll need to regenerate it after saving
              your changes. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEditGuardOpen(false);
                onEdit();
              }}
            >
              Edit anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
