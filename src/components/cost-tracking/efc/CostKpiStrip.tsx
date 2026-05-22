import { cn, formatCurrency } from '@/lib/utils';
import { ProjectEFCResult } from '@/hooks/useProjectEFC';

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

interface Tile {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  subClass?: string;
}

/**
 * The headline KPI strip for the Cost Tracking Overview: Contract, Expected
 * Final Cost (with overage), Projected Margin, Labor Opportunity (cushion), and
 * an Issues count. All values come from useProjectEFC — no extra query.
 */
export function CostKpiStrip({ pl, issuesCount }: { pl: ProjectEFCResult['pl']; issuesCount: number }) {
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

  if (pl.hasCushion) {
    tiles.push({
      label: 'Labor Opp',
      value: `+${formatCurrency(pl.cushionRemaining)}`,
      valueClass: 'text-success',
      sub: 'Cushion',
      subClass: 'text-success',
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
        tiles.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
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
