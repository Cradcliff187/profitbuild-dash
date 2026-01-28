import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { QuoteForm } from "@/components/QuoteForm";
import { QuoteStatusSelector } from "@/components/QuoteStatusSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, Printer } from "lucide-react";
import { QuoteStatus } from "@/types/quote";
import { ContractGenerationModal } from "@/components/contracts/ContractGenerationModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Contract } from "@/types/contract";

export function QuoteViewRoute() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { quotes, estimates, projectId, loadProjectData } = useProjectContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showContractModal, setShowContractModal] = useState(false);
  const [quoteContracts, setQuoteContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  const quote = quotes.find((q) => q.id === quoteId);
  const [currentStatus, setCurrentStatus] = useState<QuoteStatus | string>(quote?.status ?? QuoteStatus.PENDING);

  const fetchQuoteContracts = useCallback(async () => {
    if (!quoteId) return;
    setContractsLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: false });
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

  if (!quote) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Quote not found
        </CardContent>
      </Card>
    );
  }

  const isAccepted = currentStatus === QuoteStatus.ACCEPTED || currentStatus === "accepted";

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Quote Status</h3>
              <QuoteStatusSelector
                quoteId={quote.id}
                currentStatus={currentStatus as QuoteStatus}
                quoteNumber={quote.quoteNumber}
                payeeName={quote.quotedBy}
                projectId={quote.project_id}
                totalAmount={quote.total}
                onStatusChange={(newStatus) => {
                  setCurrentStatus(newStatus);
                  loadProjectData?.();
                }}
                showLabel={false}
              />
            </div>
            {isAccepted && (
              <Button onClick={() => setShowContractModal(true)} data-testid="generate-contract-btn">
                <FileText className="mr-2 h-4 w-4" />
                Generate Contract
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <QuoteForm
        estimates={estimates}
        initialQuote={quote}
        onSave={() => {}}
        onCancel={() => {
          navigate(`/projects/${projectId}/estimates?tab=quotes`);
        }}
        mode="view"
        generatedContractsForQuote={quoteContracts}
      />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contractsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : quoteContracts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No contract generated for this quote.
              {isAccepted && " Use the button above to generate one."}
            </p>
          ) : (
            <div className="space-y-3">
              {quoteContracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{(c as { internal_reference?: string }).internal_reference || c.contract_number || '—'}</span>
                    {c.agreement_date && (
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(c.agreement_date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {c.docx_url && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(c.docx_url!)}`;
                            window.open(printUrl, '_blank');
                          }}
                          title="Print / Save as PDF"
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(c.docx_url!, "_blank")}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          DOCX
                        </Button>
                      </>
                    )}
                    {c.pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(c.pdf_url!, "_blank")}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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

