import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentApplication } from "@/types/paymentApplication";
import { PaymentAppStatusBadge } from "./PaymentAppStatusBadge";

interface G702SummaryProps {
  application: PaymentApplication;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function SummaryLine({
  lineNumber,
  label,
  value,
  isBold,
}: {
  lineNumber: number;
  label: string;
  value: string;
  isBold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 px-3 ${
        isBold ? "bg-muted/50 font-semibold" : ""
      }`}
    >
      <span className="text-sm">
        <span className="text-muted-foreground mr-2">{lineNumber}.</span>
        {label}
      </span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

export function G702Summary({ application }: G702SummaryProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            AIA G702 — Application #{application.application_number}
          </CardTitle>
          <PaymentAppStatusBadge status={application.status} />
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            Period: {new Date(application.period_from).toLocaleDateString()} —{" "}
            {new Date(application.period_to).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 divide-y">
        <SummaryLine
          lineNumber={1}
          label="Original Contract Sum"
          value={formatCurrency(application.original_contract_sum)}
        />
        <SummaryLine
          lineNumber={2}
          label="Net Change by Change Orders"
          value={formatCurrency(application.net_change_orders)}
        />
        <SummaryLine
          lineNumber={3}
          label="Contract Sum to Date (Line 1 + 2)"
          value={formatCurrency(application.contract_sum_to_date)}
          isBold
        />
        <SummaryLine
          lineNumber={4}
          label="Total Completed & Stored to Date"
          value={formatCurrency(application.total_completed_to_date)}
        />
        <SummaryLine
          lineNumber={5}
          label="Retainage"
          value={formatCurrency(application.total_retainage)}
        />
        <SummaryLine
          lineNumber={6}
          label="Total Earned Less Retainage (Line 4 - 5)"
          value={formatCurrency(application.total_earned_less_retainage)}
          isBold
        />
        <SummaryLine
          lineNumber={7}
          label="Less Previous Certificates for Payment"
          value={formatCurrency(application.total_previous_payments)}
        />
        <SummaryLine
          lineNumber={8}
          label="Current Payment Due (Line 6 - 7)"
          value={formatCurrency(application.current_payment_due)}
          isBold
        />
        <SummaryLine
          lineNumber={9}
          label="Balance to Finish (Line 3 - 4)"
          value={formatCurrency(application.balance_to_finish)}
        />
        {application.certified_amount != null && (
          <div className="pt-3 mt-2 border-t-2">
            <div className="text-sm font-semibold mb-1">Certificate for Payment</div>
            <div className="flex justify-between text-sm px-3">
              <span>Certified Amount</span>
              <span className="font-mono">{formatCurrency(application.certified_amount)}</span>
            </div>
            {application.certified_by && (
              <div className="flex justify-between text-sm px-3 text-muted-foreground">
                <span>Certified By</span>
                <span>{application.certified_by}</span>
              </div>
            )}
            {application.certified_date && (
              <div className="flex justify-between text-sm px-3 text-muted-foreground">
                <span>Date</span>
                <span>{new Date(application.certified_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
