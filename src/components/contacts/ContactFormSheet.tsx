import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Contact, ContactRole } from '@/types/contact';
import { CONTACT_ROLE_LABELS } from '@/types/contact';
import type { ContactInput } from '@/hooks/useContacts';

interface ContactFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null; // null = create
  onSubmit: (input: ContactInput & { id?: string }) => Promise<unknown>;
  saving: boolean;
}

export function ContactFormSheet({ open, onOpenChange, contact, onSubmit, saving }: ContactFormSheetProps) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'' | ContactRole>('');
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? '');
      setTitle(contact?.title ?? '');
      setEmail(contact?.email ?? '');
      setPhone(contact?.phone ?? '');
      setRole(contact?.role ?? '');
      setIsPrimary(contact?.is_primary ?? false);
    }
  }, [open, contact]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    await onSubmit({
      id: contact?.id,
      name: name.trim(),
      title: title.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      role: role || null,
      is_primary: isPrimary,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-5 pb-3 border-b">
          <SheetTitle>{contact ? 'Edit Contact' : 'Add Contact'}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name *</Label>
            <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-title">Title</Label>
            <Input id="contact-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AP Manager" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-role">Role</Label>
            <NativeSelect
              id="contact-role"
              value={role}
              onValueChange={(v) => setRole(v as '' | ContactRole)}
              className="w-full"
            >
              <option value="">— None —</option>
              {(Object.keys(CONTACT_ROLE_LABELS) as ContactRole[]).map((r) => (
                <option key={r} value={r}>
                  {CONTACT_ROLE_LABELS[r]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input id="contact-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(v === true)} />
            Primary contact
          </label>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t bg-background">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
