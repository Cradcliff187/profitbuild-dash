import React, { useState, useEffect } from 'react';
import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera as CameraIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  client_name: string;
}

interface AddReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddReceiptModal: React.FC<AddReceiptModalProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [unassignedProjectId, setUnassignedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  const loadProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, project_number, project_name, client_name')
        .in('status', ['estimating', 'quoted', 'approved', 'in_progress'])
        .neq('project_number', 'SYS-000')
        .order('created_at', { ascending: false });

      setProjects(data || []);

      // Find unassigned project
      const unassigned = data?.find(p => p.project_number === 'SYS-000');
      if (unassigned) {
        setUnassignedProjectId(unassigned.id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
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

    const targetProjectId = selectedProjectId || unassignedProjectId;
    if (!targetProjectId) {
      toast.error('No project available. Please try again.');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Convert photo to blob
      const response = await fetch(capturedPhoto);
      const blob = await response.blob();

      // Upload to storage
      const timestamp = Date.now();
      const filename = `${timestamp}_receipt.jpg`;
      const storagePath = `${user.id}/receipts/${targetProjectId}/${filename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('time-tracker-documents')
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('time-tracker-documents')
        .createSignedUrl(uploadData.path, 31536000);

      if (!urlData?.signedUrl) throw new Error('Failed to get signed URL');

      // Create expense record
      const { error: dbError } = await supabase
        .from('expenses')
        .insert({
          project_id: targetProjectId,
          category: 'other',
          transaction_type: 'expense',
          amount: 0,
          expense_date: new Date().toISOString().split('T')[0],
          description: description || 'Receipt',
          attachment_url: urlData.signedUrl,
        });

      if (dbError) throw dbError;

      toast.success('Receipt saved successfully');
      onSuccess();
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
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Capture / Photo Preview */}
          {!capturedPhoto ? (
            <Button
              onClick={capturePhoto}
              variant="outline"
              className="w-full h-48 border-2 border-dashed"
            >
              <div className="flex flex-col items-center gap-2">
                <CameraIcon className="w-12 h-12 text-muted-foreground" />
                <span className="text-sm font-medium">Take Photo</span>
              </div>
            </Button>
          ) : (
            <div className="relative">
              <img
                src={capturedPhoto}
                alt="Captured receipt"
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                onClick={() => setCapturedPhoto(null)}
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Project Selector (Optional) */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Assign to Project (Optional)
            </Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Leave blank for unassigned" />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter(p => !p.project_number.startsWith('SYS-') && p.project_number !== '000-UNASSIGNED')
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_number} - {project.project_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {!selectedProjectId && (
              <p className="text-xs text-muted-foreground">
                Will be saved as "Unassigned" - you can assign it to a project later
              </p>
            )}
          </div>

          {/* Description (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-muted-foreground">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note about this receipt..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!capturedPhoto || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Receipt'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
