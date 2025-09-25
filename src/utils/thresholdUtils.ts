import { MarginThresholdStatus } from '@/types/project';
import { formatCurrency } from '@/lib/utils';

export const getMarginThresholdStatus = (
  currentMargin: number | null | undefined,
  minimumThreshold: number = 10.0,
  targetMargin: number = 20.0
): MarginThresholdStatus => {
  if (currentMargin === null || currentMargin === undefined) {
    return 'unknown';
  }
  
  if (currentMargin < minimumThreshold) {
    return 'critical';
  } else if (currentMargin < targetMargin) {
    return 'at_risk';
  } else if (currentMargin >= 30.0) {
    return 'excellent';
  } else {
    return 'on_target';
  }
};

export const getThresholdStatusColor = (status: MarginThresholdStatus): string => {
  switch (status) {
    case 'critical':
      return 'hsl(var(--destructive))';
    case 'at_risk':
      return 'hsl(var(--warning))';
    case 'on_target':
      return 'hsl(var(--success))';
    case 'excellent':
      return 'hsl(var(--primary))';
    case 'unknown':
    default:
      return 'hsl(var(--muted))';
  }
};

export const getThresholdStatusLabel = (status: MarginThresholdStatus): string => {
  switch (status) {
    case 'critical':
      return 'Critical';
    case 'at_risk':
      return 'At Risk';
    case 'on_target':
      return 'On Target';
    case 'excellent':
      return 'Excellent';
    case 'unknown':
    default:
      return 'Unknown';
  }
};

export const formatContingencyRemaining = (amount: number | null | undefined): string => {
  return formatCurrency(amount, { showCents: false });
};