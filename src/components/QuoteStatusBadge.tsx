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
      case QuoteStatus.PENDING:
        return {
          text: 'Pending',
          variant: 'secondary' as const,
          className: 'border-yellow-300 text-yellow-700',
          icon: Clock
        };
      case QuoteStatus.ACCEPTED:
        return {
          text: 'Accepted',
          variant: 'default' as const,
          className: 'border-green-300 text-green-700',
          icon: CheckCircle
        };
      case QuoteStatus.REJECTED:
        return {
          text: 'Rejected',
          variant: 'destructive' as const,
          className: 'border-red-300 text-red-700',
          icon: XCircle
        };
      case QuoteStatus.EXPIRED:
        return {
          text: 'Expired',
          variant: 'outline' as const,
          className: 'border-gray-300 text-gray-700',
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
    <Badge variant="outline" className={`compact-badge flex items-center gap-0.5 ${config.className}`}>
      <Icon className="h-2 w-2" />
      {config.text}
    </Badge>
  );
};