import React, { useState, useEffect } from 'react';
import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera as CameraIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PayeeSelector } from '@/components/PayeeSelector';
import { useIsMobile } from '@/hooks/use-mobile';

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
}

export const AddReceiptModal: React.FC<AddReceiptModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const isMobile = useIsMobile();
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
    }
  }, [open]);

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
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      setCapturedPhoto(photo.dataUrl || null);
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
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

      toast.success('Receipt saved successfully');
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
    onClose();
  };

  const ModalContent = (
    <div className={isMobile ? "space-y-6" : "space-y-4"}>
      {/* Camera Capture / Photo Preview */}
      <div className="space-y-2">
        {!capturedPhoto ? (
          <Button
            onClick={capturePhoto}
            variant="outline"
            className={isMobile ? "w-full h-60 border-2 border-dashed" : "w-full h-48 border-2 border-dashed"}
          >
            <div className="flex flex-col items-center gap-2">
              <CameraIcon className={isMobile ? "w-16 h-16 text-muted-foreground" : "w-12 h-12 text-muted-foreground"} />
              <span className={isMobile ? "text-base font-medium" : "text-sm font-medium"}>Take Photo</span>
            </div>
          </Button>
        ) : (
          <div className="relative">
            <img
              src={capturedPhoto}
              alt="Captured receipt"
              className={isMobile ? "w-full h-60 object-cover rounded-lg" : "w-full h-48 object-cover rounded-lg"}
            />
            <Button
              onClick={() => setCapturedPhoto(null)}
              variant="destructive"
              size="icon"
              className={isMobile ? "absolute top-2 right-2 h-12 w-12" : "absolute top-2 right-2"}
            >
              <X className={isMobile ? "w-6 h-6" : "w-4 h-4"} />
            </Button>
          </div>
        )}
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
          className={isMobile ? "h-12 text-base" : ""}
        />
      </div>

      {/* Payee (Required) */}
      <div className="space-y-2">
        <PayeeSelector
          value={selectedPayeeId}
          onValueChange={setSelectedPayeeId}
          filterInternal={false}
          filterLabor={false}
          label="Vendor / Supplier"
          placeholder="Select a vendor or supplier"
          required
        />
      </div>

      {/* Project Assignment (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="project" className={isMobile ? "text-sm font-medium text-muted-foreground" : "text-sm text-muted-foreground"}>
          Assign to Project (Optional)
        </Label>
        {isMobile ? (
          <select
            id="project"
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_number} - {project.project_name}
              </option>
            ))}
          </select>
        ) : (
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger id="project">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_number} - {project.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
          className="h-[90vh] overflow-y-auto p-6 no-horizontal-scroll"
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
