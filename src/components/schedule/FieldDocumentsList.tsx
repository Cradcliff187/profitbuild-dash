import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, AlertTriangle, Pencil, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntityFilterBar } from '@/components/filters/EntityFilterBar';
import type { FilterFieldDef } from '@/components/filters/filterTypes';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { DocumentPreviewModals } from '@/components/documents/DocumentPreviewModals';
import { DocumentDetailsSheet } from '@/components/documents/DocumentDetailsSheet';
import { useRoles } from '@/contexts/RoleContext';
import { DOCUMENT_TYPE_LABELS, type DocumentType, type ProjectDocument } from '@/types/document';
import { DOCUMENT_TYPE_LUCIDE_ICONS, DOCUMENT_TYPE_ICON_COLORS, getDocumentDisplayDescription } from '@/utils/documentFileType';
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

/** Show the search input once the list is too long to scan with gloves on. */
const SEARCH_THRESHOLD = 10;

const FILTER_FIELDS: FilterFieldDef[] = [
  { kind: 'search', key: 'search', placeholder: 'Search documents…' },
];

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
  showTypeBadge,
  onPreview,
  onEdit,
}: {
  doc: ProjectDocument;
  /**
   * Only true in sections that actually mix types (Permits & Licenses). In a
   * single-type section the badge restates the section header on every row —
   * "Drawing/Plan" under "PLANS & DRAWINGS" — and the row's second line is
   * scarce on a 375px screen.
   */
  showTypeBadge: boolean;
  onPreview: () => void;
  onEdit?: () => void;
}) {
  const Icon = DOCUMENT_TYPE_LUCIDE_ICONS[doc.document_type] || FileText;
  const iconColor = DOCUMENT_TYPE_ICON_COLORS[doc.document_type] || 'text-muted-foreground';
  const displayDescription = getDocumentDisplayDescription(doc.description);

  // Row shape matches the project hub's drill-down rows (Rule 37): tap the row
  // to open the document, secondary actions behind a kebab. The four actions
  // used to stack VERTICALLY (`flex-col`), making every card ~156px tall for an
  // admin — a doc list that showed two files per screen on a phone.
  //
  // The tap region is a <button> and the kebab is its SIBLING, never a child:
  // nesting interactive elements is invalid HTML, and a Radix trigger inside a
  // clickable row needs stopPropagation to survive (Gotcha #25). Siblings avoid
  // both problems by construction.
  const hasMenu = Boolean(onEdit);

  return (
    <Card className="p-0 overflow-hidden hover:bg-muted/30 transition-colors">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onPreview}
          className="flex-1 min-w-0 flex items-start gap-3 p-3 text-left min-h-[56px] active:bg-muted/50 transition-colors"
        >
          <div className="rounded-lg bg-muted/50 p-2 flex-shrink-0">
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>

          {/* The file name is the only thing that identifies these documents,
              so it gets the room. The upload date used to render on every row;
              it's `created_at`, which across the live corpus is a bulk-import
              timestamp (42 drawings share 6 upload days) — and the list is
              already ordered newest-first, so position conveys recency without
              spending a line per row. Exact date still lives in Edit details. */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.file_name}</p>
            {displayDescription && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{displayDescription}</p>
            )}
            {showTypeBadge && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 mt-1">
                {DOCUMENT_TYPE_LABELS[doc.document_type]}
              </Badge>
            )}
            {doc.expires_at && <ExpirationWarning expiresAt={doc.expires_at} />}
          </div>
        </button>

        {/* Field workers get Download as a direct button rather than a
            single-item kebab — same call ProjectDetailView made when it
            un-wrapped Edit from a one-item dropdown (extra tap, visual noise). */}
        {hasMenu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 mr-1 flex-shrink-0"
                aria-label={`Actions for ${doc.file_name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={doc.file_url} download={doc.file_name}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit details
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="ghost" size="sm" className="h-10 w-10 p-0 mr-1 flex-shrink-0">
            <a
              href={doc.file_url}
              download={doc.file_name}
              aria-label={`Download ${doc.file_name}`}
            >
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}

export function FieldDocumentsList({ projectId }: FieldDocumentsListProps) {
  const preview = useDocumentPreview();
  const { isAdmin, isManager } = useRoles();
  const canEdit = isAdmin || isManager;
  const [documentToEdit, setDocumentToEdit] = useState<ProjectDocument | null>(null);
  const [search, setSearch] = useState('');


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

  // Search across name + description. A real project carries 40+ drawings and
  // this is a gloves-on surface — scrolling a flat list is not a find strategy.
  const filtered = useMemo(() => {
    if (!documents) return [];
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.file_name?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }, [documents, search]);

  // Group documents by section. `showTypeBadge` is derived from the section's
  // own definition, so a single-type section never restates itself per row.
  const sections = useMemo(
    () =>
      Object.entries(SECTION_LABELS)
        .map(([key, { title, types }]) => ({
          key,
          title,
          showTypeBadge: types.length > 1,
          docs: filtered.filter((d) => types.includes(d.document_type)),
        }))
        .filter((section) => section.docs.length > 0),
    [filtered]
  );

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

  const showSearch = documents.length > SEARCH_THRESHOLD;

  return (
    <div className="space-y-4">
      {showSearch && (
        <EntityFilterBar
          entityName="Documents"
          fields={FILTER_FIELDS}
          values={{ search }}
          onChange={(patch) => setSearch((patch.search as string) ?? '')}
          onClearAll={() => setSearch('')}
          resultCount={filtered.length}
        />
      )}

      {sections.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm font-medium">No documents match "{search}"</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 min-h-[44px]"
            onClick={() => setSearch('')}
          >
            Clear search
          </Button>
        </Card>
      )}

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
                showTypeBadge={section.showTypeBadge}
                onPreview={() =>
                  preview.openPreview({
                    fileUrl: doc.file_url,
                    fileName: doc.file_name,
                    mimeType: doc.mime_type,
                  })
                }
                onEdit={canEdit ? () => setDocumentToEdit(doc) : undefined}
              />
            ))}
          </div>
        </div>
      ))}

      <DocumentPreviewModals preview={preview} />

      {/* The editor offers every ASSIGNABLE_DOCUMENT_TYPE, but this list only
          shows FIELD_DOCUMENT_TYPES — so retyping a document to contract /
          report / invoice / quote moves it OUT of the field list. Without this
          it just disappeared from under the admin's finger with no toast and
          no explanation, which reads as data loss. Say what happened and where
          it went; the doc is still on the project's Documents hub. */}
      <DocumentDetailsSheet
        document={documentToEdit}
        open={!!documentToEdit}
        onOpenChange={(o) => !o && setDocumentToEdit(null)}
        onSaved={(saved) => {
          if (!FIELD_DOCUMENT_TYPES.includes(saved.document_type)) {
            toast.info('Moved to Documents', {
              description: `"${saved.file_name}" is now a ${DOCUMENT_TYPE_LABELS[saved.document_type]} and no longer appears in the field list.`,
            });
          }
        }}
      />

    </div>
  );
}
