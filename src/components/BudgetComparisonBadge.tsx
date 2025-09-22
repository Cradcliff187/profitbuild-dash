import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";

export type BudgetComparisonStatus = 'under-budget' | 'over-budget' | 'awaiting-quotes';

interface BudgetComparisonBadgeProps {
  status: BudgetComparisonStatus;
}

export const BudgetComparisonBadge = ({ status }: BudgetComparisonBadgeProps) => {
  const getStatusConfig = (status: BudgetComparisonStatus) => {
    switch (status) {
      case 'under-budget':
        return {
          text: 'Under Budget',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200',
          icon: CheckCircle
        };
      case 'over-budget':
        return {
          text: 'Over Budget',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200',
          icon: AlertTriangle
        };
      case 'awaiting-quotes':
        return {
          text: 'Awaiting Quotes',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200',
          icon: Clock
        };
      default:
        return {
          text: 'Unknown',
          variant: 'outline' as const,
          className: '',
          icon: Clock
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`text-xs flex items-center gap-1 ${config.className}`}>
      <Icon className="h-2.5 w-2.5" />
      {config.text}
    </Badge>
  );
};