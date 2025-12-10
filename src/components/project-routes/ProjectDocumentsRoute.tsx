import { useProjectContext } from "@/components/ProjectDetailView";
import { ProjectDocumentsHub } from "@/components/ProjectDocumentsHub";

export function ProjectDocumentsRoute() {
  const { project } = useProjectContext();

  return (
    <ProjectDocumentsHub
      projectId={project.id}
      projectName={project.project_name}
      projectNumber={project.project_number}
      clientName={project.client_name}
    />
  );
}

