import { CalendarClock, FileCheck2, FileSignature, FileText, Receipt, Table2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { EstimateConnectionsSummary as SummaryData } from "@/utils/estimateConnections";

interface RowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  amount?: number;
}

const SummaryRow = ({ icon: Icon, label, amount }: RowProps) => (
  <div className="flex items-center justify-between gap-2">
    <span className="flex items-center gap-2 min-w-0">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </span>
    {amount !== undefined && (
      <span className="font-medium tabular-nums shrink-0">{formatCurrency(amount)}</span>
    )}
  </div>
);

const plural = (n: number, singular: string, pluralWord?: string) =>
  `${n} ${n === 1 ? singular : (pluralWord ?? `${singular}s`)}`;

interface EstimateConnectionsSummaryProps {
  loading: boolean;
  data: SummaryData | null;
  title: string;
  note?: string;
}

/**
 * Compact "what's attached to this estimate" block rendered inside the
 * status-change confirmation dialog. Renders nothing when the fetch settled
 * with no connections; shows skeleton rows while loading.
 */
export const EstimateConnectionsSummary = ({
  loading,
  data,
  title,
  note,
}: EstimateConnectionsSummaryProps) => {
  if (!loading && !data?.hasAny) return null;

  return (
    <div className="rounded-md border border-warning/50 bg-warning/5 p-3 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>

      {loading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : data ? (
        <div className="space-y-1 text-sm">
          {data.acceptedQuoteCount > 0 && (
            <SummaryRow
              icon={FileCheck2}
              label={plural(data.acceptedQuoteCount, "accepted quote")}
              amount={data.acceptedQuoteTotal}
            />
          )}
          {data.otherQuoteCount > 0 && (
            <SummaryRow
              icon={FileText}
              label={plural(data.otherQuoteCount, "other attached quote")}
            />
          )}
          {data.allocationCount > 0 && (
            <SummaryRow
              icon={Receipt}
              label={plural(data.allocationCount, "expense allocation")}
              amount={data.allocationTotal}
            />
          )}
          {data.assignmentCount > 0 && (
            <SummaryRow
              icon={CalendarClock}
              label={plural(data.assignmentCount, "dispatch assignment link")}
            />
          )}
          {data.contractCount > 0 && (
            <SummaryRow
              icon={FileSignature}
              label={plural(data.contractCount, "generated contract")}
            />
          )}
          {data.hasSov && (
            <SummaryRow icon={Table2} label="AIA Schedule of Values built from this estimate" />
          )}
        </div>
      ) : null}

      {!loading && note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
};
