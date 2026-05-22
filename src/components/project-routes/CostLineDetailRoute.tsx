import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { useProjectContext } from "@/components/ProjectDetailView";
import { useProjectEFC } from "@/hooks/useProjectEFC";
import { CostLineDetail } from "@/components/cost-tracking/efc/CostLineDetail";

/**
 * Per-line cost detail page at /projects/:id/control/:lineId. Looks the line up
 * in the already-loaded EFC data (no extra query) and hands it to the
 * presentational CostLineDetail — mirrors how QuoteViewRoute resolves a quote.
 */
export function CostLineDetailRoute() {
  const { project } = useProjectContext();
  const { lineId } = useParams<{ lineId: string }>();
  const navigate = useNavigate();
  const efc = useProjectEFC(project.id, project);

  const found = useMemo(() => {
    for (const cat of efc.categories) {
      const line = cat.lines.find((l) => l.id === lineId);
      if (line) return { line, category: cat };
    }
    return null;
  }, [efc.categories, lineId]);

  const backToOverview = () => navigate(`/projects/${project.id}/control`);

  if (efc.isLoading) {
    return (
      <Card>
        <CardContent className="py-16">
          <BrandedLoader size="lg" message="Loading line…" />
        </CardContent>
      </Card>
    );
  }

  if (!found) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <p className="text-sm font-medium">Line not found</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            This cost line no longer exists, or belongs to a different estimate version.
          </p>
          <Button variant="outline" size="sm" onClick={backToOverview}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Cost Tracking
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <CostLineDetail
      project={project}
      line={found.line}
      category={found.category}
      efc={efc}
      onBack={backToOverview}
    />
  );
}
