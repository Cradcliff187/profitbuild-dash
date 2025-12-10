import { useProjectContext } from "@/components/ProjectDetailView";
import { LineItemControlDashboard } from "@/components/LineItemControlDashboard";

export function ProjectControlRoute() {
  const { project } = useProjectContext();

  return (
    <LineItemControlDashboard projectId={project.id} project={project} />
  );
}

