import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";

export type ChangeOrderStatus = 'pending' | 'approved' | 'rejected';

interface ChangeOrderStatusBadgeProps {
  status: ChangeOrderStatus;
}

export const ChangeOrderStatusBadge = ({ status }: ChangeOrderStatusBadgeProps) => {
  const getStatusConfig = (status: ChangeOrderStatus) => {
    switch (status) {
      case 'approved':
        return {
          text: 'Approved',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200',
          icon: CheckCircle
        };
      case 'pending':
        return {
          text: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200',
          icon: Clock
        };
      case 'rejected':
        return {
          text: 'Rejected',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200',
          icon: XCircle
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
    <Badge variant={config.variant} className={`text-sm flex items-center gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.text}
    </Badge>
  );
};