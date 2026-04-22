import { Navigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import ProjectScheduleView from "@/components/schedule/ProjectScheduleView";
import { MobileScheduleView } from "@/components/schedule/MobileScheduleView";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { useIsMobile } from "@/hooks/use-mobile";

export function ProjectScheduleRoute() {
  const { project, projectId } = useProjectContext();
  const isMobile = useIsMobile();

  if (!isFeatureEnabled("scheduleView")) {
    return <Navigate to={`/projects/${projectId}`} replace />;
  }

  // Mobile gets the Tasks/Notes/Media/Docs tab experience (absorbed from the
  // legacy /field-schedule/:projectId page). Desktop keeps the Gantt chart.
  // One URL, two layouts — shared link from a PM to a field worker (or vice
  // versa) lands on the layout that fits the device.
  if (isMobile) {
    return (
      <MobileScheduleView
        projectId={project.id}
        projectStartDate={project.start_date}
        projectEndDate={project.end_date}
      />
    );
  }

  return (
    <ProjectScheduleView
      projectId={project.id}
      projectStartDate={project.start_date}
      projectEndDate={project.end_date}
    />
  );
}

