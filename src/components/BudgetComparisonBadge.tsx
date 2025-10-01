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
          text: 'Under',
          variant: 'default' as const,
          className: 'border-green-300 text-green-700',
          icon: CheckCircle
        };
      case 'over-budget':
        return {
          text: 'Over',
          variant: 'destructive' as const,
          className: 'border-red-300 text-red-700',
          icon: AlertTriangle
        };
      case 'awaiting-quotes':
        return {
          text: 'Pending',
          variant: 'secondary' as const,
          className: 'border-blue-300 text-blue-700',
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
    <Badge variant="outline" className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0 h-4 leading-none ${config.className}`}>
      <Icon className="h-2 w-2" />
      {config.text}
    </Badge>
  );
};