import { useProjectContext } from "@/components/ProjectDetailView";
import { ProjectEstimatesView } from "@/components/ProjectEstimatesView";

export function ProjectEstimatesRoute() {
  const { project, estimates, quotes, loadProjectData } = useProjectContext();

  return (
    <ProjectEstimatesView
      projectId={project.id}
      estimates={estimates}
      quotes={quotes}
      onRefresh={loadProjectData}
    />
  );
}

