import { useState, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PayeeSelector } from '@/components/PayeeSelector';
import { toast } from 'sonner';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

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
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        setCapturedPhoto(image.dataUrl);
        setPhotoChanged(true);
      }
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo Section */}
          <div className="space-y-2">
            <Label>Receipt Photo</Label>
            {capturedPhoto ? (
              <div className="relative">
                <img src={capturedPhoto} alt="Receipt" className="w-full h-48 object-cover rounded-md" />
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
                <p className="text-sm text-muted-foreground mb-4">No photo</p>
              </div>
            )}
            <Button onClick={capturePhoto} variant="outline" className="w-full" type="button">
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Payee */}
          <div className="space-y-2">
            <Label>Payee *</Label>
            <PayeeSelector
              value={selectedPayeeId}
              onValueChange={setSelectedPayeeId}
              placeholder="Select payee..."
            />
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label htmlFor="project">Project (Optional)</Label>
            <select
              id="project"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              placeholder="Optional notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!capturedPhoto || !amount || !selectedPayeeId || isUploading}
            >
              {isUploading ? 'Updating...' : 'Update Receipt'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
