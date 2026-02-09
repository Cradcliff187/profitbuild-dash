import { useState, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import type { DocumentType } from '@/types/document';

interface DocumentUploadProps {
  projectId: string;
  documentType: DocumentType;
  onUploadSuccess: () => void;
  relatedQuoteId?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/acad',
  'image/vnd.dwg',
  'image/x-dwg',
];

export function DocumentUpload({ 
  projectId, 
  documentType, 
  onUploadSuccess,
  relatedQuoteId 
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than 20MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }
    if (!ACCEPTED_FILE_TYPES.includes(file.type) && !file.name.match(/\.(dwg|dxf)$/i)) {
      return 'File type not supported. Accepted: PDF, images, CAD files, Office docs';
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error("Invalid file", { description: error });
      return;
    }
    setSelectedFile(file);
  }, []);

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
      const filePath = `${projectId}/${timestamp}-${selectedFile.name}`;

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

      const { error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: projectId,
          document_type: documentType,
          file_name: selectedFile.name,
          file_url: publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type || 'application/octet-stream',
          uploaded_by: user.id,
          related_quote_id: relatedQuoteId,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");

      setSelectedFile(null);
      onUploadSuccess();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Upload failed", { description: error instanceof Error ? error.message : "Failed to upload document" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!selectedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop or click to upload
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            PDF, images, CAD files, Office docs (max 20MB)
          </p>
          <input
            type="file"
            id="document-upload"
            className="hidden"
            onChange={handleFileInput}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.xls,.doc,.dwg,.dxf"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('document-upload')?.click()}
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
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {selectedFile && (
        <Button
          onClick={uploadFile}
          disabled={isUploading}
          className="w-full"
          size="sm"
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </Button>
      )}
    </div>
  );
}
