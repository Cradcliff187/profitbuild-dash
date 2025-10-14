import React, { useState } from 'react';
import { Camera as CameraIcon, X, Loader2 } from 'lucide-react';
import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const captureReceipt = async () => {
    if (!user) return;

    setUploading(true);
    try {
      // Capture photo
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        promptLabelHeader: 'Receipt',
        promptLabelPhoto: 'From Photos',
        promptLabelPicture: 'Take Photo'
      });

      if (!photo.dataUrl) {
        onSkip();
        return;
      }

      // Convert to blob
      const response = await fetch(photo.dataUrl);
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
      toast({
        title: 'Receipt Capture Failed',
        description: 'Time entry will be saved without receipt',
        variant: 'destructive'
      });
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
            Capture a receipt or timesheet document for this time entry
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
            {uploading ? 'Uploading...' : 'Take Photo'}
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
