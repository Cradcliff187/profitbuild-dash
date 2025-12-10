import { useNavigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { EstimateForm } from "@/components/EstimateForm";

export function EstimateNewRoute() {
  const { estimates, projectId, loadProjectData } = useProjectContext();
  const navigate = useNavigate();

  return (
    <EstimateForm
      mode="create"
      onSave={() => {
        loadProjectData();
        navigate(`/projects/${projectId}/estimates`);
      }}
      onCancel={() => navigate(`/projects/${projectId}/estimates`)}
      preselectedProjectId={projectId}
      availableEstimates={estimates}
    />
  );
}

