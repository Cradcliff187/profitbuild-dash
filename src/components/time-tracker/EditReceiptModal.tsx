import { useState, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PayeeSelector } from '@/components/PayeeSelector';
import { NativeSelect } from '@/components/ui/native-select';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
}

interface ReceiptData {
  id: string;
  image_url: string;
  amount: number;
  payee_id: string | null;
  project_id: string | null;
  project_number?: string;
  description: string | null;
  captured_at: string;
}

interface EditReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receipt: ReceiptData;
}

export function EditReceiptModal({ open, onClose, onSuccess, receipt }: EditReceiptModalProps) {
  const isMobile = useIsMobile();
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedPayeeId, setSelectedPayeeId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [systemProjectId, setSystemProjectId] = useState<string>('');
  const [photoChanged, setPhotoChanged] = useState(false);

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  useEffect(() => {
    if (open && receipt) {
      setCapturedPhoto(receipt.image_url);
      setAmount(receipt.amount.toString());
      setSelectedPayeeId(receipt.payee_id || '');
      setSelectedProjectId(receipt.project_id || '');
      setDescription(receipt.description || '');
      setPhotoChanged(false);
    }
  }, [open, receipt]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_number, project_name')
      .order('project_number', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      return;
    }

    const systemProject = data.find(p => p.project_number === 'SYS-000');
    if (systemProject) {
      setSystemProjectId(systemProject.id);
    }

    const filteredProjects = data.filter(p => !['SYS-000', '000-UNASSIGNED'].includes(p.project_number));
    setProjects(filteredProjects);
  };

  const capturePhoto = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setCapturedPhoto(reader.result as string);
            setPhotoChanged(true);
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
    }
  };

  const handleSave = async () => {
    if (!capturedPhoto) {
      toast.error('Photo is required');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Valid amount is required');
      return;
    }

    if (!selectedPayeeId) {
      toast.error('Payee is required');
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl = receipt.image_url;

      // Only upload new image if photo was changed
      if (photoChanged && capturedPhoto.startsWith('data:')) {
        const base64Data = capturedPhoto.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('time-tracker-documents')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: signedUrlData } = await supabase.storage
          .from('time-tracker-documents')
          .createSignedUrl(fileName, 31536000);

        if (signedUrlData?.signedUrl) {
          imageUrl = signedUrlData.signedUrl;
        }
      }

      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          image_url: imageUrl,
          amount: parseFloat(amount),
          payee_id: selectedPayeeId,
          project_id: selectedProjectId || systemProjectId,
          description: description || null,
        })
        .eq('id', receipt.id);

      if (updateError) throw updateError;

      toast.success('Receipt updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating receipt:', error);
      toast.error('Failed to update receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setCapturedPhoto('');
    setSelectedProjectId('');
    setSelectedPayeeId('');
    setDescription('');
    setAmount('');
    setPhotoChanged(false);
    onClose();
  };

  const ModalContent = () => (
    <div className={cn("space-y-4", isMobile && "space-y-6")}>
      {/* Photo Section */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Receipt Photo</Label>
        {capturedPhoto ? (
          <div className="relative">
            <img 
              src={capturedPhoto} 
              alt="Receipt" 
              className={cn(
                "w-full object-cover rounded-md",
                isMobile ? "h-60" : "h-48"
              )} 
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => {
                setCapturedPhoto('');
                setPhotoChanged(true);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-md p-8 text-center">
            <p className="text-sm text-muted-foreground">No photo</p>
          </div>
        )}
        <Button 
          onClick={capturePhoto} 
          variant="outline" 
          className={cn("w-full", isMobile && "h-12 text-base")}
          type="button"
        >
          <Camera className="w-4 h-4 mr-2" />
          Replace Photo
        </Button>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={cn(isMobile && "h-12 text-base")}
        />
      </div>

      {/* Payee - now native on mobile! */}
      <PayeeSelector
        value={selectedPayeeId}
        onValueChange={setSelectedPayeeId}
        filterInternal={false}
        placeholder="Select payee..."
        showLabel={false}
      />

      {/* Project */}
      <div className="space-y-2">
        <Label htmlFor="project" className="text-sm font-medium">Project (Optional)</Label>
        <NativeSelect
          id="project"
          value={selectedProjectId || "unassigned"}
          onValueChange={(value) => setSelectedProjectId(value === "unassigned" ? "" : value)}
          className={cn("w-full", isMobile ? "h-12 text-base" : "h-10")}
        >
          <option value="unassigned">Unassigned</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.project_number} - {project.project_name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">Notes</Label>
        <Textarea
          id="description"
          placeholder="Optional notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={cn(isMobile && "text-base")}
        />
      </div>

      {/* Actions */}
      <div className={cn(
        "flex gap-2 pt-2",
        isMobile && "flex-col"
      )}>
        <Button 
          variant="outline" 
          onClick={handleClose} 
          className={cn("flex-1", isMobile && "h-12 text-base")}
          disabled={isUploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className={cn("flex-1", isMobile && "h-12 text-base")}
          disabled={!capturedPhoto || !amount || !selectedPayeeId || isUploading}
        >
          {isUploading ? 'Updating...' : 'Update Receipt'}
        </Button>
      </div>
    </div>
  );

  return isMobile ? (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90dvh] overflow-y-auto p-6 no-horizontal-scroll"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg">Edit Receipt</SheetTitle>
        </SheetHeader>
        <ModalContent />
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md no-horizontal-scroll"
      >
        <DialogHeader>
          <DialogTitle>Edit Receipt</DialogTitle>
        </DialogHeader>
        <ModalContent />
      </DialogContent>
    </Dialog>
  );
}
