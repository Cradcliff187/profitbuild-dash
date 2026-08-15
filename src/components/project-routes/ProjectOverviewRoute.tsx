import { Navigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { ProjectOperationalDashboard } from "@/components/ProjectOperationalDashboard";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  // One project home on mobile (Aug 2026): /projects/:id forwards to the Job
  // hub, which now carries the admin money pulse + Manage rows in addition to
  // the field rows — see MobileScheduleView. Desktop keeps this Overview
  // dashboard unchanged. Guarded on the schedule flag because with it off,
  // ProjectScheduleRoute Navigates BACK here — an unguarded redirect would
  // loop. The mobile section selector also drops its Overview entry
  // (projectNavigation.ts) so nothing navigates into this redirect on purpose.
  if (isMobile && isFeatureEnabled("scheduleView")) {
    return <Navigate to={`/projects/${project.id}/schedule`} replace />;
  }

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
