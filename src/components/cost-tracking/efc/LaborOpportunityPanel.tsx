import { cn, formatCurrency } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import { EFCLaborOpportunity } from '@/hooks/useProjectEFC';

const ZONE: Record<EFCLaborOpportunity['zone'], { label: string; color: string; bar: string }> = {
  under_est: { label: 'Cushion intact', color: 'text-success', bar: 'bg-success' },
  in_cushion: { label: 'Cushion eroding', color: 'text-warning-foreground', bar: 'bg-warning' },
  over_capacity: { label: 'Over capacity', color: 'text-destructive', bar: 'bg-destructive' },
};

function cushionMessage(l: EFCLaborOpportunity): string {
  switch (l.zone) {
    case 'under_est':
      return 'Every hour finished under the estimate becomes additional margin.';
    case 'in_cushion':
      return `${formatCurrency(l.remaining)} of cushion left before labor becomes a real overrun.`;
    case 'over_capacity':
      return 'Cushion fully consumed — excess hours are now a real cost overrun.';
  }
}

export function LaborOpportunityPanel({ labor }: { labor: EFCLaborOpportunity }) {
  const zone = ZONE[labor.zone];
  const hoursPct = labor.estHours > 0 ? Math.min(100, (labor.actualHours / labor.estHours) * 100) : 0;

  return (
    <div className="px-3 py-3 bg-muted/20 border-b">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Sparkles className={cn('h-4 w-4', zone.color)} />
          <span className={cn('text-sm font-semibold', zone.color)}>
            Labor opportunity: {formatCurrency(labor.remaining)} {labor.zone === 'over_capacity' ? 'spent' : 'intact'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {labor.actualHours.toFixed(0)} / {labor.estHours.toFixed(0)} hrs
          {labor.hoursRemaining > 0 && ` · ${labor.hoursRemaining.toFixed(0)} left`}
        </span>
      </div>

      <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', zone.bar)} style={{ width: `${hoursPct}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap text-xs">
        <span className="text-muted-foreground tabular-nums">
          {formatCurrency(labor.dollarsSpent)} spent of {formatCurrency(labor.dollarsBudgeted)} budgeted
          {labor.dollarsRemaining > 0 && ` · ${formatCurrency(labor.dollarsRemaining)} left`}
        </span>
        <span className={cn('font-medium', zone.color)}>{zone.label}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{cushionMessage(labor)}</p>
    </div>
  );
}
