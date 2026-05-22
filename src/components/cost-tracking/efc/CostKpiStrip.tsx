import { cn, formatCurrency } from '@/lib/utils';
import { ProjectEFCResult } from '@/hooks/useProjectEFC';
import { fmtHours } from './lineDisplay';

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

interface Tile {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  subClass?: string;
}

const LG_COLS: Record<number, string> = {
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

/**
 * The headline KPI strip for the Cost Tracking Overview: Contract, Expected
 * Final Cost (with overage), Projected Margin, Labor Opportunity (the cushion,
 * shown as hours used / hours of cushion left), Margin + Opp (margin once the
 * cushion is credited), and an Issues count. All values come from useProjectEFC
 * — no extra query.
 */
export function CostKpiStrip({
  pl,
  laborOpportunity,
  issuesCount,
}: {
  pl: ProjectEFCResult['pl'];
  laborOpportunity: ProjectEFCResult['laborOpportunity'];
  issuesCount: number;
}) {
  const over = pl.expectedCost - pl.plannedCost;
  const marginPositive = pl.projectedMargin >= 0;

  const tiles: Tile[] = [
    { label: 'Contract', value: formatCurrency(pl.contract) },
    {
      label: 'EFC',
      value: formatCurrency(pl.expectedCost),
      sub: over > 0.005 ? `+${formatCurrency(over)} over` : 'on plan',
      subClass: over > 0.005 ? 'text-destructive' : 'text-muted-foreground',
    },
    {
      label: 'Margin',
      value: formatCurrency(pl.projectedMargin),
      valueClass: marginPositive ? 'text-success' : 'text-destructive',
      sub: fmtPct(pl.projectedMarginPct),
      subClass: marginPositive ? 'text-success' : 'text-destructive',
    },
  ];

  if (pl.hasCushion && laborOpportunity) {
    // Hours used (actual logged) and hours of cushion left before labor turns
    // into a real overrun — capacity (estimate + cushion) minus hours used.
    const hoursUsed = laborOpportunity.actualHours;
    const hoursLeft = Math.max(0, laborOpportunity.capacityHours - hoursUsed);
    const hoursSub =
      laborOpportunity.capacityHours > 0
        ? `${fmtHours(hoursUsed)}h used · ${fmtHours(hoursLeft)}h left`
        : `${fmtHours(hoursUsed)}h used`;

    tiles.push({
      label: 'Labor Opp',
      value: `+${formatCurrency(pl.cushionRemaining)}`,
      valueClass: 'text-success',
      sub: hoursSub,
      subClass: 'text-muted-foreground',
    });

    const oppMarginPositive = pl.marginWithOpp >= 0;
    tiles.push({
      label: 'Margin + Opp',
      value: formatCurrency(pl.marginWithOpp),
      valueClass: oppMarginPositive ? 'text-success' : 'text-destructive',
      sub: fmtPct(pl.marginWithOppPct),
      subClass: oppMarginPositive ? 'text-success' : 'text-destructive',
    });
  }

  tiles.push({
    label: 'Issues',
    value: String(issuesCount),
    valueClass: issuesCount > 0 ? 'text-destructive' : 'text-foreground',
    sub: issuesCount > 0 ? 'over budget' : 'on track',
    subClass: issuesCount > 0 ? 'text-destructive' : 'text-muted-foreground',
  });

  return (
    <div
      className={cn(
        'grid gap-2 sm:gap-3 grid-cols-2',
        LG_COLS[tiles.length] ?? 'lg:grid-cols-4',
      )}
    >
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border bg-card px-3 py-2.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t.label}</div>
          <div className={cn('mt-0.5 text-xl font-semibold tabular-nums', t.valueClass)}>{t.value}</div>
          {t.sub && <div className={cn('text-xs tabular-nums', t.subClass)}>{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}
