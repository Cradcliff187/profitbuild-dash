import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, FileEdit } from "lucide-react";
import { getChangeOrderStatusColor } from "@/lib/statusColors";

export type ChangeOrderStatus = 'draft' | 'pending' | 'approved' | 'rejected';

interface ChangeOrderStatusBadgeProps {
  status: ChangeOrderStatus;
}

export const ChangeOrderStatusBadge = ({ status }: ChangeOrderStatusBadgeProps) => {
  const getStatusConfig = (status: ChangeOrderStatus) => {
    switch (status) {
      case 'draft':
        return {
          text: 'Draft',
          icon: FileEdit
        };
      case 'approved':
        return {
          text: 'Approved',
          icon: CheckCircle
        };
      case 'pending':
        return {
          text: 'Pending',
          icon: Clock
        };
      case 'rejected':
        return {
          text: 'Rejected',
          icon: XCircle
        };
      default:
        return {
          text: 'Unknown',
          icon: Clock
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0 h-4 leading-none ${getChangeOrderStatusColor(status)}`}>
      <Icon className="h-2 w-2" />
      {config.text}
    </Badge>
  );
};