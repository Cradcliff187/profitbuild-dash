import React, { useState } from 'react';
import { Camera as CameraIcon, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { isIOSPWA } from '@/utils/platform';

interface ReceiptCaptureProps {
  projectId: string;
  onCapture: (url: string) => void;
  onSkip: () => void;
}

export const ReceiptCapture: React.FC<ReceiptCaptureProps> = ({ 
  projectId, 
  onCapture,
  onSkip
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const captureReceipt = async () => {
    if (!user) return;

    setUploading(true);

    // Add iOS PWA guidance
    if (isIOSPWA()) {
      toast.info("Device upload tip", { description: "Select Take Photo or Video, Photo Library, or Browse from your iPhone's sheet.", duration: 4000 });
    }

    try {
      // Capture photo using web file input (iOS PWA compatible pattern)
      const dataUrl = await new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        // Removed capture="environment" to allow photo library and file browsing
        input.style.display = 'none';
        
        const handleChange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
              input.remove();
            };
            reader.readAsDataURL(file);
          } else {
            resolve(null);
            input.remove();
          }
        };
        
        const handleCancel = () => {
          resolve(null);
          input.remove();
        };
        
        input.addEventListener('change', handleChange);
        input.addEventListener('cancel', handleCancel);
        
        // Append to DOM before clicking (required for iOS PWA)
        document.body.appendChild(input);
        input.click();
      });

      if (!dataUrl) {
        onSkip();
        return;
      }

      // Convert to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Generate storage path
      const timestamp = Date.now();
      const filename = `${timestamp}_receipt.jpg`;
      const storagePath = `${user.id}/receipts/${projectId}/${filename}`;

      // Upload to time-tracker-documents bucket
      const { data, error } = await supabase.storage
        .from('time-tracker-documents')
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get signed URL (1 year expiry)
      const { data: urlData } = await supabase.storage
        .from('time-tracker-documents')
        .createSignedUrl(data.path, 31536000);

      onCapture(urlData?.signedUrl || '');
      
    } catch (error) {
      console.error('Receipt capture failed:', error);
      toast.error('Receipt Capture Failed', { description: 'Time entry will be saved without receipt' });
      onSkip();
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Receipt (Optional)</DialogTitle>
          <DialogDescription>
            Upload a receipt from camera, photo library, or files
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <Button
            onClick={captureReceipt}
            disabled={uploading}
            className="w-full h-24 text-lg"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <CameraIcon className="w-6 h-6 mr-2" />
            )}
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
          
          <Button 
            onClick={onSkip} 
            variant="outline"
            disabled={uploading}
            className="w-full"
          >
            Skip - No Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
