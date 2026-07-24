import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { ProjectEditForm } from "@/components/ProjectEditForm";
import { MobilePageWrapper } from "@/components/ui/mobile-page-wrapper";

export function ProjectEditRoute() {
  const { project, projectId, loadProjectData } = useProjectContext();
  const navigate = useNavigate();

  return (
    <MobilePageWrapper>
      <ProjectEditForm
        variant="page"
        project={project}
        onSave={() => {
          loadProjectData();
          navigate(`/projects/${projectId}`);
        }}
        onCancel={() => navigate(`/projects/${projectId}`)}
      />
    </MobilePageWrapper>
  );
}
