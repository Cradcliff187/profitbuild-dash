import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectContext } from "@/components/ProjectDetailView";
import { QuoteViewHero } from "@/components/quotes/QuoteViewHero";
import { QuoteCoverageCard } from "@/components/quotes/QuoteCoverageCard";
import { QuoteDocumentsCard } from "@/components/quotes/QuoteDocumentsCard";
import { QuoteNotesCard } from "@/components/quotes/QuoteNotesCard";
import { QuoteStatus } from "@/types/quote";
import {
  countLineItemPeerQuotes,
  getMarginIfAccepted,
  getSignedCostVariance,
} from "@/utils/quoteFinancials";
import { ContractGenerationModal } from "@/components/contracts/ContractGenerationModal";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Contract } from "@/types/contract";

export function QuoteViewRoute() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { quotes, estimates, projectId, loadProjectData } = useProjectContext();
  const navigate = useNavigate();

  const [showContractModal, setShowContractModal] = useState(false);
  const [quoteContracts, setQuoteContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  const quote = quotes.find((q) => q.id === quoteId);
  const [currentStatus, setCurrentStatus] = useState<QuoteStatus | string>(
    quote?.status ?? QuoteStatus.PENDING
  );

  const fetchQuoteContracts = useCallback(async () => {
    if (!quoteId) return;
    setContractsLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("quote_id", quoteId)
        .order("version", { ascending: false });
      if (error) throw error;
      setQuoteContracts((data as unknown as Contract[]) ?? []);
    } catch {
      setQuoteContracts([]);
    } finally {
      setContractsLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    if (quote) setCurrentStatus(quote.status);
  }, [quote?.id, quote?.status]);

  useEffect(() => {
    fetchQuoteContracts();
  }, [fetchQuoteContracts]);

  const handleDeleteContract = useCallback(
    async (contractId: string) => {
      try {
        const { data: contract } = await supabase
          .from("contracts")
          .select("docx_storage_path, pdf_storage_path")
          .eq("id", contractId)
          .single();
        const pathsToRemove: string[] = [];
        if (contract?.docx_storage_path) pathsToRemove.push(contract.docx_storage_path);
        if (contract?.pdf_storage_path) pathsToRemove.push(contract.pdf_storage_path);
        if (pathsToRemove.length > 0) {
          await supabase.storage.from("project-documents").remove(pathsToRemove);
        }
        const { error } = await supabase
          .from("contracts")
          .delete()
          .eq("id", contractId);
        if (error) throw error;
        toast.success("Contract deleted", {
          description: "The contract has been removed.",
        });
        await fetchQuoteContracts();
        // Trigger contracts_delete_cascade removes project_documents row.
        loadProjectData?.();
      } catch (err) {
        console.error("Error deleting contract:", err);
        toast.error("Delete failed", {
          description:
            err instanceof Error ? err.message : "Failed to delete contract",
        });
      }
    },
    [fetchQuoteContracts, loadProjectData]
  );

  const variance = useMemo(
    () => (quote ? getSignedCostVariance(quote, estimates) : null),
    [quote, estimates]
  );
  const margin = useMemo(
    () => (quote ? getMarginIfAccepted(quote, estimates) : null),
    [quote, estimates]
  );
  const peerCount = useMemo(
    () => (quote ? countLineItemPeerQuotes(quote, quotes) : 0),
    [quote, quotes]
  );

  if (!quote || !variance || !margin) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Quote not found
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <QuoteViewHero
        quote={quote}
        variance={variance}
        margin={margin}
        currentStatus={currentStatus}
        hasGeneratedContract={quoteContracts.length > 0}
        peerCount={peerCount}
        onStatusChange={(next) => {
          setCurrentStatus(next);
          loadProjectData?.();
        }}
        onEdit={() => navigate(`/projects/${projectId}/estimates/quotes/${quote.id}/edit`)}
        onGenerateContract={() => setShowContractModal(true)}
        onCompare={() => navigate(`/projects/${projectId}/estimates/quotes/${quote.id}/compare`)}
      />

      <QuoteCoverageCard quote={quote} estimates={estimates} />

      <QuoteDocumentsCard
        quote={quote}
        contracts={quoteContracts}
        contractsLoading={contractsLoading}
        onDeleteContract={handleDeleteContract}
        onAttachmentChange={() => loadProjectData?.()}
      />

      <QuoteNotesCard
        notes={quote.notes}
        rejectionReason={quote.rejection_reason}
      />

      <ContractGenerationModal
        open={showContractModal}
        onOpenChange={setShowContractModal}
        projectId={quote.project_id}
        estimateId={quote.estimate_id}
        quoteId={quote.id}
        payeeId={quote.payee_id}
        onSuccess={() => {
          fetchQuoteContracts();
          loadProjectData?.();
        }}
      />
    </>
  );
}
