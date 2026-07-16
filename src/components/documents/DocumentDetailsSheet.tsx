import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canCreateQuoteFromDocument, newQuoteFromDocumentPath } from "@/utils/quoteFromDocument";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentLeadingIcon } from "@/utils/documentFileType";
import { toast } from "sonner";
import { DOCUMENT_TYPE_LABELS, ASSIGNABLE_DOCUMENT_TYPES } from "@/types/document";
import type { DocumentType, ProjectDocument } from "@/types/document";

interface DocumentDetailsSheetProps {
  document: ProjectDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fired after a successful save, with the values that were written. Callers
   * that filter their list by `document_type` need this: retyping a document
   * can move it OUT of the caller's list, and a silent disappearance reads as
   * a bug (see FieldDocumentsList). A no-arg `() => void` callback is still
   * assignable here, so existing callers are unaffected.
   */
  onSaved?: (saved: { document_type: DocumentType; file_name: string }) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export function DocumentDetailsSheet({ document, open, onOpenChange, onSaved }: DocumentDetailsSheetProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setFileName(document.file_name ?? "");
      setDocumentType(document.document_type);
      setDescription(document.description ?? "");
      // `expires_at` is a Postgres date; <input type="date"> wants YYYY-MM-DD.
      setExpiresAt(document.expires_at ?? "");
    }
  }, [document]);

  // Only permits and licenses expire. Everything else has no expiry concept, so
  // the field would be noise on 213 of 224 documents.
  const supportsExpiry = documentType === "permit" || documentType === "license";

  const isDirty =
    !!document &&
    (fileName.trim() !== (document.file_name ?? "") ||
      documentType !== document.document_type ||
      description.trim() !== (document.description ?? "") ||
      (expiresAt || null) !== (document.expires_at ?? null));

  const handleSave = async () => {
    if (!document) return;
    if (!fileName.trim()) {
      toast.error("File name is required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("project_documents")
        .update({
          file_name: fileName.trim(),
          document_type: documentType,
          description: description.trim() || null,
          // Cleared when the type no longer supports expiry, so a doc retyped
          // permit -> drawing can't keep a stale expiry driving a warning.
          expires_at: supportsExpiry ? expiresAt || null : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id);

      if (error) throw error;

      const projectId = document.project_id;
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["field-documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-docs-count", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-documents-timeline", projectId] });

      toast.success("Document updated");
      onSaved?.({ document_type: documentType, file_name: fileName.trim() });
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update document", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0 overflow-hidden">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Document details</SheetTitle>
          <SheetDescription>Update the name, type, and description of this document.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {document && (
            <>
              {/* Read-only summary */}
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <DocumentLeadingIcon
                  documentType={document.document_type}
                  mimeType={document.mime_type}
                  fileUrl={document.file_url}
                />
                <div className="min-w-0 flex-1 text-xs text-muted-foreground space-y-0.5">
                  <p>
                    <span className="font-medium text-foreground">Size:</span>{" "}
                    {formatFileSize(document.file_size)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Uploaded:</span>{" "}
                    {format(new Date(document.created_at), "MMM d, yyyy")}
                  </p>
                  {/* No "Version" row. version_number is written by nothing, so
                      it rendered "v1" on every document in the database —
                      fabricated information about drawing currency. Restore it
                      only if revisioning gets wired. */}
                  <p className="truncate">
                    <span className="font-medium text-foreground">Type:</span> {document.mime_type}
                  </p>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-2">
                <Label htmlFor="document-file-name">File name</Label>
                <Input
                  id="document-file-name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Document name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-type">Document type</Label>
                <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
                  <SelectTrigger id="document-type">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      new Set<DocumentType>([...ASSIGNABLE_DOCUMENT_TYPES, document.document_type])
                    ).map((key) => (
                      <SelectItem key={key} value={key}>
                        {DOCUMENT_TYPE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry. `expires_at` had NO writer anywhere in the app — not
                  here, not uploadProjectDocument — so it was null on all 11
                  permits/licenses and the expiry warnings in FieldDocumentsList
                  and ProjectDocumentsTable were unreachable code. An expired
                  permit is the one signal on a field doc list with legal
                  consequence; this is what makes it reachable. */}
              {supportsExpiry && (
                <div className="space-y-2">
                  <Label htmlFor="document-expires-at">Expires</Label>
                  <Input
                    id="document-expires-at"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Field crews see a warning 30 days out, and in red once expired.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="document-description">Description</Label>
                <Textarea
                  id="document-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <footer className="border-t px-6 py-3 flex items-center gap-2 shrink-0">
          {document && canCreateQuoteFromDocument(document) && (
            <Button
              variant="secondary"
              className="mr-auto"
              disabled={isSaving}
              onClick={() => {
                const path = newQuoteFromDocumentPath(document);
                onOpenChange(false);
                navigate(path);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Create quote from document
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
