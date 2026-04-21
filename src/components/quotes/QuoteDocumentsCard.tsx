import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  ChevronDown,
  Download,
  Eye,
  FileText,
  FolderArchive,
  MoreHorizontal,
  Paperclip,
  Printer,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuoteAttachmentUpload } from "@/components/QuoteAttachmentUpload";
import { PdfPreviewModal } from "@/components/PdfPreviewModal";
import type { Quote } from "@/types/quote";
import type { Contract } from "@/types/contract";

interface QuoteDocumentsCardProps {
  quote: Quote;
  contracts: Contract[];
  contractsLoading: boolean;
  onDeleteContract: (contractId: string) => Promise<void>;
  onAttachmentChange: () => void;
}

export function QuoteDocumentsCard({
  quote,
  contracts,
  contractsLoading,
  onDeleteContract,
  onAttachmentChange,
}: QuoteDocumentsCardProps) {
  const isMobile = useIsMobile();
  const [attachmentUrl, setAttachmentUrl] = useState<string>(
    quote.attachment_url ?? ""
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [showOlderVersions, setShowOlderVersions] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  const sortedContracts = [...contracts].sort(
    (a, b) => (b.version ?? 0) - (a.version ?? 0)
  );
  const currentContract = sortedContracts[0];
  const olderContracts = sortedContracts.slice(1);

  const handleView = (url: string, fileName: string) => {
    setPreviewUrl(url);
    setPreviewFileName(fileName);
    setPreviewOpen(true);
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderArchive className="h-4 w-4" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {/* Vendor's uploaded quote PDF */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Quote from vendor
              </h3>
            </div>
            <QuoteAttachmentUpload
              projectId={quote.project_id}
              onUploadSuccess={(url) => {
                setAttachmentUrl(url);
                onAttachmentChange();
              }}
              onRemove={async () => {
                try {
                  const { error: docError } = await supabase
                    .from("project_documents")
                    .delete()
                    .eq("related_quote_id", quote.id);
                  if (docError) console.error("project_documents delete:", docError);

                  const { error: quoteError } = await supabase
                    .from("quotes")
                    .update({ attachment_url: null })
                    .eq("id", quote.id);
                  if (quoteError) {
                    toast.error(quoteError.message);
                    return;
                  }
                  toast.success("Quote attachment removed");
                  setAttachmentUrl("");
                  onAttachmentChange();
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "An error occurred"
                  );
                }
              }}
              onViewDocument={handleView}
              existingFile={
                attachmentUrl
                  ? { url: attachmentUrl, name: "Quote Attachment" }
                  : undefined
              }
              relatedQuoteId={quote.id}
            />
          </section>

          {/* Generated contracts — versioned */}
          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Generated contracts
                </h3>
                {sortedContracts.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {sortedContracts.length}
                  </Badge>
                )}
              </div>
            </div>

            {contractsLoading ? (
              <p className="text-xs text-muted-foreground py-3">Loading…</p>
            ) : sortedContracts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">
                No contract generated yet.
              </p>
            ) : (
              <div className="space-y-2">
                <ContractRow
                  contract={currentContract}
                  isCurrent
                  onView={handleView}
                  onDelete={() => setContractToDelete(currentContract)}
                  isMobile={isMobile}
                />

                {olderContracts.length > 0 && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground w-full justify-start -ml-2"
                      onClick={() => setShowOlderVersions((v) => !v)}
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 mr-1 transition-transform",
                          showOlderVersions && "rotate-180"
                        )}
                      />
                      {showOlderVersions ? "Hide" : "Show"}{" "}
                      {olderContracts.length} previous version
                      {olderContracts.length === 1 ? "" : "s"}
                    </Button>
                    {showOlderVersions && (
                      <div className="space-y-2 mt-2">
                        {olderContracts.map((c) => (
                          <ContractRow
                            key={c.id}
                            contract={c}
                            onView={handleView}
                            onDelete={() => setContractToDelete(c)}
                            isMobile={isMobile}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </CardContent>
      </Card>

      <PdfPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        pdfUrl={previewUrl}
        fileName={previewFileName}
      />

      <AlertDialog
        open={contractToDelete !== null}
        onOpenChange={(open) => !open && setContractToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting v{contractToDelete?.version} will remove the generated
              files and the related document record. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (contractToDelete) {
                  await onDeleteContract(contractToDelete.id);
                  setContractToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ContractRowProps {
  contract: Contract;
  isCurrent?: boolean;
  onView: (url: string, fileName: string) => void;
  onDelete: () => void;
  isMobile: boolean;
}

function ContractRow({
  contract,
  isCurrent,
  onView,
  onDelete,
  isMobile,
}: ContractRowProps) {
  const ref = contract.internal_reference || contract.contract_number || "—";
  const viewUrl = contract.pdf_url || contract.docx_url;
  const fileName = `${ref}.${contract.pdf_url ? "pdf" : "docx"}`;
  const isSuperseded = contract.status === "superseded";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isCurrent
          ? "border-border bg-card"
          : "border-border/60 bg-muted/30 opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium tabular-nums">
              v{contract.version ?? 1}
            </span>
            {isCurrent && !isSuperseded && (
              <Badge
                className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30"
                variant="outline"
              >
                Current
              </Badge>
            )}
            {isSuperseded && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Superseded
              </Badge>
            )}
            {contract.status && !isSuperseded && !isCurrent && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {contract.status}
              </Badge>
            )}
          </div>
          <p
            className="text-xs text-muted-foreground truncate mt-0.5"
            title={ref}
          >
            {ref}
          </p>
          <div className="mt-1.5 flex items-baseline gap-3 tabular-nums">
            <span className="text-sm font-medium">
              {formatCurrency(contract.subcontract_price)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {contract.agreement_date
                ? format(new Date(contract.agreement_date), "MMM d, yyyy")
                : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {viewUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => onView(viewUrl, fileName)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                {ref}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {contract.docx_url && (
                <>
                  {!isMobile && (
                    <DropdownMenuItem
                      onClick={() => {
                        const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
                          contract.docx_url!
                        )}`;
                        window.open(printUrl, "_blank");
                      }}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => window.open(contract.docx_url!, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download DOCX
                  </DropdownMenuItem>
                </>
              )}
              {contract.pdf_url && (
                <DropdownMenuItem
                  onClick={() => window.open(contract.pdf_url!, "_blank")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
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
}
