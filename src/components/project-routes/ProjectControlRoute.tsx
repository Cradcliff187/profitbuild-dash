import { useProjectContext } from "@/components/ProjectDetailView";
import { ProjectForecastView } from "@/components/cost-tracking/efc/ProjectForecastView";

/**
 * Cost Tracking → the single Cost Analysis page. The old Forecast/Detail tab
 * split (and the dense LineItemControlDashboard table) was retired in favor of
 * one progressive-disclosure page: P&L header → action strip → expandable
 * per-line category sections.
 */
export function ProjectControlRoute() {
  const { project } = useProjectContext();

  return <ProjectForecastView projectId={project.id} project={project} />;
}
