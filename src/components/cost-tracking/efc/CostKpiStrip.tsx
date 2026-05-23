import { cn, formatCurrency } from '@/lib/utils';
import { ProjectEFCResult } from '@/hooks/useProjectEFC';

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtHours = (h: number) => h.toLocaleString(undefined, { maximumFractionDigits: 1 });

interface Tile {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  subClass?: string;
}

const GRID_COLS: Record<number, string> = {
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

/**
 * The headline KPI strip for the Cost Tracking Overview: Contract, Expected
 * Final Cost (with overage), Projected Margin, and an Issues count — plus, when
 * the project carries a labor cushion, two more tiles: "Margin + Labor Opp" (the
 * better margin once the eroding cushion is credited) and "Labor Opp" (the
 * cushion dollars, with hours used / remaining as the sub-line). All values come
 * from useProjectEFC — no extra query. See docs/COST_TRACKING_CALCS.md §4, §6.
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
  const oppPositive = pl.marginWithOpp >= 0;

  const tiles: Tile[] = [
    { label: 'Contract', value: formatCurrency(pl.contract) },
    {
      label: 'EFC',
      value: formatCurrency(pl.expectedCost),
      sub: over > 0.005 ? `+${formatCurrency(over)} over` : 'on plan',
      subClass: over > 0.005 ? 'text-destructive' : 'text-muted-foreground',
    },
    {
      label: 'Projected Margin',
      value: formatCurrency(pl.projectedMargin),
      valueClass: marginPositive ? 'text-success' : 'text-destructive',
      sub: fmtPct(pl.projectedMarginPct),
      subClass: marginPositive ? 'text-success' : 'text-destructive',
    },
  ];

  if (pl.hasCushion) {
    // The improved margin once the labor cushion is credited (always ≥ Projected Margin).
    tiles.push({
      label: 'Margin + Labor Opp',
      value: formatCurrency(pl.marginWithOpp),
      valueClass: oppPositive ? 'text-success' : 'text-destructive',
      sub: fmtPct(pl.marginWithOppPct),
      subClass: oppPositive ? 'text-success' : 'text-destructive',
    });

    // The cushion itself, described in HOURS: used of estimated · remaining.
    const hoursSub = laborOpportunity
      ? `${fmtHours(laborOpportunity.actualHours)} of ${fmtHours(laborOpportunity.estHours)} hrs · ${fmtHours(laborOpportunity.hoursRemaining)} left`
      : undefined;
    tiles.push({
      label: 'Labor Opp',
      value: `+${formatCurrency(pl.cushionRemaining)}`,
      valueClass: 'text-success',
      sub: hoursSub,
      subClass: 'text-muted-foreground',
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
    <div className={cn('grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3', GRID_COLS[tiles.length] ?? 'lg:grid-cols-4')}>
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
