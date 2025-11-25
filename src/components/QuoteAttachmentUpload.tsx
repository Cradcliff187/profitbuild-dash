import { useState, useCallback } from 'react';
import { Upload, File, X, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface QuoteAttachmentUploadProps {
  projectId: string;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
  existingFile?: { url: string; name: string };
  disabled?: boolean;
  relatedQuoteId?: string;
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
  relatedQuoteId
}: QuoteAttachmentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

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
      toast({
        title: 'Invalid file',
        description: error,
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const timestamp = Date.now();
      const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${projectId}/quotes/${timestamp}-${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      // Create record in project_documents table
      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          document_type: 'other', // Using 'other' since 'quote' is not in DocumentType enum
          file_name: selectedFile.name,
          file_url: publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type || 'application/octet-stream',
          uploaded_by: user.id,
          related_quote_id: relatedQuoteId,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Quote document uploaded successfully',
      });

      setSelectedFile(null);
      onUploadSuccess(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Show existing file if provided
  if (existingFile) {
    return (
      <div className="border rounded-lg p-3 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{existingFile.name}</p>
            <p className="text-xs text-muted-foreground">Quote document attached</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(existingFile.url, '_blank')}
            disabled={disabled}
          >
            View
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled || isUploading}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!selectedFile ? (
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
          <input
            type="file"
            id="quote-attachment-upload"
            className="hidden"
            onChange={handleFileInput}
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => !disabled && document.getElementById('quote-attachment-upload')?.click()}
            disabled={disabled}
          >
            Select File
          </Button>
        </div>
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

      {selectedFile && (
        <Button
          onClick={uploadFile}
          disabled={isUploading || disabled}
          className="w-full"
          size="sm"
        >
          {isUploading ? 'Uploading...' : 'Upload Quote Document'}
        </Button>
      )}
    </div>
  );
}

