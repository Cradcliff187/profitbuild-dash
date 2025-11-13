import { useState } from 'react';
import { FileText, Upload, X, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBidMedia } from '@/hooks/useBidMedia';
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatFileSize } from '@/utils/videoUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import type { BidMedia } from '@/types/bid';

interface BidDocumentUploadProps {
  bidId: string;
}

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

export function BidDocumentUpload({ bidId }: BidDocumentUploadProps) {
  const queryClient = useQueryClient();
  const { media: documents, isLoading } = useBidMedia(bidId, { fileType: 'document' });
  const { upload, isUploading, progress } = useBidMediaUpload();
  const [dragOver, setDragOver] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<BidMedia | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (document: BidMedia) => {
      // Delete from storage
      const path = document.file_url.split('bid-documents/')[1];

      if (path) {
        const { error: storageError } = await supabase.storage
          .from('bid-documents')
          .remove([path]);

        if (storageError) console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('bid_media')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-media', bidId] });
      toast.success('Document deleted successfully');
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete document', {
        description: error.message,
      });
    },
  });

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Allowed: PDF, Word, Excel, Text',
      };
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB`,
      };
    }

    return { valid: true };
  };

  const handleFileSelect = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error('Invalid file', {
        description: validation.error,
      });
      return;
    }

    const result = await upload({
      bid_id: bidId,
      file,
      upload_source: 'web',
    });

    if (result) {
      queryClient.invalidateQueries({ queryKey: ['bid-media', bidId] });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDownload = async (document: BidMedia) => {
    try {
      const response = await fetch(document.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const handleDeleteClick = (document: BidMedia) => {
    setDocumentToDelete(document);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading documents...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`p-6 border-2 border-dashed transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Upload Document</p>
            <p className="text-xs text-muted-foreground">
              Drag and drop a file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, Word, Excel, Text (Max 10MB)
            </p>
          </div>

          <input
            type="file"
            id="document-upload"
            className="hidden"
            accept={ALLOWED_DOCUMENT_TYPES.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => document.getElementById('document-upload')?.click()}
            disabled={isUploading}
          >
            {isUploading ? `Uploading... ${progress}%` : 'Choose File'}
          </Button>

          {isUploading && progress > 0 && (
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Uploaded Documents ({documents.length})</h3>
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">
                      {doc.mime_type.split('/')[1].toUpperCase()}
                    </Badge>
                    <span>{formatFileSize(doc.file_size)}</span>
                    {doc.profiles?.full_name && (
                      <span>Uploaded by {doc.profiles.full_name}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDeleteClick(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
