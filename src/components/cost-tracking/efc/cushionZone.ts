import { EFCLaborOpportunity } from '@/hooks/useProjectEFC';

/**
 * Shared zone → {label, text color, bar color} mapping for the labor cushion.
 * Used by both ProjectPLHeader (the "Margin + Labor Opp" bridge) and
 * LaborOpportunityPanel (the per-category labor block) so they never drift.
 */
export const CUSHION_ZONE: Record<
  EFCLaborOpportunity['zone'],
  { label: string; color: string; bar: string }
> = {
  under_est: { label: 'Cushion intact', color: 'text-success', bar: 'bg-success' },
  in_cushion: { label: 'Cushion eroding', color: 'text-warning-foreground', bar: 'bg-warning' },
  over_capacity: { label: 'Over capacity', color: 'text-destructive', bar: 'bg-destructive' },
};
