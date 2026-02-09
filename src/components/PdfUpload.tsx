import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface PdfUploadProps {
  onUpload: (url: string, fileName: string) => void;
  existingFile?: { url: string; name: string };
  onRemove?: () => void;
}

export const PdfUpload: React.FC<PdfUploadProps> = ({
  onUpload,
  existingFile,
  onRemove
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast.error("Invalid File Type", { description: "Please select a PDF file only." });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File Too Large", { description: "Please select a file smaller than 10MB." });
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      // Create unique file path using user ID and timestamp
      const fileExt = 'pdf';
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('quote-attachments')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('quote-attachments')
        .getPublicUrl(filePath);

      onUpload(publicUrl, file.name);
      
      toast.success("File Uploaded", { description: "PDF has been attached successfully." });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Upload Failed", { description: "Failed to upload PDF. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemoveFile = () => {
    if (onRemove) {
      onRemove();
    }
  };

  if (existingFile) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <File className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{existingFile.name}</p>
              <p className="text-sm text-muted-foreground">PDF attachment</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(existingFile.url, '_blank')}
            >
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
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
          <p className="text-sm font-medium">Attach Quote PDF</p>
          <p className="text-xs text-muted-foreground">
            Drag and drop a PDF file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum size: 10MB
          </p>
        </div>
        
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Choose File'}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>
    </Card>
  );
};