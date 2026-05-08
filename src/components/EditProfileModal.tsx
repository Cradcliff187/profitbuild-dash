import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

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

  // Reset form data when sheet opens or user changes
  useEffect(() => {
    if (open) {
      setFullName(user.full_name || '');

      async function loadPhoneData() {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone, sms_notifications_enabled')
          .eq('id', user.id)
          .single();

        if (error) { console.error('Failed to load profile phone data:', error); return; }
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>
            Update user profile information
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="edit-profile-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email (read-only)</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Phone (for SMS)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                disabled={loading}
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
              <label htmlFor="sms-enabled" className="text-sm cursor-pointer">
                Receive SMS notifications
              </label>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
