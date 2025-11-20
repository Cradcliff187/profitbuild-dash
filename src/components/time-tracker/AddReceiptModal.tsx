import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera as CameraIcon, X, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PayeeSelector } from '@/components/PayeeSelector';
import { PayeeType } from '@/types/payee';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { isIOSPWA } from '@/utils/platform';

const UNASSIGNED_RECEIPTS_PROJECT_NUMBER = 'SYS-000';

interface Project {
  id: string;
  project_number: string;
  project_name: string;
  status: string;
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
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | undefined>();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [systemProjectId, setSystemProjectId] = useState<string | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

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
        .select('id, project_number, project_name, status')
        .order('project_name');

      if (error) throw error;
      
      // Find the SYS-000 project ID for fallback
      const sysProject = data?.find(p => p.project_number === UNASSIGNED_RECEIPTS_PROJECT_NUMBER);
      if (sysProject) {
        setSystemProjectId(sysProject.id);
      }
      
      // Pin projects at top of dropdown
      const pinnedProjects = data?.filter(p => 
        ['000-UNASSIGNED', '001-GAS'].includes(p.project_number)
      ) || [];
      
      // Regular projects: filter to approved/in_progress only, exclude system projects
      const regularProjects = data?.filter(p => 
        !['SYS-000', '000-UNASSIGNED', '001-GAS'].includes(p.project_number) &&
        (p.status === 'approved' || p.status === 'in_progress')
      ) || [];
      
      // Combine: pinned first, then regular projects
      setProjects([...pinnedProjects, ...regularProjects]);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projects;
    
    const query = projectSearchQuery.toLowerCase();
    return projects.filter(project =>
      project.project_number.toLowerCase().includes(query) ||
      project.project_name.toLowerCase().includes(query)
    );
  }, [projects, projectSearchQuery]);

  const openFilePicker = () => {
    if (isIOSPWA()) {
      toast.info('Device upload tip', {
        description: "Select Take Photo or Video, Photo Library, or Browse from your iPhone's sheet.",
        duration: 4000,
      });
    }
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

      // Send email notification
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

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        className={cn(
          "flex flex-col p-0",
          isMobile ? "w-full h-[92vh] rounded-t-2xl" : "w-full sm:max-w-[500px]"
        )}
        side={isMobile ? "bottom" : "right"}
      >
        <SheetHeader className="space-y-1 px-6 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className={isMobile ? "text-lg" : ""}>Add Receipt</SheetTitle>
          {!isMobile && (
            <SheetDescription>
              Capture a receipt and assign it to a vendor and project
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className={cn("space-y-4", isMobile && "space-y-4")}>
            {/* Camera Capture / Photo Preview */}
            <div className="space-y-3">
              {!capturedPhoto ? (
                <>
                  <Button
                    onClick={openFilePicker}
                    variant="outline"
                    className={cn("w-full border-2 border-dashed", isMobile ? "h-48" : "h-48")}
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <CameraIcon className="w-12 h-12 text-muted-foreground" />
                      <span className={isMobile ? "text-base font-medium" : "text-sm font-medium"}>
                        Upload photo (camera, photo library, or files)
                      </span>
                    </div>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Tapping the button opens the default iPhone/Android prompt so you can take a photo, pick from your
                    library, or browse files.
                  </p>
                </>
              ) : (
                <div className="relative">
                  <img
                    src={capturedPhoto}
                    alt="Captured receipt"
                    className={cn("w-full object-cover rounded-lg", isMobile ? "h-48" : "h-48")}
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
                    className={cn("absolute top-2 right-2", isMobile && "h-10 w-10")}
                  >
                    <X className={isMobile ? "w-5 h-5" : "w-4 h-4"} />
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>

            {/* Amount (Required) */}
            <div className="space-y-2">
              <Label htmlFor="amount" className={isMobile ? "text-sm font-medium" : "text-sm"}>
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className={cn(isMobile && "h-12")}
                style={{ fontSize: isMobile ? '16px' : undefined }}
              />
            </div>

            {/* Payee (Required) */}
            <PayeeSelector
              value={selectedPayeeId || ''}
              onValueChange={(payeeId) => setSelectedPayeeId(payeeId)}
              filterInternal={false}
              filterPayeeTypes={[
                PayeeType.MATERIAL_SUPPLIER,
                PayeeType.EQUIPMENT_RENTAL,
                PayeeType.MANAGEMENT,
                PayeeType.PERMIT_AUTHORITY,
                PayeeType.OTHER
              ]}
              sortByUsage={true}
              usageSource="receipts"
              label="Vendor / Supplier"
              showLabel
              placeholder="Select a vendor or supplier"
              required
              defaultPayeeType={PayeeType.MATERIAL_SUPPLIER}
              defaultIsInternal={false}
              compact={!isMobile}
            />

            {/* Project Assignment (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="project" className={cn("text-sm text-muted-foreground", isMobile && "font-medium")}>
                Assign to Project (Optional)
              </Label>
              <Select
                value={selectedProjectId || "unassigned"}
                onValueChange={(value) => {
                  setSelectedProjectId(value === "unassigned" ? undefined : value);
                  setProjectSearchQuery(''); // Clear search on selection
                }}
              >
                <SelectTrigger className={cn(isMobile && "h-12")}>
                  <SelectValue placeholder="Select a project">
                    {selectedProjectId ? (
                      <span className="truncate">
                        {projects.find(p => p.id === selectedProjectId)?.project_number} - {projects.find(p => p.id === selectedProjectId)?.project_name}
                      </span>
                    ) : (
                      "Unassigned"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Search Input INSIDE Dropdown */}
                  <div className="flex items-center border-b px-3 pb-2 pt-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  {/* Unassigned Option */}
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
                  {/* Filtered Projects */}
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_number} - {project.project_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No projects found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Description (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="description" className={cn("text-sm text-muted-foreground", isMobile && "font-medium")}>
                Notes (Optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this receipt..."
                rows={isMobile ? 4 : 3}
                className={cn(isMobile && "text-base")}
                style={{ fontSize: isMobile ? '16px' : undefined }}
              />
            </div>
          </div>
        </div>

        {/* Fixed Footer with Action Buttons */}
        <div className={cn("flex gap-3 px-6 border-t bg-background shrink-0", isMobile ? "py-4 pb-safe" : "py-4")}>
          <Button
            onClick={handleClose}
            variant="outline"
            className={cn("flex-1", isMobile && "h-12 text-base")}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className={cn("flex-1", isMobile && "h-12 text-base font-medium")}
            disabled={!capturedPhoto || !amount || !selectedPayeeId || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className={cn("mr-2 animate-spin", isMobile ? "h-5 w-5" : "h-4 w-4")} />
                Saving...
              </>
            ) : (
              'Save Receipt'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
