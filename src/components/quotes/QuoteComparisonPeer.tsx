import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Award,
  ChevronRight,
  Crown,
  Users,
  XCircle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Quote } from "@/types/quote";
import type { Estimate } from "@/types/estimate";
import {
  getQuotePeersByLineItem,
  type LineItemPeers,
  type PeerBid,
} from "@/utils/quoteFinancials";

interface QuoteComparisonPeerProps {
  quote: Quote;
  quotes: Quote[];
  estimates: Estimate[];
  onBack: () => void;
  /** Optional: the URL prefix for linking to a peer quote's view (defaults to sidebar /quotes flow via onOpenPeer) */
  peerHrefBuilder?: (peerQuoteId: string) => string;
  /** Alternative to peerHrefBuilder when view is state-machine based */
  onOpenPeer?: (peerQuoteId: string) => void;
}

export function QuoteComparisonPeer({
  quote,
  quotes,
  estimates,
  onBack,
  peerHrefBuilder,
  onOpenPeer,
}: QuoteComparisonPeerProps) {
  const lines = useMemo(
    () => getQuotePeersByLineItem(quote, quotes, estimates),
    [quote, quotes, estimates]
  );

  const linesWithPeers = lines.filter((l) => l.bids.length > 1);
  const soloLines = lines.filter((l) => l.bids.length <= 1);

  const summary = useMemo(() => {
    const myLines = lines.filter((l) => l.myBid);
    const peerQuoteIds = new Set<string>();
    let wins = 0; // number of line items where I'm the lowest bidder
    for (const l of myLines) {
      for (const b of l.bids) if (!b.isCurrent) peerQuoteIds.add(b.quoteId);
      const lowest = l.bids[0];
      if (lowest && lowest.isCurrent) wins += 1;
    }
    return {
      peerVendors: peerQuoteIds.size,
      lineCount: myLines.length,
      linesWithCompetition: linesWithPeers.length,
      wins,
    };
  }, [lines, linesWithPeers.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {quote.quoteNumber}
          </span>
          <span className="text-sm font-semibold">{quote.quotedBy}</span>
        </div>
      </div>

      {/* Summary strip */}
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <SummaryStat
              label="Lines you bid"
              value={String(summary.lineCount)}
            />
            <SummaryStat
              label="With competition"
              value={String(summary.linesWithCompetition)}
              sub={
                summary.linesWithCompetition < summary.lineCount
                  ? `${summary.lineCount - summary.linesWithCompetition} sole-source`
                  : undefined
              }
            />
            <SummaryStat
              label="Peer vendors"
              value={String(summary.peerVendors)}
              icon={Users}
            />
            <SummaryStat
              label="You're lowest on"
              value={`${summary.wins} of ${summary.lineCount}`}
              icon={Crown}
              highlight={summary.wins === summary.lineCount && summary.lineCount > 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Per-line leaderboards */}
      {linesWithPeers.length === 0 && soloLines.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <XCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm font-medium">No competing bids yet</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              No other quote in this project references the {soloLines.length}{" "}
              line {soloLines.length === 1 ? "item" : "items"} this quote
              covers. Invite more vendors to bid on the same scope to enable
              comparison.
            </p>
          </CardContent>
        </Card>
      )}

      {linesWithPeers.map((line) => (
        <LineBoard
          key={line.estimateLineItemId}
          line={line}
          peerHrefBuilder={peerHrefBuilder}
          onOpenPeer={onOpenPeer}
        />
      ))}

      {/* Sole-source footer (only when we ALSO have peer lines — otherwise the empty state above handles it) */}
      {linesWithPeers.length > 0 && soloLines.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              Sole-source lines
              <Badge variant="outline" className="text-[10px]">
                {soloLines.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-xs text-muted-foreground space-y-1">
              {soloLines.map((l) => (
                <li key={l.estimateLineItemId} className="flex justify-between gap-4">
                  <span className="truncate">{l.description}</span>
                  <span className="tabular-nums shrink-0">
                    {formatCurrency(l.myBid?.costOnThisLine ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground/80 mt-3">
              No peer bids on these lines — price is whatever this vendor
              charges. Consider soliciting alternate quotes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              highlight ? "text-orange-500" : "text-muted-foreground"
            )}
          />
        )}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight mt-1",
          highlight && "text-orange-600 dark:text-orange-400"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      )}
    </div>
  );
}

function LineBoard({
  line,
  peerHrefBuilder,
  onOpenPeer,
}: {
  line: LineItemPeers;
  peerHrefBuilder?: (id: string) => string;
  onOpenPeer?: (id: string) => void;
}) {
  const myRank =
    line.myBid !== undefined
      ? line.bids.findIndex((b) => b.isCurrent) + 1
      : undefined;
  const lowestBid = line.bids[0];
  const rankLabel = myRank ? `#${myRank} of ${line.bids.length}` : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{line.description}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] font-normal capitalize">
                {line.category.replace(/_/g, " ")}
              </Badge>
              {line.estimatedCost !== null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  Estimate {formatCurrency(line.estimatedCost)}
                </span>
              )}
            </div>
          </div>
          {rankLabel && (
            <Badge
              className={cn(
                "text-xs shrink-0",
                myRank === 1
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border"
              )}
              variant="outline"
            >
              {myRank === 1 && <Crown className="h-3 w-3 mr-1" />}
              {rankLabel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="divide-y divide-border/60">
          {line.bids.map((bid, idx) => (
            <BidRow
              key={bid.quoteId}
              bid={bid}
              rank={idx + 1}
              isLowest={bid === lowestBid}
              estimatedCost={line.estimatedCost}
              peerHrefBuilder={peerHrefBuilder}
              onOpenPeer={onOpenPeer}
            />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function BidRow({
  bid,
  rank,
  isLowest,
  estimatedCost,
  peerHrefBuilder,
  onOpenPeer,
}: {
  bid: PeerBid;
  rank: number;
  isLowest: boolean;
  estimatedCost: number | null;
  peerHrefBuilder?: (id: string) => string;
  onOpenPeer?: (id: string) => void;
}) {
  const statusTone: Record<string, string> = {
    accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    rejected: "bg-muted text-muted-foreground border-border opacity-70",
    expired: "bg-muted text-muted-foreground border-border opacity-70",
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  };

  const demoted = bid.status === "rejected" || bid.status === "expired";
  const delta =
    estimatedCost !== null ? bid.costOnThisLine - estimatedCost : null;

  const nameClass = cn(
    "text-sm font-medium truncate",
    bid.isCurrent && "text-foreground",
    demoted && !bid.isCurrent && "text-muted-foreground line-through decoration-muted-foreground/40"
  );

  const content = (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5",
        bid.isCurrent && "bg-orange-500/5 -mx-4 px-4 rounded"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs tabular-nums text-muted-foreground w-6 shrink-0">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={nameClass}>{bid.vendor}</span>
            {bid.isCurrent && (
              <Badge
                variant="outline"
                className="text-[10px] bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30"
              >
                You
              </Badge>
            )}
            {isLowest && !demoted && (
              <Badge
                variant="outline"
                className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              >
                <Award className="h-2.5 w-2.5 mr-0.5" />
                Lowest
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("text-[10px] capitalize", statusTone[bid.status])}
            >
              {bid.status}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {bid.quoteNumber}
          </p>
        </div>
      </div>
      <div className="flex items-baseline gap-4 tabular-nums shrink-0">
        <div className="text-right">
          <div className="text-sm font-semibold">
            {formatCurrency(bid.costOnThisLine)}
          </div>
          {delta !== null && delta !== 0 && (
            <div
              className={cn(
                "text-[10px]",
                delta < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-orange-600 dark:text-orange-400"
              )}
            >
              {delta < 0 ? "−" : "+"}
              {formatCurrency(Math.abs(delta))} vs est
            </div>
          )}
        </div>
        {!bid.isCurrent && (peerHrefBuilder || onOpenPeer) && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  // Interactive rendering: peer rows are clickable to open that quote
  if (!bid.isCurrent && peerHrefBuilder) {
    return (
      <li>
        <Link
          to={peerHrefBuilder(bid.quoteId)}
          className="block hover:bg-muted/50 -mx-4 px-4 rounded transition-colors"
        >
          {content}
        </Link>
      </li>
    );
  }
  if (!bid.isCurrent && onOpenPeer) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onOpenPeer(bid.quoteId)}
          className="w-full text-left hover:bg-muted/50 -mx-4 px-4 rounded transition-colors"
        >
          {content}
        </button>
      </li>
    );
  }
  return <li>{content}</li>;
}
