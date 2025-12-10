import { useParams, useNavigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { QuoteForm } from "@/components/QuoteForm";
import { Card, CardContent } from "@/components/ui/card";

export function QuoteEditRoute() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { quotes, estimates, projectId, loadProjectData } = useProjectContext();
  const navigate = useNavigate();

  const quote = quotes.find(q => q.id === quoteId);

  if (!quote) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Quote not found
        </CardContent>
      </Card>
    );
  }

  return (
    <QuoteForm
      estimates={estimates}
      initialQuote={quote}
      onSave={() => {
        loadProjectData();
        navigate(`/projects/${projectId}/estimates?tab=quotes`);
      }}
      onCancel={() => {
        navigate(`/projects/${projectId}/estimates?tab=quotes`);
      }}
      mode="edit"
    />
  );
}

