import { useProjectContext } from "@/components/ProjectDetailView";
import { ContractsListView } from "@/components/contracts/ContractsListView";

export function ProjectContractsRoute() {
  const { project } = useProjectContext();
  return <ContractsListView projectId={project.id} />;
}
