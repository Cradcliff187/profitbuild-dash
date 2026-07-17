import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Plus, Pencil, Trash2, Mail, Phone } from 'lucide-react';
import { useContacts, type ContactParent } from '@/hooks/useContacts';
import type { Contact } from '@/types/contact';
import { CONTACT_ROLE_LABELS } from '@/types/contact';
import { ContactFormSheet } from './ContactFormSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ContactsCard({ parent }: { parent: ContactParent }) {
  const { contacts, isLoading, addContact, updateContact, deleteContact } = useContacts(parent);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const saving = addContact.isPending || updateContact.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contacts</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : contacts.filter((c) => c.is_active).length === 0 ? (
        <div className="text-sm text-muted-foreground">No contacts yet.</div>
      ) : (
        <div className="space-y-2">
          {contacts
            .filter((c) => c.is_active)
            .map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    {c.is_primary && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    <span className="truncate">{c.name}</span>
                    {c.role && (
                      <Badge variant="secondary" className="shrink-0">
                        {CONTACT_ROLE_LABELS[c.role]}
                      </Badge>
                    )}
                  </div>
                  {c.title && <div className="text-xs text-muted-foreground">{c.title}</div>}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-3 w-3" />
                      {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-3 w-3" />
                      {c.phone}
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditing(c);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      <ContactFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editing}
        saving={saving}
        onSubmit={async (input) =>
          input.id
            ? updateContact.mutateAsync(input as ContactInputWithId)
            : addContact.mutateAsync(input)
        }
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact</AlertDialogTitle>
            <AlertDialogDescription>Delete {deleting?.name}? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) deleteContact.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type ContactInputWithId = Parameters<ReturnType<typeof useContacts>['updateContact']['mutateAsync']>[0];
