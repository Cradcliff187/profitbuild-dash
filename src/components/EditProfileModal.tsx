import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserCog } from 'lucide-react';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string | null;
    sms_notifications_enabled?: boolean | null;
  };
  onSuccess: () => void;
}

export default function EditProfileModal({ open, onOpenChange, user, onSuccess }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [smsEnabled, setSmsEnabled] = useState(user.sms_notifications_enabled ?? true);

  // Reset form data when modal opens or user changes
  useEffect(() => {
    if (open) {
      // Reset fullName with the new user's data
      setFullName(user.full_name || '');
      
      async function loadPhoneData() {
        const { data } = await supabase
          .from('profiles')
          .select('phone, sms_notifications_enabled')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setPhone(data.phone || '');
          setSmsEnabled(data.sms_notifications_enabled ?? true);
        }
      }
      loadPhoneData();
    }
  }, [open, user.id, user.full_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          sms_notifications_enabled: smsEnabled,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Profile Updated", { description: "User profile updated successfully" });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-4 w-4" />
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update user profile information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email (read-only)</Label>
            <Input
              value={user.email}
              disabled
              className="h-8 text-sm bg-muted"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name"
              disabled={loading}
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs">Mobile Phone (for SMS)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={loading}
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Used for clock-in reminders and team notifications
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="sms-enabled"
              checked={smsEnabled}
              onCheckedChange={(checked) => setSmsEnabled(checked === true)}
              disabled={loading}
            />
            <label htmlFor="sms-enabled" className="text-xs cursor-pointer">
              Receive SMS notifications
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 h-8 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-8 text-xs">
              {loading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
