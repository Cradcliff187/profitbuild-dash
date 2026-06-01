import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { QuoteForm } from "@/components/QuoteForm";
import { supabase } from "@/integrations/supabase/client";

export function QuoteNewRoute() {
  const { estimates, projectId, handleSaveQuote } = useProjectContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // When launched from an imported document ("Create quote from this document"),
  // pre-attach that document's existing file instead of forcing a re-upload.
  const sourceDocumentId = searchParams.get("sourceDocumentId") || undefined;
  const [sourceDoc, setSourceDoc] = useState<{ file_url: string; file_name: string } | null>(null);

  useEffect(() => {
    if (!sourceDocumentId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("file_url, file_name")
        .eq("id", sourceDocumentId)
        .maybeSingle();
      if (error) {
        console.error("Failed to load source document for quote:", error);
        return;
      }
      if (!cancelled && data) setSourceDoc(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceDocumentId]);

  return (
    <QuoteForm
      estimates={estimates}
      preSelectedEstimateId={estimates.find((e) => e.status === "approved" || e.is_current_version)?.id}
      onSave={handleSaveQuote}
      sourceDocumentId={sourceDoc ? sourceDocumentId : undefined}
      initialAttachmentUrl={sourceDoc?.file_url}
      initialAttachmentName={sourceDoc?.file_name}
      onCancel={() => {
        const tab = searchParams.get('tab') || 'quotes';
        navigate(`/projects/${projectId}/estimates?tab=${tab}`);
      }}
    />
  );
}
