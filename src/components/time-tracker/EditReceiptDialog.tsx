import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { TimeEntryDialog } from './TimeEntryDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRoles } from '@/contexts/RoleContext';
import { cn } from '@/lib/utils';
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

interface Receipt {
  id: string;
  image_url: string;
  amount: number;
  payee_id: string | null;
  project_id: string | null;
  description?: string | null;
  captured_at?: string;
  approval_status?: string;
  rejection_reason?: string;
  user_id?: string;
  date?: string;
}

interface EditReceiptDialogProps {
  receipt: Receipt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const EditReceiptDialog = ({ receipt, open, onOpenChange, onSaved }: EditReceiptDialogProps) => {
  const isMobile = useIsMobile();
  const { isAdmin, isManager } = useRoles();
  const [amount, setAmount] = useState('0.00');
  const [payeeId, setPayeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [photoChanged, setPhotoChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  
  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [systemProjectId, setSystemProjectId] = useState('');

  const isOwner = receipt?.user_id === currentUserId;
  const canEdit = receipt?.approval_status !== 'approved' && (isOwner || isAdmin || isManager);
  const canDelete = receipt?.approval_status !== 'approved' && (isOwner || isAdmin || isManager);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (open) {
      loadProjects();
      loadPayees();
    }
  }, [open]);

  useEffect(() => {
    if (open && receipt) {
      populateForm();
    }
  }, [open, receipt]);

  const populateForm = () => {
    if (!receipt) return;

    setAmount(receipt.amount?.toString() || '0.00');
    setPayeeId(receipt.payee_id || '');
    setProjectId(receipt.project_id || '');
    setDescription(receipt.description || '');
    setDate(receipt.captured_at ? format(new Date(receipt.captured_at), 'yyyy-MM-dd') : '');
    setCapturedPhoto('');
    setPhotoChanged(false);
    
    if (receipt.image_url) {
      loadSignedUrl(receipt.image_url);
    }
  };

  const loadProjects = async () => {
    try {
      const { data: systemProjects } = await supabase
        .from('projects')
        .select('id')
        .in('project_number', ['SYS-000', '000-UNASSIGNED'])
        .limit(1)
        .single();
      
      if (systemProjects) {
        setSystemProjectId(systemProjects.id);
      }

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

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (event) => {
          img.src = event.target?.result as string;
        };

        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const maxSize = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
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
    if (!receipt || !canEdit) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!payeeId) {
      toast.error('Please select a payee');
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = receipt.image_url;

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
        finalImageUrl = filePath;
      }

      const finalProjectId = projectId || systemProjectId;

      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          image_url: finalImageUrl,
          amount: parsedAmount,
          payee_id: payeeId,
          project_id: finalProjectId,
          description: description || null,
          captured_at: date ? new Date(date).toISOString() : receipt.captured_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', receipt.id);

      if (updateError) throw updateError;

      toast.success('Receipt updated');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating receipt:', error);
      toast.error('Failed to update receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!receipt || !canDelete) return;

    if (!confirm('Are you sure you want to delete this receipt?')) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('receipts').delete().eq('id', receipt.id);
      
      if (error) throw error;
      
      toast.success('Receipt deleted');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Failed to delete receipt');
    } finally {
      setLoading(false);
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
    supplier: 'Suppliers',
    vendor: 'Vendors',
    internal: 'Internal',
    other: 'Other'
  };

  return (
    <TimeEntryDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Receipt"
      description="Update receipt details"
    >
      <div className="space-y-2">
        {receipt?.approval_status === 'approved' && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-2">
            <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">Receipt Approved</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              This receipt has been approved. Only admins can make changes.
            </AlertDescription>
          </Alert>
        )}
        
        {receipt?.approval_status === 'rejected' && (
          <Alert variant="destructive" className="p-2">
            <XCircle className="h-3.5 w-3.5" />
            <AlertTitle>Receipt Rejected</AlertTitle>
            <AlertDescription>
              {receipt.rejection_reason || 'This receipt was rejected. You can edit and resubmit.'}
            </AlertDescription>
          </Alert>
        )}

        {receipt?.approval_status === 'pending' && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-2">
            <AlertCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">Pending Approval</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              You can still edit this receipt until it's approved.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          {/* Receipt Photo */}
          <div>
            <Label className="text-xs">Receipt Photo</Label>
            {capturedPhoto && (
              <div className="relative rounded-lg overflow-hidden border mt-1 mb-1">
                <img 
                  src={capturedPhoto} 
                  alt="Receipt" 
                  className="w-full h-auto max-h-48 object-contain"
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={capturePhoto}
              disabled={!canEdit || loading}
            >
              <Camera className="w-3.5 h-3.5 mr-2" />
              {capturedPhoto ? 'Replace Photo' : 'Add Photo'}
            </Button>
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date" className="text-xs">Date *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!canEdit || loading}
              className={cn("h-8", isMobile && "h-10")}
              style={{ fontSize: isMobile ? '16px' : undefined }}
            />
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount" className="text-xs">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canEdit || loading}
              className={cn("h-8", isMobile && "h-10")}
              style={{ fontSize: isMobile ? '16px' : undefined }}
            />
          </div>

          {/* Payee */}
          <div>
            <Label htmlFor="payee" className="text-xs">Payee *</Label>
            <NativeSelect
              id="payee"
              value={payeeId}
              onValueChange={setPayeeId}
              disabled={!canEdit || loading}
              className={cn("h-8", isMobile && "h-10 text-base")}
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
          <div>
            <Label htmlFor="project" className="text-xs">Project</Label>
            <NativeSelect
              id="project"
              value={projectId}
              onValueChange={setProjectId}
              disabled={!canEdit || loading}
              className={cn("h-8", isMobile && "h-10 text-base")}
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
          <div>
            <Label htmlFor="description" className="text-xs">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit || loading}
              className={cn("text-xs min-h-[60px]", isMobile && "text-base")}
              style={{ fontSize: isMobile ? '16px' : undefined }}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-1.5 pt-2">
          {canDelete && (
            <Button 
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
          )}
          <Button 
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)} 
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          {canEdit && (
            <Button 
              type="button"
              size="sm"
              onClick={handleSave} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>
      </div>
    </TimeEntryDialog>
  );
};
