import { useState, useCallback, useRef } from 'react';
import { Upload, File, X, FileText, Eye, Download, Printer, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { isIOSPWA } from '@/utils/platform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QuoteAttachmentUploadProps {
  projectId: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  existingFile?: { url: string; name: string };
  disabled?: boolean;
  relatedQuoteId?: string;
  /** When provided, View opens in the same preview modal as contracts instead of a new tab */
  onViewDocument?: (url: string, fileName: string) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function QuoteAttachmentUpload({
  projectId,
  onUploadSuccess,
  onRemove,
  existingFile,
  disabled = false,
  relatedQuoteId,
  onViewDocument,
}: QuoteAttachmentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than 20MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return 'File type not supported. Accepted: PDF, JPEG, PNG, WebP';
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setSelectedFile(file);
  }, []);

  // Define uploadFile as useCallback - accepts optional file to avoid state timing issues
  const uploadFile = useCallback(async (fileToUpload?: File) => {
    // Use passed file OR fall back to state
    const file = fileToUpload || selectedFile;

    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error('Not authenticated');
      }
      if (!user) {
        throw new Error('Not authenticated');
      }

      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${projectId}/quotes/${timestamp}-${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      // Create record in project_documents table
      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          document_type: 'other',
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          uploaded_by: user.id,
          related_quote_id: relatedQuoteId,
        })
        .select();

      if (dbError) {
        throw dbError;
      }

      // Update the quote's attachment_url directly so it appears in Quote PDFs tab
      if (relatedQuoteId) {
        await supabase
          .from('quotes')
          .update({ attachment_url: publicUrl })
          .eq('id', relatedQuoteId);
        // Don't throw - the file is already uploaded, just continue
      }

      toast.success('Quote document uploaded successfully');

      setSelectedFile(null);
      onUploadSuccess(publicUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, projectId, relatedQuoteId, onUploadSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
      // Auto-upload after drag-drop - pass file directly to avoid state timing issues
      setTimeout(() => uploadFile(file), 100);
    }
  }, [handleFile, uploadFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
      // Auto-upload for ALL devices - pass file directly to avoid state timing issues
      setTimeout(() => uploadFile(file), 100);
    }
  };

  const handleSelectFile = () => {
    if (disabled) return;
    
    if (isIOSPWA()) {
      toast.info("Select Take Photo or Video, Photo Library, or Browse from your iPhone's sheet.", {
        duration: 4000,
      });
    }
    fileInputRef.current?.click();
  };

  // Show existing file in contract-style card (align with Generated contracts in QuoteForm)
  if (existingFile) {
    const isPdf = existingFile.name.toLowerCase().endsWith('.pdf');
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate" title={existingFile.name}>
                {existingFile.name}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                Quote document attached
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={disabled}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  {existingFile.name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (onViewDocument) {
                      onViewDocument(existingFile.url, existingFile.name);
                    } else {
                      window.open(existingFile.url, '_blank');
                    }
                  }}
                  disabled={disabled}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </DropdownMenuItem>
                {!isMobile && isPdf && (
                  <DropdownMenuItem
                    onClick={() => {
                      const printUrl = `https://docs.google.com/gview?url=${encodeURIComponent(existingFile.url)}`;
                      window.open(printUrl, '_blank');
                    }}
                    disabled={disabled}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => window.open(existingFile.url, '_blank')}
                  disabled={disabled}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                {onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onRemove}
                      disabled={disabled || isUploading}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hidden input OUTSIDE drag-drop area */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInput}
        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
        disabled={disabled}
      />
      
      {!selectedFile ? (
        isMobile ? (
          // Mobile: Simple button with large touch target
          <Button
            type="button"
            onClick={handleSelectFile}
            variant="outline"
            className="w-full h-16 text-base"
            disabled={disabled}
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Quote Document
          </Button>
        ) : (
          // Desktop: Keep drag-and-drop area
          <div
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop or click to upload quote document
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              PDF, JPEG, PNG, WebP (max 20MB)
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectFile}
              disabled={disabled}
            >
              Select File
            </Button>
          </div>
        )
      ) : (
        <div className="border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFile(null)}
            disabled={isUploading || disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Show uploading state for all devices */}
      {selectedFile && isUploading && (
        <p className="text-sm text-center text-muted-foreground">Uploading...</p>
      )}
    </div>
  );
}

