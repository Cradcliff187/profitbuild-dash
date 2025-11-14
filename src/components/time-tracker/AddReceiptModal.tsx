import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Camera as CameraIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PayeeSelector } from '@/components/PayeeSelector';
import { PayeeType } from '@/types/payee';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { isIOSPWA } from '@/utils/platform';
import { useCameraCapture } from '@/hooks/useCameraCapture';

const UNASSIGNED_RECEIPTS_PROJECT_NUMBER = 'SYS-000';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
}

interface AddReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (receipt: { id: string }) => void;
  initialProjectId?: string;
}

export const AddReceiptModal: React.FC<AddReceiptModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialProjectId
}) => {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { capturePhoto: captureCameraPhoto, isCapturing } = useCameraCapture();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | undefined>();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [systemProjectId, setSystemProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadProjects();
      // Pre-populate project if provided
      if (initialProjectId) {
        setSelectedProjectId(initialProjectId);
      }
    }
  }, [open, initialProjectId]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_number, project_name')
        .order('project_name');

      if (error) throw error;
      
      // Find the SYS-000 project ID for fallback
      const sysProject = data?.find(p => p.project_number === UNASSIGNED_RECEIPTS_PROJECT_NUMBER);
      if (sysProject) {
        setSystemProjectId(sysProject.id);
      }
      
      // Filter out system projects from dropdown
      setProjects(data?.filter(p => 
        !['SYS-000', '000-UNASSIGNED'].includes(p.project_number)
      ) || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const capturePhoto = async () => {
    // Add iOS PWA guidance
    if (isIOSPWA()) {
      toast.info("iOS Camera Tip", {
        description: "Your camera will open, or select 'Take Photo or Video' from the menu if you see the photo library",
        duration: 5000,
      });
    }
    
    const result = await captureCameraPhoto();
    if (result?.dataUrl) {
      setCapturedPhoto(result.dataUrl);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      event.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Please choose a file smaller than 15MB');
      event.target.value = '';
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to read file:', error);
      toast.error('Failed to read selected file');
    }
  };

  const handleSave = async () => {
    if (!capturedPhoto) {
      toast.error('Please capture a photo first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedPayeeId) {
      toast.error('Please select a payee');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Convert data URL to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();
      
      // Upload to storage
      const timestamp = Date.now();
      const filename = `${timestamp}_receipt.jpg`;
      const storagePath = `${user.id}/receipts/${filename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('time-tracker-documents')
        .upload(storagePath, blob);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('time-tracker-documents')
        .createSignedUrl(uploadData.path, 31536000); // 1 year expiry

      if (!urlData?.signedUrl) throw new Error('Failed to get signed URL');

      // Create receipt record (NOT an expense)
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          image_url: urlData.signedUrl,
          amount: parseFloat(amount),
          payee_id: selectedPayeeId,
          project_id: selectedProjectId || systemProjectId,
          description: description || null,
          captured_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // 🆕 Send email notification
      console.log('📧 Invoking send-receipt-notification for receipt ID:', receiptData.id);
      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-receipt-notification', {
        body: { id: receiptData.id }
      });

      if (emailError) {
        console.error('❌ Email notification failed:', emailError);
        toast.warning('Receipt saved, but email notification failed. Use "Resend" from the receipts list.');
      } else {
        console.log('✅ Email notification sent. Response:', emailResponse);
        toast.success('Receipt saved and notification sent!');
      }
      onSuccess?.(receiptData);
      handleClose();
    } catch (error) {
      console.error('Failed to save receipt:', error);
      toast.error('Failed to save receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setCapturedPhoto(null);
    setSelectedProjectId(undefined);
    setSelectedPayeeId(undefined);
    setDescription('');
      setAmount('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    onClose();
  };

  const ModalContent = (
    <div className={isMobile ? "space-y-6" : "space-y-4"}>
      {/* Camera Capture / Photo Preview */}
        <div className="space-y-3">
          {!capturedPhoto ? (
            <>
              <div className={isMobile ? "grid gap-2" : "flex flex-col gap-2"}>
                <Button
                  onClick={capturePhoto}
                  variant="outline"
                  className={isMobile ? "w-full h-24 border-2 border-dashed" : "w-full h-32 border-2 border-dashed"}
                  disabled={isCapturing}
                >
                  <div className="flex flex-col items-center gap-2">
                    <CameraIcon className={isMobile ? "w-10 h-10 text-muted-foreground" : "w-12 h-12 text-muted-foreground"} />
                    <span className="font-medium">Take Photo</span>
                  </div>
                </Button>
                <Button
                  onClick={openFilePicker}
                  variant="outline"
                  className={isMobile ? "w-full h-16" : "w-full h-12"}
                >
                  Choose from Library
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                On iPhone you&apos;ll see the native menu with options like Take Photo, Photo Library, or Browse.
              </p>
            </>
          ) : (
            <div className="relative">
              <img
                src={capturedPhoto}
                alt="Captured receipt"
                className={isMobile ? "w-full h-60 object-cover rounded-lg" : "w-full h-48 object-cover rounded-lg"}
              />
              <Button
                onClick={() => {
                  setCapturedPhoto(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                variant="destructive"
                size="icon"
                className={isMobile ? "absolute top-2 right-2 h-12 w-12" : "absolute top-2 right-2"}
              >
                <X className={isMobile ? "w-6 h-6" : "w-4 h-4"} />
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>

      {/* Amount (Required) */}
      <div className="space-y-2">
        <Label htmlFor="amount" className={isMobile ? "text-sm font-medium" : ""}>Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
          className={isMobile ? "h-12" : ""}
          style={{ fontSize: isMobile ? '16px' : undefined }}
        />
      </div>

      {/* Payee (Required) */}
      <div className="space-y-2">
        <PayeeSelector
          value={selectedPayeeId || ''}
          onValueChange={(payeeId) => setSelectedPayeeId(payeeId)}
          filterInternal={false}
          label="Vendor / Supplier"
          placeholder="Select a vendor or supplier"
          required
          defaultPayeeType={PayeeType.MATERIAL_SUPPLIER}
          defaultIsInternal={false}
        />
      </div>

      {/* Project Assignment (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="project" className={isMobile ? "text-sm font-medium text-muted-foreground" : "text-sm text-muted-foreground"}>
          Assign to Project (Optional)
        </Label>
        <NativeSelect
          id="project"
          value={selectedProjectId || "unassigned"}
          onValueChange={(value) => setSelectedProjectId(value === "unassigned" ? undefined : value)}
          className={cn(isMobile ? "h-12 text-base" : "h-10")}
        >
          <option value="unassigned">Unassigned</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.project_number} - {project.project_name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Description (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="description" className={isMobile ? "text-sm font-medium text-muted-foreground" : "text-sm text-muted-foreground"}>
          Notes (Optional)
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add notes about this receipt..."
          rows={isMobile ? 3 : 2}
          className={isMobile ? "text-base" : ""}
        />
      </div>

      {/* Action Buttons */}
      <div className={isMobile ? "flex flex-col gap-3 pt-2" : "flex gap-2"}>
        <Button
          onClick={handleClose}
          variant="outline"
          className={isMobile ? "w-full h-12" : "flex-1"}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className={isMobile ? "w-full h-12" : "flex-1"}
          disabled={!capturedPhoto || !amount || !selectedPayeeId || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Receipt'
          )}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent 
          side="bottom" 
          className="h-[90dvh] overflow-y-auto p-6 no-horizontal-scroll"
        >
          <SheetHeader>
            <SheetTitle>Add Receipt</SheetTitle>
          </SheetHeader>
          {ModalContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-md no-horizontal-scroll"
      >
        <DialogHeader>
          <DialogTitle>Add Receipt</DialogTitle>
        </DialogHeader>
        {ModalContent}
      </DialogContent>
    </Dialog>
  );
};
