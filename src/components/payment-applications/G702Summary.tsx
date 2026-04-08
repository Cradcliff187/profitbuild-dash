import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PaymentApplication, PaymentApplicationLineWithSOV } from "@/types/paymentApplication";
import { PaymentAppStatusBadge } from "./PaymentAppStatusBadge";

interface G702SummaryProps {
  application: PaymentApplication;
  projectName: string;
  projectNumber: string | null;
  clientName: string | null;
  retainagePercent?: number;
  appLines?: PaymentApplicationLineWithSOV[];
}

function fmt(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function FieldPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wide">{label}</span>
      <span className="text-sm">{value || "\u2014"}</span>
    </div>
  );
}

function CalcLine({
  num,
  label,
  value,
  formula,
  bold,
  boxed,
  indent,
}: {
  num?: string;
  label: string;
  value: string;
  formula?: string;
  bold?: boolean;
  boxed?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-1.5 px-3 ${
        bold ? "bg-muted/50 font-semibold" : ""
      } ${indent ? "pl-8" : ""}`}
    >
      <div className="flex flex-col">
        <span className="text-sm">
          {num && <span className="text-muted-foreground mr-1.5 w-4 inline-block">{num}.</span>}
          {label}
        </span>
        {formula && (
          <span className="text-[10px] text-muted-foreground ml-6">{formula}</span>
        )}
      </div>
      <span
        className={`font-mono text-sm whitespace-nowrap ml-4 ${
          boxed ? "border-2 border-foreground px-2 py-0.5 font-bold" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function G702Summary({
  application,
  projectName,
  projectNumber,
  clientName,
  retainagePercent = 10,
  appLines,
}: G702SummaryProps) {
  // Calculate retainage breakdown from line items
  let ret5a = 0;
  let ret5b = 0;
  if (appLines && appLines.length > 0) {
    const totalCompletedWork = appLines.reduce(
      (sum, l) => sum + l.previous_work + l.current_work, 0
    );
    const totalStoredMat = appLines.reduce(
      (sum, l) => sum + l.stored_materials, 0
    );
    ret5a = (retainagePercent / 100) * totalCompletedWork;
    ret5b = (retainagePercent / 100) * totalStoredMat;
  } else {
    ret5a = application.total_retainage;
    ret5b = 0;
  }

  return (
    <Card className="overflow-hidden">
      {/* Title Bar */}
      <div className="bg-foreground text-background px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">AIA Document G702</span>
          <span className="text-xs opacity-80">Application and Certificate for Payment</span>
        </div>
        <PaymentAppStatusBadge status={application.status} />
      </div>

      <CardContent className="p-0">
        {/* Header Fields Grid */}
        <div className="grid grid-cols-3 gap-px bg-border">
          <div className="bg-background p-3 space-y-3">
            <FieldPair label="To Owner" value={clientName || ""} />
            <FieldPair label="From Contractor" value="Radcliff Construction Group" />
          </div>
          <div className="bg-background p-3 space-y-3">
            <FieldPair label="Project" value={projectName} />
            <FieldPair label="Via Architect" value="" />
          </div>
          <div className="bg-background p-3 space-y-2">
            <FieldPair label="Application No" value={String(application.application_number)} />
            <FieldPair
              label="Period To"
              value={new Date(application.period_to).toLocaleDateString()}
            />
            <FieldPair label="Project Nos" value={projectNumber || ""} />
          </div>
        </div>

        <Separator />

        {/* Two-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-border">
          {/* LEFT: Contractor's Application */}
          <div className="bg-background">
            <div className="px-3 py-2 bg-muted/30 border-b">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                Contractor's Application for Payment
              </h3>
            </div>

            <div className="divide-y">
              <CalcLine num="1" label="Original Contract Sum" value={fmt(application.original_contract_sum)} />
              <CalcLine num="2" label="Net Change by Change Orders" value={fmt(application.net_change_orders)} />
              <CalcLine
                num="3"
                label="Contract Sum to Date"
                value={fmt(application.contract_sum_to_date)}
                formula="(Line 1 \u00B1 2)"
                bold
              />
              <CalcLine
                num="4"
                label="Total Completed & Stored to Date"
                value={fmt(application.total_completed_to_date)}
                formula="(Column G on G703)"
              />

              {/* Line 5: Retainage with sub-items */}
              <div className="px-3 py-1.5">
                <span className="text-sm">
                  <span className="text-muted-foreground mr-1.5">5.</span>
                  RETAINAGE:
                </span>
              </div>
              <CalcLine
                label={`a.  ${retainagePercent}% of Completed Work`}
                value={fmt(ret5a)}
                formula="(Columns D + E on G703)"
                indent
              />
              <CalcLine
                label={`b.  ${retainagePercent}% of Stored Material`}
                value={fmt(ret5b)}
                formula="(Column F on G703)"
                indent
              />
              <CalcLine
                label="Total Retainage (Lines 5a + 5b)"
                value={fmt(application.total_retainage)}
                indent
              />

              <CalcLine
                num="6"
                label="Total Earned Less Retainage"
                value={fmt(application.total_earned_less_retainage)}
                formula="(Line 4 minus Line 5 Total)"
                bold
              />
              <CalcLine
                num="7"
                label="Less Previous Certificates for Payment"
                value={fmt(application.total_previous_payments)}
                formula="(Line 6 from prior Certificate)"
              />
              <CalcLine
                num="8"
                label="Current Payment Due"
                value={fmt(application.current_payment_due)}
                formula="(Line 6 minus Line 7)"
                bold
                boxed
              />
              <CalcLine
                num="9"
                label="Balance to Finish, Including Retainage"
                value={fmt(application.balance_to_finish)}
                formula="(Line 3 minus Line 6)"
              />
            </div>

            {/* Change Order Summary */}
            <div className="m-3 border rounded text-xs">
              <div className="grid grid-cols-3 bg-muted/50 border-b font-semibold">
                <div className="p-1.5 col-span-1">Change Order Summary</div>
                <div className="p-1.5 text-center border-l">Additions</div>
                <div className="p-1.5 text-center border-l">Deductions</div>
              </div>
              <div className="grid grid-cols-3 border-b">
                <div className="p-1.5 col-span-1 text-muted-foreground">Approved in previous months</div>
                <div className="p-1.5 text-center border-l">&mdash;</div>
                <div className="p-1.5 text-center border-l">&mdash;</div>
              </div>
              <div className="grid grid-cols-3 border-b">
                <div className="p-1.5 col-span-1 text-muted-foreground">Approved this month</div>
                <div className="p-1.5 text-center border-l">&mdash;</div>
                <div className="p-1.5 text-center border-l">&mdash;</div>
              </div>
              <div className="grid grid-cols-3 font-semibold">
                <div className="p-1.5 col-span-1">Net Changes by Change Order</div>
                <div className="p-1.5 text-center border-l col-span-2 font-mono">
                  {fmt(application.net_change_orders)}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Certifications */}
          <div className="bg-background">
            {/* Contractor Certification */}
            <div className="px-3 py-2 bg-muted/30 border-b">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                Contractor's Certification
              </h3>
            </div>
            <div className="p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                The undersigned Contractor certifies that to the best of the Contractor&apos;s
                knowledge, information and belief the Work covered by this Application for Payment
                has been completed in accordance with the Contract Documents, that all amounts have
                been paid by the Contractor for Work for which previous Certificates for Payment were
                issued and payments received from the Owner, and that current payment shown herein is
                now due.
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-20">Contractor:</span>
                  <span className="border-b border-dashed flex-1">Radcliff Construction Group</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-20">By:</span>
                  <span className="border-b border-dashed flex-1" />
                </div>
                <div className="flex gap-4">
                  <span className="text-muted-foreground w-20">Date:</span>
                  <span className="border-b border-dashed flex-1">
                    {new Date(application.period_to).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Architect's Certificate */}
            <div className="px-3 py-2 bg-muted/30 border-b">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                Architect&apos;s Certificate for Payment
              </h3>
            </div>
            <div className="p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-4">
                In accordance with the Contract Documents, based on on-site observations and the data
                comprising this application, the Architect certifies to the Owner that to the best of
                the Architect&apos;s knowledge, information and belief, the Work has progressed as
                indicated, the quality of the Work is in accordance with the Contract Documents, and
                the Contractor is entitled to payment of the AMOUNT CERTIFIED.
              </p>

              <div className="space-y-3">
                {/* Amount Certified */}
                <div className="flex items-baseline justify-between bg-muted/30 p-2 rounded">
                  <span className="font-semibold text-sm">Amount Certified:</span>
                  <span className="font-mono text-sm font-bold">
                    {application.certified_amount != null
                      ? fmt(application.certified_amount)
                      : "\u2014"}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-20">Architect:</span>
                    <span className="border-b border-dashed flex-1">
                      {application.certified_by || ""}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-20">Date:</span>
                    <span className="border-b border-dashed flex-1">
                      {application.certified_date
                        ? new Date(application.certified_date).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed mt-3 italic">
                  This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the
                  Contractor named herein. Issuance, payment and acceptance of payment are without
                  prejudice to any rights of the Owner or Contractor under this Contract.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
