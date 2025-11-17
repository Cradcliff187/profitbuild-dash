import React, { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isIOSPWA } from '@/utils/platform';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface BidMediaBulkUploadProps {
  bidId: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function BidMediaBulkUpload({ bidId, onUploadComplete }: BidMediaBulkUploadProps) {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { upload, isUploading } = useBidMediaUpload();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const openFilePicker = () => {
    if (isIOSPWA()) {
      toast.info('Device upload tip', {
        description: "Select Take Photo or Video, Photo Library, or Browse from your iPhone's sheet.",
        duration: 4000,
      });
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles: UploadFile[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Check file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        errors.push(`${file.name}: Only images and videos are supported`);
        return;
      }

      // Check file size (150MB for videos, 15MB for images)
      const maxSize = isVideo ? 150 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max ${maxSize / 1024 / 1024}MB)`);
        return;
      }

      validFiles.push({
        file,
        status: 'pending',
      });
    });

    // Show errors for invalid files
    if (errors.length > 0) {
      errors.forEach((error) => {
        toast.error(error);
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      // Auto-start upload if files are selected
      handleUpload(validFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (filesToUpload: UploadFile[] = selectedFiles) => {
    if (filesToUpload.length === 0) return;

    setIsProcessing(true);
    setOverallProgress(0);

    let successCount = 0;
    let errorCount = 0;

    // Process files sequentially
    for (let i = 0; i < filesToUpload.length; i++) {
      const uploadFile = filesToUpload[i];
      
      // Update status to uploading
      setSelectedFiles((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'uploading' };
        return updated;
      });

      setOverallProgress(((i + 0.5) / filesToUpload.length) * 100);

      try {
        // Determine upload source based on file type
        const uploadSource = uploadFile.file.type.startsWith('image/') ? 'gallery' : 'web';

        const result = await upload({
          bid_id: bidId,
          file: uploadFile.file,
          upload_source: uploadSource,
        });

        if (result) {
          // Update status to success
          setSelectedFiles((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'success' };
            return updated;
          });
          successCount++;
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        // Update status to error
        setSelectedFiles((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'error', error: errorMessage };
          return updated;
        });
        errorCount++;
        toast.error(`Failed to upload ${uploadFile.file.name}`, {
          description: errorMessage,
        });
      }

      setOverallProgress(((i + 1) / filesToUpload.length) * 100);
    }

    // Invalidate queries to refresh gallery
    queryClient.invalidateQueries({ queryKey: ['bid-media', bidId] });

    // Show summary
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
    }

    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? 's' : ''}`);
    }

    // Clear selected files after a delay
    setTimeout(() => {
      setSelectedFiles([]);
      setOverallProgress(0);
    }, 2000);

    setIsProcessing(false);
    onUploadComplete?.();
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setOverallProgress(0);
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={openFilePicker}
        variant="outline"
        size="sm"
        disabled={isProcessing || isUploading}
        className={cn("w-full sm:w-auto", isMobile && "h-11 text-base")}
      >
        {isProcessing || isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </>
        )}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={isProcessing || isUploading}
      />

      {/* Upload Progress */}
      {(isProcessing || isUploading) && overallProgress > 0 && (
        <div className="space-y-2">
          <Progress value={overallProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Uploading {Math.round(overallProgress)}%
          </p>
        </div>
      )}

      {/* File List Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-8 text-xs"
            >
              Clear All
            </Button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {selectedFiles.map((uploadFile, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md border text-sm",
                  uploadFile.status === 'success' && "bg-success/10 border-success/20",
                  uploadFile.status === 'error' && "bg-destructive/10 border-destructive/20",
                  uploadFile.status === 'uploading' && "bg-muted",
                  uploadFile.status === 'pending' && "bg-muted/50"
                )}
              >
                {uploadFile.status === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                )}
                {uploadFile.status === 'error' && (
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                )}
                {uploadFile.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                )}
                {uploadFile.status === 'pending' && (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{uploadFile.file.name}</span>
                {uploadFile.status !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

