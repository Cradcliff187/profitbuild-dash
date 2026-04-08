import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, ChevronLeft, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScheduleOfValues } from "@/hooks/useScheduleOfValues";
import {
  usePaymentApplications,
  usePaymentApplicationLines,
} from "@/hooks/usePaymentApplications";
import { SOVGeneratorDialog } from "./SOVGeneratorDialog";
import { SOVTable } from "./SOVTable";
import { CreatePaymentAppDialog } from "./CreatePaymentAppDialog";
import { G702Summary } from "./G702Summary";
import { G703ContinuationSheet } from "./G703ContinuationSheet";
import { CertificationSection } from "./CertificationSection";
import { PaymentAppStatusBadge } from "./PaymentAppStatusBadge";
import { generateAndSaveG702, generateAndSaveG703 } from "@/utils/paymentApplicationPdf";
import type { PaymentApplicationStatus } from "@/types/paymentApplication";
import type { Estimate } from "@/types/estimate";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { toast } from "sonner";

interface PaymentApplicationsTabProps {
  projectId: string;
  projectName: string;
  projectNumber: string | null;
  clientName: string | null;
  estimates: Estimate[];
}

export function PaymentApplicationsTab({
  projectId,
  projectName,
  projectNumber,
  clientName,
  estimates,
}: PaymentApplicationsTabProps) {
  const [showSOVDialog, setShowSOVDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const {
    sov,
    sovLines,
    isLoading: sovLoading,
    generateSOV,
  } = useScheduleOfValues(projectId);

  const {
    applications,
    isLoading: appsLoading,
    createApplication,
    updateStatus,
    refetch,
  } = usePaymentApplications(projectId);

  const {
    lines: appLines,
    isLoading: linesLoading,
    updateLine,
  } = usePaymentApplicationLines(selectedAppId);

  const selectedApp = applications.find((a) => a.id === selectedAppId);

  const handleGenerateSOV = (estimateId: string, retainagePercent: number) => {
    generateSOV.mutate(
      { estimateId, retainagePercent },
      { onSuccess: () => setShowSOVDialog(false) }
    );
  };

  const handleCreateApp = (periodFrom: string, periodTo: string) => {
    createApplication.mutate(
      { periodFrom, periodTo },
      { onSuccess: () => setShowCreateDialog(false) }
    );
  };

  const handleUpdateStatus = (
    status: PaymentApplicationStatus,
    certifiedAmount?: number,
    certifiedBy?: string
  ) => {
    if (!selectedAppId) return;
    updateStatus.mutate({
      applicationId: selectedAppId,
      status,
      certifiedAmount,
      certifiedBy,
    });
  };

  const handleUpdateLine = (lineId: string, currentWork: number, storedMaterials: number) => {
    updateLine.mutate({ lineId, currentWork, storedMaterials });
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async (type: "g702" | "g703") => {
    if (!selectedApp) return;
    setIsExporting(true);
    const projectInfo = {
      projectId,
      projectName,
      projectNumber,
      clientName,
      retainagePercent: sov?.retainage_percent ?? 10,
    };
    try {
      if (type === "g702") {
        await generateAndSaveG702(selectedApp, projectInfo, appLines);
        toast.success("G702 PDF saved and downloaded");
      } else {
        await generateAndSaveG703(selectedApp, appLines, projectInfo);
        toast.success("G703 PDF saved and downloaded");
      }
      // Refresh to pick up new PDF URLs on the application record
      if (applications.length) {
        void refetch();
      }
    } catch (err) {
      toast.error(`PDF export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (sovLoading || appsLoading) {
    return <BrandedLoader message="Loading billing data..." />;
  }

  // State 1: No SOV yet — show generation prompt
  if (!sov) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>AIA Payment Applications</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Schedule of Values Found
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Generate a Schedule of Values from an approved estimate to begin
              creating AIA G702/G703 payment applications.
            </p>
            <Button onClick={() => setShowSOVDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Schedule of Values
            </Button>
          </CardContent>
        </Card>

        <SOVGeneratorDialog
          open={showSOVDialog}
          onOpenChange={setShowSOVDialog}
          estimates={estimates}
          onGenerate={handleGenerateSOV}
          isGenerating={generateSOV.isPending}
        />
      </div>
    );
  }

  // State 2: Viewing a specific payment application
  if (selectedApp) {
    const isEditable = selectedApp.status === "draft";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedAppId(null)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Applications
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                <Download className="h-4 w-4 mr-1" />
                {isExporting ? "Saving..." : "Export PDF"}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportPdf("g702")}>
                <FileText className="h-4 w-4 mr-2" />
                G702 — Application for Payment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPdf("g703")}>
                <FileText className="h-4 w-4 mr-2" />
                G703 — Continuation Sheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <G702Summary
          application={selectedApp}
          projectName={projectName}
          projectNumber={projectNumber}
          clientName={clientName}
          retainagePercent={sov?.retainage_percent ?? 10}
          appLines={appLines}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              G703 Continuation Sheet — Schedule of Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            {linesLoading ? (
              <BrandedLoader message="Loading line items..." />
            ) : (
              <G703ContinuationSheet
                lines={appLines}
                isEditable={isEditable}
                onUpdateLine={handleUpdateLine}
              />
            )}
          </CardContent>
        </Card>

        <CertificationSection
          application={selectedApp}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={updateStatus.isPending}
        />
      </div>
    );
  }

  // State 3: SOV exists — show SOV summary + applications list
  const nextAppNumber =
    applications.length > 0
      ? Math.max(...applications.map((a) => a.application_number)) + 1
      : 1;

  return (
    <div className="space-y-6">
      {/* SOV Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Schedule of Values</CardTitle>
        </CardHeader>
        <CardContent>
          <SOVTable sov={sov} lines={sovLines} />
        </CardContent>
      </Card>

      {/* Payment Applications List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Payment Applications</CardTitle>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Application
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No payment applications yet. Create one to start billing.
            </p>
          ) : (
            <div className="space-y-2">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedAppId(app.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        Application #{app.application_number}
                      </span>
                      <PaymentAppStatusBadge status={app.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Period: {new Date(app.period_from).toLocaleDateString()} —{" "}
                      {new Date(app.period_to).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(app.current_payment_due)}
                    </p>
                    <p className="text-xs text-muted-foreground">Payment Due</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePaymentAppDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateApp={handleCreateApp}
        isCreating={createApplication.isPending}
        nextAppNumber={nextAppNumber}
      />
    </div>
  );
}
