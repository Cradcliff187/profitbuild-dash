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
          className: 'border-green-300 text-green-700',
          icon: CheckCircle
        };
      case 'pending':
        return {
          text: 'Pending',
          variant: 'secondary' as const,
          className: 'border-yellow-300 text-yellow-700',
          icon: Clock
        };
      case 'rejected':
        return {
          text: 'Rejected',
          variant: 'destructive' as const,
          className: 'border-red-300 text-red-700',
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
    <Badge variant="outline" className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0 h-4 leading-none ${config.className}`}>
      <Icon className="h-2 w-2" />
      {config.text}
    </Badge>
  );
};