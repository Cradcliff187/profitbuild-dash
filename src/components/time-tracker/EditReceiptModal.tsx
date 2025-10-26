import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TimeEntryDialog } from './TimeEntryDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Camera } from 'lucide-react';
import { isIOSPWA } from '@/utils/platform';

interface Project {
  id: string;
  project_name: string;
  project_number: string;
}

interface Payee {
  id: string;
  payee_name: string;
  payee_type: string;
}

interface ReceiptData {
  id: string;
  image_url: string;
  amount: number;
  payee_id: string | null;
  project_id: string | null;
  description: string | null;
}

interface EditReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  receipt: ReceiptData | null;
}

export const EditReceiptModal = ({ open, onClose, onSuccess, receipt }: EditReceiptModalProps) => {
  const isMobile = useIsMobile();
  
  // Form state
  const [amount, setAmount] = useState('0.00');
  const [payeeId, setPayeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [photoChanged, setPhotoChanged] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [systemProjectId, setSystemProjectId] = useState('');

  // Load projects and payees
  useEffect(() => {
    if (open) {
      loadProjects();
      loadPayees();
    }
  }, [open]);

  // Populate form when receipt changes
  useEffect(() => {
    if (open && receipt) {
      setAmount(receipt.amount?.toString() || '0.00');
      setPayeeId(receipt.payee_id || '');
      setProjectId(receipt.project_id || '');
      setDescription(receipt.description || '');
      setCapturedPhoto('');
      setPhotoChanged(false);
      
      // Load signed URL for existing photo
      if (receipt.image_url) {
        loadSignedUrl(receipt.image_url);
      }
    }
  }, [open, receipt]);

  const loadProjects = async () => {
    try {
      // Find system project for fallback
      const { data: systemProjects } = await supabase
        .from('projects')
        .select('id')
        .in('project_number', ['SYS-000', '000-UNASSIGNED'])
        .limit(1)
        .single();
      
      if (systemProjects) {
        setSystemProjectId(systemProjects.id);
      }

      // Load active projects
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_name, project_number')
        .in('status', ['approved', 'in_progress'])
        .not('project_number', 'in', '("000-UNASSIGNED","SYS-000")')
        .order('project_name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadPayees = async () => {
    try {
      const { data, error } = await supabase
        .from('payees')
        .select('id, payee_name, payee_type')
        .eq('is_active', true)
        .order('payee_name');

      if (error) throw error;
      setPayees(data || []);
    } catch (error) {
      console.error('Error loading payees:', error);
      toast.error('Failed to load payees');
    }
  };

  const loadSignedUrl = async (imageUrl: string) => {
    try {
      const path = imageUrl.split('/').slice(-2).join('/');
      const { data, error } = await supabase.storage
        .from('time-tracker-documents')
        .createSignedUrl(path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        setCapturedPhoto(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading signed URL:', error);
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
    
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Resize and compress image
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (event) => {
          img.src = event.target?.result as string;
        };

        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const maxWidth = 1920;
          const maxHeight = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            async (blob) => {
              if (!blob) return;
              const dataUrl = URL.createObjectURL(blob);
              setCapturedPhoto(dataUrl);
              setPhotoChanged(true);
            },
            'image/jpeg',
            0.8
          );
        };

        reader.readAsDataURL(file);
      };

      input.click();
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
    }
  };

  const handleSave = async () => {
    if (!receipt) return;

    // Validation
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!payeeId) {
      toast.error('Please select a payee');
      return;
    }

    setIsUploading(true);

    try {
      let finalImageUrl = receipt.image_url;

      // Upload new photo if changed
      if (photoChanged && capturedPhoto) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const blob = await fetch(capturedPhoto).then(r => r.blob());
        const fileName = `receipt_${Date.now()}.jpg`;
        const filePath = `${user.id}/receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('time-tracker-documents')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Create signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('time-tracker-documents')
          .createSignedUrl(filePath, 31536000); // 1 year

        if (signedUrlError) throw signedUrlError;
        finalImageUrl = signedUrlData.signedUrl;
      }

      // Use system project if no project selected
      const finalProjectId = projectId || systemProjectId;

      // Update receipt
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          image_url: finalImageUrl,
          amount: parsedAmount,
          payee_id: payeeId,
          project_id: finalProjectId,
          description: description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', receipt.id);

      if (updateError) throw updateError;

      toast.success('Receipt updated successfully');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error updating receipt:', error);
      toast.error('Failed to update receipt');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setAmount('0.00');
    setPayeeId('');
    setProjectId('');
    setDescription('');
    setCapturedPhoto('');
    setPhotoChanged(false);
    setIsUploading(false);
    onClose();
  };

  const groupedPayees = payees.reduce((acc, payee) => {
    const type = payee.payee_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(payee);
    return acc;
  }, {} as Record<string, Payee[]>);

  const payeeTypeLabels: Record<string, string> = {
    subcontractor: 'Subcontractors',
    supplier: 'Suppliers',
    vendor: 'Vendors',
    internal: 'Internal',
    other: 'Other'
  };

  if (!receipt) {
    return (
      <TimeEntryDialog
        open={open}
        onOpenChange={(newOpen) => { if (!newOpen) handleClose(); }}
        title="Edit Receipt"
      >
        <div className="py-4 text-center text-muted-foreground">Loading receipt...</div>
      </TimeEntryDialog>
    );
  }

  return (
    <TimeEntryDialog
      open={open}
      onOpenChange={(newOpen) => { if (!newOpen) handleClose(); }}
      title="Edit Receipt"
      description="Update receipt details"
    >
      <div className="space-y-4">
        {/* Receipt Photo */}
        <div className="space-y-2">
          <Label>Receipt Photo</Label>
          {capturedPhoto && (
            <div className="relative rounded-lg overflow-hidden border">
              <img 
                src={capturedPhoto} 
                alt="Receipt" 
                className="w-full h-auto"
              />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={capturePhoto}
            disabled={isUploading}
          >
            <Camera className="w-4 h-4 mr-2" />
            Replace Photo
          </Button>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(isMobile && "h-10")}
            style={{ fontSize: isMobile ? '16px' : undefined }}
            disabled={isUploading}
          />
        </div>

        {/* Payee */}
        <div className="space-y-2">
          <Label htmlFor="payee">Payee</Label>
          <NativeSelect
            id="payee"
            value={payeeId}
            onValueChange={setPayeeId}
            className={cn(isMobile && "h-10 text-base")}
            disabled={isUploading}
          >
            <option value="" disabled>Select a payee...</option>
            {Object.entries(groupedPayees).map(([type, payeesInGroup]) => (
              <optgroup key={type} label={payeeTypeLabels[type] || type}>
                {payeesInGroup.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.payee_name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>

        {/* Project */}
        <div className="space-y-2">
          <Label htmlFor="project">Project</Label>
          <NativeSelect
            id="project"
            value={projectId}
            onValueChange={setProjectId}
            className={cn(isMobile && "h-10 text-base")}
            disabled={isUploading}
          >
            <option value="">Select a project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_number} - {project.project_name}
              </option>
            ))}
          </NativeSelect>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(isMobile && "text-base")}
            style={{ fontSize: isMobile ? '16px' : undefined }}
            disabled={isUploading}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? 'Updating...' : 'Update Receipt'}
          </Button>
        </div>
      </div>
    </TimeEntryDialog>
  );
};
