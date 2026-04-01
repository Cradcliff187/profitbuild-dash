import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_APP_STATUS_LABELS,
  PAYMENT_APP_STATUS_COLORS,
  type PaymentApplicationStatus,
} from "@/types/paymentApplication";

interface PaymentAppStatusBadgeProps {
  status: PaymentApplicationStatus;
}

export function PaymentAppStatusBadge({ status }: PaymentAppStatusBadgeProps) {
  return (
    <Badge variant="outline" className={PAYMENT_APP_STATUS_COLORS[status]}>
      {PAYMENT_APP_STATUS_LABELS[status]}
    </Badge>
  );
}
