import { useProjectContext } from "@/components/ProjectDetailView";
import { ProjectOperationalDashboard } from "@/components/ProjectOperationalDashboard";

export function ProjectOverviewRoute() {
  const {
    project,
    estimates,
    quotes,
    expenses,
    changeOrders,
    pendingTimeEntries,
    pendingReceipts,
    mediaCounts,
    documentCount,
  } = useProjectContext();

  return (
    <ProjectOperationalDashboard
      project={project}
      estimates={estimates}
      quotes={quotes}
      expenses={expenses}
      changeOrders={changeOrders}
      pendingTimeEntries={pendingTimeEntries}
      pendingReceipts={pendingReceipts}
      mediaCounts={mediaCounts}
      documentCount={documentCount}
    />
  );
}

