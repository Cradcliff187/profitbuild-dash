import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Eye, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { DocumentPreviewModals } from '@/components/documents/DocumentPreviewModals';
import { DocumentDetailsSheet } from '@/components/documents/DocumentDetailsSheet';
import { deleteProjectDocument } from '@/utils/projectDocumentDelete';
import { useRoles } from '@/contexts/RoleContext';
import { DOCUMENT_TYPE_LABELS, type DocumentType, type ProjectDocument } from '@/types/document';
import { DOCUMENT_TYPE_LUCIDE_ICONS, DOCUMENT_TYPE_ICON_COLORS } from '@/utils/documentFileType';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

interface FieldDocumentsListProps {
  projectId: string;
}

// Field-relevant document types. "other" is included so documents attached
// from the mobile FieldQuickActionBar Attach button (non-media files) are
// visible in the field worker's Documents tab — otherwise they'd silently
// vanish into the full project_documents list, invisible on this surface.
const FIELD_DOCUMENT_TYPES: DocumentType[] = ['drawing', 'permit', 'license', 'specification', 'other'];

const SECTION_LABELS: Record<string, { title: string; types: DocumentType[] }> = {
  plans: { title: 'Plans & Drawings', types: ['drawing'] },
  permits: { title: 'Permits & Licenses', types: ['permit', 'license'] },
  specs: { title: 'Specifications', types: ['specification'] },
  attachments: { title: 'Field Attachments', types: ['other'] },
};

function ExpirationWarning({ expiresAt }: { expiresAt: string }) {
  const daysUntil = differenceInDays(new Date(expiresAt), new Date());

  if (daysUntil > 30) return null;

  const isExpired = daysUntil < 0;
  const isUrgent = daysUntil <= 7;

  return (
    <div className={`flex items-center gap-1 text-[10px] mt-1 ${
      isExpired ? 'text-destructive' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'
    }`}>
      <AlertTriangle className="h-3 w-3" />
      {isExpired
        ? `Expired ${format(new Date(expiresAt), 'MMM d')}`
        : `Expires ${format(new Date(expiresAt), 'MMM d')} (${daysUntil}d)`
      }
    </div>
  );
}

function DocumentCard({
  doc,
  onPreview,
  onEdit,
  onDelete,
}: {
  doc: ProjectDocument;
  onPreview: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const Icon = DOCUMENT_TYPE_LUCIDE_ICONS[doc.document_type] || FileText;
  const iconColor = DOCUMENT_TYPE_ICON_COLORS[doc.document_type] || 'text-muted-foreground';

  return (
    <Card className="p-3 hover:bg-muted/30 active:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted/50 p-2 flex-shrink-0">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{doc.file_name}</p>
          {doc.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {DOCUMENT_TYPE_LABELS[doc.document_type]}
            </Badge>
            <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
          </div>
          {doc.expires_at && <ExpirationWarning expiresAt={doc.expires_at} />}
        </div>

        <div className="flex flex-col gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="h-9 w-9 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <a href={doc.file_url} download={doc.file_name} onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-9 w-9 p-0">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-9 w-9 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function FieldDocumentsList({ projectId }: FieldDocumentsListProps) {
  const preview = useDocumentPreview();
  const queryClient = useQueryClient();
  const { isAdmin, isManager } = useRoles();
  const canEdit = isAdmin || isManager;
  const [documentToEdit, setDocumentToEdit] = useState<ProjectDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!documentToDelete) return;
    setIsDeleting(true);
    const { error } = await deleteProjectDocument(documentToDelete);
    setIsDeleting(false);

    if (error) {
      toast.error("Delete failed", { description: error.message || "Failed to delete document" });
      return;
    }

    toast.success("Document deleted", { description: "Document removed successfully" });
    queryClient.invalidateQueries({ queryKey: ['field-documents', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-documents', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-documents-timeline', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-docs-count', projectId] });
    setDocumentToDelete(null);
  };

  const { data: documents, isLoading } = useQuery({
    queryKey: ['field-documents', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .in('document_type', FIELD_DOCUMENT_TYPES)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ProjectDocument[];
    },
    enabled: !!projectId,
  });

  // Group documents by section
  const sections = useMemo(() => {
    if (!documents) return [];

    return Object.entries(SECTION_LABELS)
      .map(([key, { title, types }]) => ({
        key,
        title,
        docs: documents.filter((d) => types.includes(d.document_type)),
      }))
      .filter((section) => section.docs.length > 0);
  }, [documents]);

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground font-medium">No reference documents</p>
        <p className="text-xs text-muted-foreground mt-1">
          Plans, permits, and specs will appear here
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.key}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.docs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onPreview={() =>
                  preview.openPreview({
                    fileUrl: doc.file_url,
                    fileName: doc.file_name,
                    mimeType: doc.mime_type,
                  })
                }
                onEdit={canEdit ? () => setDocumentToEdit(doc) : undefined}
                onDelete={canEdit ? () => setDocumentToDelete(doc) : undefined}
              />
            ))}
          </div>
        </div>
      ))}

      <DocumentPreviewModals preview={preview} />

      <DocumentDetailsSheet
        document={documentToEdit}
        open={!!documentToEdit}
        onOpenChange={(o) => !o && setDocumentToEdit(null)}
      />

      <AlertDialog open={!!documentToDelete} onOpenChange={(o) => !o && !isDeleting && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
