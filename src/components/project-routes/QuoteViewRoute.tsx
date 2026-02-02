import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectContext } from "@/components/ProjectDetailView";
import { QuoteForm } from "@/components/QuoteForm";
import { QuoteStatusSelector } from "@/components/QuoteStatusSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, Printer, MoreHorizontal, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QuoteStatus } from "@/types/quote";
import { ContractGenerationModal } from "@/components/contracts/ContractGenerationModal";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Contract } from "@/types/contract";

export function QuoteViewRoute() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { project, quotes, estimates, projectId, loadProjectData } = useProjectContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showContractModal, setShowContractModal] = useState(false);
  const [quoteContracts, setQuoteContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [deleteContractDialogOpen, setDeleteContractDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

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

  const handleDeleteContract = useCallback(async (contractId: string) => {
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
      const { error } = await supabase.from("contracts").delete().eq("id", contractId);
      if (error) throw error;
      toast({ title: "Contract deleted", description: "The contract has been removed." });
      await fetchQuoteContracts();
    } catch (err) {
      console.error("Error deleting contract:", err);
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Failed to delete contract",
        variant: "destructive",
      });
    }
  }, [fetchQuoteContracts, toast]);

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
        projectNumber={project?.project_number ?? undefined}
        payeeName={quote?.quotedBy}
        onDeleteContract={handleDeleteContract}
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
              {quoteContracts.map((c) => {
                const primaryLine = project?.project_number && quote?.quotedBy
                  ? `Contract • ${project.project_number} • ${quote.quotedBy}`
                  : ((c as { internal_reference?: string }).internal_reference || c.contract_number || '—');
                const contractRef = (c as { internal_reference?: string }).internal_reference || c.contract_number || '—';
                return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate" title={primaryLine}>{primaryLine}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5" title={contractRef}>{contractRef}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm font-medium">{formatCurrency(c.subcontract_price)}</p>
                          <Badge variant="secondary" className="text-xs">{c.status}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.agreement_date ? format(new Date(c.agreement_date), 'MMM d, yyyy') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                          {(c as { internal_reference?: string }).internal_reference || c.contract_number || '—'}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.open(c.pdf_url || c.docx_url || '', '_blank')}>
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        {c.docx_url && (
                          <>
                            {!isMobile && (
                              <DropdownMenuItem onClick={() => {
                                const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(c.docx_url!)}`;
                                window.open(printUrl, '_blank');
                              }}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => window.open(c.docx_url!, "_blank")}>
                              <Download className="h-4 w-4 mr-2" />
                              Download DOCX
                            </DropdownMenuItem>
                          </>
                        )}
                        {c.pdf_url && (
                          <DropdownMenuItem onClick={() => window.open(c.pdf_url!, "_blank")}>
                            <FileText className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setContractToDelete(c);
                            setDeleteContractDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                </div>
                );
              })}
            </div>
          )}

          <AlertDialog open={deleteContractDialogOpen} onOpenChange={setDeleteContractDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Contract</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this contract? Related document records will be removed. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (contractToDelete) {
                      await handleDeleteContract(contractToDelete.id);
                      setContractToDelete(null);
                    }
                    setDeleteContractDialogOpen(false);
                  }}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

