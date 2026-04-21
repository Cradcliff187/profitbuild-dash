import { useParams, useNavigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { QuoteComparisonPeer } from "@/components/quotes/QuoteComparisonPeer";
import { Card, CardContent } from "@/components/ui/card";

export function QuoteComparePeerRoute() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { quotes, estimates, projectId } = useProjectContext();
  const navigate = useNavigate();

  const quote = quotes.find((q) => q.id === quoteId);

  if (!quote) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Quote not found
        </CardContent>
      </Card>
    );
  }

  const viewHref = (peerId: string) =>
    `/projects/${projectId}/estimates/quotes/${peerId}`;

  return (
    <QuoteComparisonPeer
      quote={quote}
      quotes={quotes}
      estimates={estimates}
      onBack={() =>
        navigate(`/projects/${projectId}/estimates/quotes/${quote.id}`)
      }
      peerHrefBuilder={viewHref}
    />
  );
}
