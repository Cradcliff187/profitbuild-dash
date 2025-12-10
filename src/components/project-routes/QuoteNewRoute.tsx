import { useNavigate, useSearchParams } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { QuoteForm } from "@/components/QuoteForm";

export function QuoteNewRoute() {
  const { estimates, projectId, handleSaveQuote } = useProjectContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <QuoteForm
      estimates={estimates}
      preSelectedEstimateId={estimates.find((e) => e.status === "approved" || e.is_current_version)?.id}
      onSave={handleSaveQuote}
      onCancel={() => {
        const tab = searchParams.get('tab') || 'quotes';
        navigate(`/projects/${projectId}/estimates?tab=${tab}`);
      }}
    />
  );
}

