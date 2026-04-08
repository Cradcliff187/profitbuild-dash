import { Navigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { PaymentApplicationsTab } from "@/components/payment-applications/PaymentApplicationsTab";
import { isFeatureEnabled } from "@/lib/featureFlags";

export function ProjectBillingRoute() {
  const { project, estimates, projectId } = useProjectContext();

  if (!isFeatureEnabled("aiaBilling")) {
    return <Navigate to={`/projects/${projectId}`} replace />;
  }

  return (
    <PaymentApplicationsTab
      projectId={project.id}
      projectName={project.project_name || ""}
      projectNumber={project.project_number}
      clientName={project.client_name}
      estimates={estimates}
    />
  );
}
