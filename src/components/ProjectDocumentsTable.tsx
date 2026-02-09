import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Filter, FileText, Eye, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { MobileListCard } from "@/components/ui/mobile-list-card";
import { DocumentLeadingIcon } from "@/utils/documentFileType";
import { useDocumentPreview } from "@/hooks/useDocumentPreview";
import { DocumentPreviewModals } from "@/components/documents/DocumentPreviewModals";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, differenceInDays, parseISO } from "date-fns";
import type { ProjectDocument, DocumentType } from "@/types/document";
import { DOCUMENT_TYPE_LABELS } from "@/types/document";

interface ProjectDocumentsTableProps {
  projectId: string;
  documentType?: DocumentType;
  projectNumber?: string;
  onDocumentDeleted?: () => void;
}

export function ProjectDocumentsTable({ projectId, documentType, projectNumber, onDocumentDeleted }: ProjectDocumentsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocument | null>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const preview = useDocumentPreview();

  // Real-time subscription for project documents
  useEffect(() => {
    const channel = supabase
      .channel(`project-documents-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_documents",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["project-documents", projectId, documentType] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, documentType, queryClient]);

  const {
    data: documents = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["project-documents", projectId, documentType],
    queryFn: async () => {
      let query = supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (documentType) {
        query = query.eq("document_type", documentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectDocument[];
    },
  });

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const filePath = documentToDelete.file_url.split("/project-documents/")[1];

      await supabase.storage.from("project-documents").remove([filePath]);

      const { error } = await supabase.from("project_documents").delete().eq("id", documentToDelete.id);

      if (error) throw error;

      toast.success("Document deleted", { description: "Document removed successfully" });

      refetch();
      onDocumentDeleted?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Delete error:", error);
      }
      toast.error("Delete failed", { description: error instanceof Error ? error.message : "Failed to delete document" });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const getExpirationWarning = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const daysUntilExpiry = differenceInDays(parseISO(expiresAt), new Date());
    if (daysUntilExpiry < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Expired
        </Badge>
      );
    }
    if (daysUntilExpiry <= 30) {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
          Expires in {daysUntilExpiry}d
        </Badge>
      );
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };


  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-2">Loading documents...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9"
        />
        {!documentType && (
          <div className="sm:w-[220px]">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocumentType | "all")}>
              <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/10 py-12 text-center">
          <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No documents found</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Upload documents to quickly share drawings, permits, licenses, or receipts with the team.
          </p>
        </div>
      ) : (
        <>
          {/* Document Cards - shown on all screen sizes */}
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <MobileListCard
                key={doc.id}
                leading={
                  <DocumentLeadingIcon
                    documentType={doc.document_type}
                    mimeType={doc.mime_type}
                    fileUrl={doc.file_url}
                  />
                }
                title={projectNumber
                  ? `${DOCUMENT_TYPE_LABELS[doc.document_type] ?? 'Document'} • ${projectNumber}`
                  : doc.file_name
                }
                subtitle={doc.description || doc.file_name}
                badge={{
                  label: DOCUMENT_TYPE_LABELS[doc.document_type] ?? 'Document',
                  className: '',
                }}
                secondaryBadge={{
                  label: `v${doc.version_number}`,
                  className: '',
                }}
                metrics={[
                  { label: 'Size', value: formatFileSize(doc.file_size) },
                  { label: 'Uploaded', value: format(new Date(doc.created_at), 'MMM d, yyyy') },
                ]}
                attention={getExpirationWarning(doc.expires_at) ? {
                  message: differenceInDays(parseISO(doc.expires_at!), new Date()) < 0
                    ? 'Expired'
                    : `Expires in ${differenceInDays(parseISO(doc.expires_at!), new Date())} days`,
                  variant: differenceInDays(parseISO(doc.expires_at!), new Date()) < 0 ? 'error' : 'warning',
                } : undefined}
                onTap={() => preview.openPreview({
                  fileUrl: doc.file_url,
                  fileName: doc.file_name,
                  mimeType: doc.mime_type,
                })}
                actions={[
                  {
                    icon: Eye,
                    label: 'Preview',
                    onClick: (e) => {
                      e.stopPropagation();
                      preview.openPreview({
                        fileUrl: doc.file_url,
                        fileName: doc.file_name,
                        mimeType: doc.mime_type,
                      });
                    },
                  },
                  {
                    icon: Download,
                    label: 'Download',
                    onClick: (e) => {
                      e.stopPropagation();
                      const a = document.createElement("a");
                      a.href = doc.file_url;
                      a.download = doc.file_name;
                      a.click();
                    },
                  },
                  {
                    icon: Trash2,
                    label: 'Delete',
                    variant: 'destructive' as const,
                    onClick: (e) => {
                      e.stopPropagation();
                      setDocumentToDelete(doc);
                      setDeleteDialogOpen(true);
                    },
                  },
                ]}
              />
            ))}
          </div>
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentPreviewModals preview={preview} />
    </div>
  );
}
