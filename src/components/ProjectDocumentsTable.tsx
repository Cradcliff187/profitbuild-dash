import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Download, Trash2, Search, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import type { ProjectDocument, DocumentType } from '@/types/document';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_ICONS } from '@/types/document';

interface ProjectDocumentsTableProps {
  projectId: string;
  documentType?: DocumentType;
  onDocumentDeleted?: () => void;
}

export function ProjectDocumentsTable({ 
  projectId, 
  documentType,
  onDocumentDeleted 
}: ProjectDocumentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocument | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time subscription for project documents
  useEffect(() => {
    const channel = supabase
      .channel(`project-documents-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_documents',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project-documents', projectId, documentType] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, documentType, queryClient]);

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['project-documents', projectId, documentType],
    queryFn: async () => {
      let query = supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProjectDocument[];
    },
  });

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const filePath = documentToDelete.file_url.split('/project-documents/')[1];
      
      await supabase.storage.from('project-documents').remove([filePath]);
      
      const { error } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', documentToDelete.id);

      if (error) throw error;

      toast({
        title: 'Document deleted',
        description: 'Document removed successfully',
      });

      refetch();
      onDocumentDeleted?.();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete document',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const getExpirationWarning = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const daysUntilExpiry = differenceInDays(parseISO(expiresAt), new Date());
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    }
    if (daysUntilExpiry <= 30) {
      return <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
        Expires in {daysUntilExpiry}d
      </Badge>;
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground p-2">Loading documents...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border-border pl-10 text-sm shadow-sm sm:h-9"
          />
        </div>
        {!documentType && (
          <div className="sm:w-[220px]">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocumentType | 'all')}>
              <SelectTrigger className="h-11 w-full rounded-xl border-border text-sm shadow-sm sm:h-9">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
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
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => window.open(doc.file_url, '_blank')}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <span className="text-xl text-muted-foreground">
                    {DOCUMENT_TYPE_ICONS[doc.document_type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground break-words">
                      {doc.file_name}
                    </p>
                    {doc.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground break-words">
                        {doc.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        v{doc.version_number}
                      </Badge>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(parseISO(doc.created_at), { addSuffix: true })}</span>
                      {getExpirationWarning(doc.expires_at)}
                    </div>
                  </div>
                </button>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    className="h-9 w-9 rounded-full"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = doc.file_url;
                      a.download = doc.file_name;
                      a.click();
                    }}
                    className="h-9 w-9 rounded-full"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDocumentToDelete(doc);
                      setDeleteDialogOpen(true);
                    }}
                    className="h-9 w-9 rounded-full text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium text-xs">Document</th>
                  <th className="p-2 text-left font-medium text-xs">Version</th>
                  <th className="p-2 text-left font-medium text-xs">Size</th>
                  <th className="p-2 text-left font-medium text-xs">Uploaded</th>
                  <th className="p-2 text-right font-medium text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="transition-colors hover:bg-muted/30">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{DOCUMENT_TYPE_ICONS[doc.document_type]}</span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{doc.file_name}</p>
                          {doc.description && (
                            <p className="truncate text-xs text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">v{doc.version_number}</Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(parseISO(doc.created_at), { addSuffix: true })}
                        </span>
                        {getExpirationWarning(doc.expires_at)}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.file_url, '_blank')}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = doc.file_url;
                            a.download = doc.file_name;
                            a.click();
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDocumentToDelete(doc);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
