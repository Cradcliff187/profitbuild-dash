import { useProjectContext } from "@/components/ProjectDetailView";
import { CostOverview } from "@/components/cost-tracking/efc/CostOverview";

/**
 * Cost Tracking → Overview. A KPI strip over a flat, scannable table of every
 * cost line; each line drills into its own detail page (CostLineDetailRoute at
 * /projects/:id/control/:lineId). Replaced the old expandable Cost Analysis page.
 */
export function ProjectControlRoute() {
  const { project } = useProjectContext();

  return <CostOverview projectId={project.id} project={project} />;
}
