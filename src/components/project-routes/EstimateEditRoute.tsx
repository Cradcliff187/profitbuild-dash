import { useParams, useNavigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { EstimateForm } from "@/components/EstimateForm";
import { Card, CardContent } from "@/components/ui/card";

export function EstimateEditRoute() {
  const { estimateId } = useParams<{ estimateId: string }>();
  const { estimates, projectId, loadProjectData } = useProjectContext();
  const navigate = useNavigate();

  const estimate = estimates.find(e => e.id === estimateId);

  if (!estimate) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Estimate not found
        </CardContent>
      </Card>
    );
  }

  return (
    <EstimateForm
      mode="edit"
      initialEstimate={estimate}
      onSave={() => {
        loadProjectData();
        navigate(`/projects/${projectId}/estimates`);
      }}
      onCancel={() => navigate(`/projects/${projectId}/estimates`)}
      preselectedProjectId={projectId}
    />
  );
}

