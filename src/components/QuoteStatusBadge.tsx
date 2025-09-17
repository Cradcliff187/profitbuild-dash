import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";
import { QuoteStatus } from "@/types/quote";

export type { QuoteStatus } from "@/types/quote";

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
}

export const QuoteStatusBadge = ({ status }: QuoteStatusBadgeProps) => {
  const getStatusConfig = (status: QuoteStatus) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200',
          icon: Clock
        };
      case 'accepted':
        return {
          text: 'Accepted',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200',
          icon: CheckCircle
        };
      case 'rejected':
        return {
          text: 'Rejected',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200',
          icon: XCircle
        };
      case 'expired':
        return {
          text: 'Expired',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200',
          icon: AlertTriangle
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