import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { ProjectEditForm } from "@/components/ProjectEditForm";

export function ProjectEditRoute() {
  const { project, projectId, loadProjectData } = useProjectContext();
  const navigate = useNavigate();

  return (
    <ProjectEditForm
      project={project}
      onSave={() => {
        loadProjectData();
        navigate(`/projects/${projectId}`);
      }}
      onCancel={() => navigate(`/projects/${projectId}`)}
    />
  );
}

