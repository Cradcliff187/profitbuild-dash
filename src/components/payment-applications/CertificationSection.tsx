import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentApplication, PaymentApplicationStatus } from "@/types/paymentApplication";

interface CertificationSectionProps {
  application: PaymentApplication;
  onUpdateStatus: (
    status: PaymentApplicationStatus,
    certifiedAmount?: number,
    certifiedBy?: string
  ) => void;
  isUpdating: boolean;
}

export function CertificationSection({
  application,
  onUpdateStatus,
  isUpdating,
}: CertificationSectionProps) {
  const [certifiedBy, setCertifiedBy] = useState(application.certified_by || "");
  const [certifiedAmount, setCertifiedAmount] = useState(
    application.certified_amount ?? application.current_payment_due
  );

  const { status } = application;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "draft" && (
          <Button
            onClick={() => onUpdateStatus("submitted")}
            disabled={isUpdating}
            className="w-full"
          >
            Submit for Review
          </Button>
        )}

        {status === "submitted" && (
          <>
            <div className="space-y-2">
              <Label>Certified By</Label>
              <Input
                value={certifiedBy}
                onChange={(e) => setCertifiedBy(e.target.value)}
                placeholder="Architect / Owner name"
              />
            </div>
            <div className="space-y-2">
              <Label>Certified Amount</Label>
              <Input
                type="number"
                step={0.01}
                value={certifiedAmount}
                onChange={(e) => setCertifiedAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  onUpdateStatus("certified", certifiedAmount, certifiedBy)
                }
                disabled={isUpdating || !certifiedBy}
                className="flex-1"
              >
                Certify Payment
              </Button>
              <Button
                variant="destructive"
                onClick={() => onUpdateStatus("rejected")}
                disabled={isUpdating}
              >
                Reject
              </Button>
            </div>
          </>
        )}

        {status === "certified" && (
          <Button
            onClick={() => onUpdateStatus("paid")}
            disabled={isUpdating}
            className="w-full"
          >
            Mark as Paid
          </Button>
        )}

        {(status === "paid" || status === "rejected") && (
          <p className="text-sm text-muted-foreground text-center">
            This application is {status}. No further actions available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
