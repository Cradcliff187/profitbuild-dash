import { useProjectContext } from "@/components/ProjectDetailView";
import { PaymentApplicationsTab } from "@/components/payment-applications/PaymentApplicationsTab";

export function ProjectBillingRoute() {
  const { project, estimates } = useProjectContext();
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
