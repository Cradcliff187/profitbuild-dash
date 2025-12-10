import { Navigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import ProjectScheduleView from "@/components/schedule/ProjectScheduleView";
import { isFeatureEnabled } from "@/lib/featureFlags";

export function ProjectScheduleRoute() {
  const { project, projectId } = useProjectContext();

  if (!isFeatureEnabled("scheduleView")) {
    return <Navigate to={`/projects/${projectId}`} replace />;
  }

  return (
    <ProjectScheduleView
      projectId={project.id}
      projectStartDate={project.start_date}
      projectEndDate={project.end_date}
    />
  );
}

