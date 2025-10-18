import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { PayeeSelector } from '@/components/PayeeSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { Camera } from 'lucide-react';
import { useSelectInteractionGuard } from './hooks/useSelectInteractionGuard';

const formSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  payee_id: z.string().min(1, 'Payee is required'),
  project_id: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
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
  receipt: ReceiptData;
}

export function EditReceiptModal({ open, onClose, onSuccess, receipt }: EditReceiptModalProps) {
  const isMobile = useIsMobile();
  const { isInteracting, startInteraction, endInteraction } = useSelectInteractionGuard();
  
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [photoChanged, setPhotoChanged] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [systemProjectId, setSystemProjectId] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: receipt.amount,
      payee_id: receipt.payee_id || '',
      project_id: receipt.project_id || '',
      description: receipt.description || '',
    },
  });

  const watchedPayeeId = watch('payee_id');

  useEffect(() => {
    if (open) {
      loadProjects();
      loadPayees();
      setCapturedPhoto(receipt.image_url);
      setPhotoChanged(false);
      reset({
        amount: receipt.amount,
        payee_id: receipt.payee_id || '',
        project_id: receipt.project_id || '',
        description: receipt.description || '',
      });
    }
  }, [open, receipt, reset]);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_number, project_name, client_name')
      .order('project_number', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      return;
    }

    const systemProject = data?.find(
      p => p.project_number === 'SYS-000' || p.project_number === '000-UNASSIGNED'
    );
    if (systemProject) {
      setSystemProjectId(systemProject.id);
    }

    const filteredProjects = data?.filter(
      p => p.project_number !== 'SYS-000' && p.project_number !== '000-UNASSIGNED'
    ) || [];
    
    setProjects(filteredProjects);
  };

  const loadPayees = async () => {
    const { data, error } = await supabase
      .from('payees')
      .select('id, payee_name, payee_type')
      .eq('is_active', true)
      .order('payee_name');

    if (error) {
      console.error('Error loading payees:', error);
      return;
    }

    setPayees(data || []);
  };

  const capturePhoto = () => {
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
  };

  const onSubmit = async (data: FormData) => {
    if (data.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (!data.payee_id) {
      toast.error('Please select a payee');
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl = receipt.image_url;

      if (photoChanged && capturedPhoto) {
        const base64Data = capturedPhoto.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        const fileName = `${Date.now()}_receipt.jpg`;
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not authenticated');

        const filePath = `${user.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('time-tracker-documents')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from('time-tracker-documents')
          .createSignedUrl(filePath, 31536000);

        if (urlData?.signedUrl) {
          imageUrl = urlData.signedUrl;
        }
      }

      const projectId = data.project_id || systemProjectId;

      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          image_url: imageUrl,
          amount: data.amount,
          payee_id: data.payee_id,
          project_id: projectId,
          description: data.description || null,
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
    reset();
    setCapturedPhoto('');
    setPhotoChanged(false);
    onClose();
  };

  const handleModalChange = (newOpen: boolean) => {
    if (!newOpen && !isInteracting) {
      handleClose();
    }
  };

  const groupedPayees = payees.reduce((acc, payee) => {
    const type = payee.payee_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(payee);
    return acc;
  }, {} as Record<string, Payee[]>);

  const payeeTypeLabels: Record<string, string> = {
    subcontractor: 'Subcontractors',
    material_supplier: 'Material Suppliers',
    equipment_rental: 'Equipment Rental',
    internal_labor: 'Internal Labor',
    management: 'Management',
    permit_authority: 'Permit Authority',
    other: 'Other',
  };

  const ModalContent = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Photo Section */}
      <div className="space-y-2">
        <Label>Receipt Photo</Label>
        {capturedPhoto && (
          <div className="relative w-full h-48 rounded-md overflow-hidden bg-muted">
            <img
              src={capturedPhoto}
              alt="Receipt"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={capturePhoto}
          className="w-full"
        >
          <Camera className="w-4 h-4 mr-2" />
          Replace Photo
        </Button>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      {/* Payee - Mobile native select, Desktop PayeeSelector */}
      <div className="space-y-2">
        <Label htmlFor="payee">Payee *</Label>
        {isMobile ? (
          <div
            onTouchStart={startInteraction}
            onTouchEnd={endInteraction}
            onFocus={startInteraction}
            onBlur={endInteraction}
          >
            <select
              id="payee"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={watchedPayeeId}
              onChange={(e) => setValue('payee_id', e.target.value)}
            >
              <option value="">Select a payee...</option>
              {Object.entries(groupedPayees).map(([type, payeesInGroup]) => (
                <optgroup key={type} label={payeeTypeLabels[type] || type}>
                  {payeesInGroup.map((payee) => (
                    <option key={payee.id} value={payee.id}>
                      {payee.payee_name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ) : (
          <PayeeSelector
            value={watchedPayeeId}
            onValueChange={(value) => setValue('payee_id', value)}
            filterInternal={false}
          />
        )}
        {errors.payee_id && (
          <p className="text-sm text-destructive">{errors.payee_id.message}</p>
        )}
      </div>

      {/* Project */}
      <div className="space-y-2">
        <Label htmlFor="project">Project</Label>
        <div
          onTouchStart={startInteraction}
          onTouchEnd={endInteraction}
          onFocus={startInteraction}
          onBlur={endInteraction}
        >
          <NativeSelect
            id="project"
            {...register('project_id')}
          >
            <option value="">Select a project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_number} - {project.project_name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Notes</Label>
        <Textarea
          id="description"
          placeholder="Add notes..."
          rows={3}
          {...register('description')}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
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
          type="submit"
          disabled={isUploading}
          className="flex-1"
        >
          {isUploading ? 'Updating...' : 'Update Receipt'}
        </Button>
      </div>
    </form>
  );

  return isMobile ? (
    <Sheet open={open} onOpenChange={handleModalChange}>
      <SheetContent
        side="bottom"
        className="h-[90dvh] overflow-y-auto p-6"
      >
        <SheetHeader>
          <SheetTitle>Edit Receipt</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ModalContent />
        </div>
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={handleModalChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Receipt</DialogTitle>
        </DialogHeader>
        <ModalContent />
      </DialogContent>
    </Dialog>
  );
}
