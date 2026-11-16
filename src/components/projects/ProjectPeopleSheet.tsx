import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { LEAD_SOURCE_LABELS } from '@/types/bid';
import type { Contact } from '@/types/contact';
import { useSaveProjectPeople } from '@/hooks/useProjectPeople';
import { PROJECT_SOURCES, isSourceSet, type ProjectPeopleValues } from '@/utils/projectSource';

const NONE = 'none';

interface ProjectPeopleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The project(s) to write. */
  projectIds: string[];
  /**
   * 'single' (default) edits one project's contact + source. 'bulk' sets the
   * source only on every id — explicit rather than inferred from the count, so
   * a bulk action with ONE row selected can never clear that project's contact.
   */
  mode?: 'single' | 'bulk';
  /** The project's client. Contacts are picked from this organization. */
  clientId?: string | null;
  clientName?: string | null;
  initial?: Partial<ProjectPeopleValues>;
  onSaved?: () => void;
}

/**
 * Edit "who is our person" and "how did this job come in" (Rule 45). The same
 * sheet serves the project page (one project: contact + source) and the
 * Projects list bulk action (many projects: source only — contacts differ per
 * client, so they are never bulk-set). Nothing here is required.
 */
export function ProjectPeopleSheet({
  open,
  onOpenChange,
  projectIds,
  mode = 'single',
  clientId,
  clientName,
  initial,
  onSaved,
}: ProjectPeopleSheetProps) {
  const isBulk = mode === 'bulk';
  const queryClient = useQueryClient();
  const save = useSaveProjectPeople();

  const [contactId, setContactId] = useState<string>(NONE);
  const [source, setSource] = useState<string>(NONE);
  const [sourceContactId, setSourceContactId] = useState<string>(NONE);
  const [sourceDetail, setSourceDetail] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [addingBusy, setAddingBusy] = useState(false);

  // Seed on open only — never re-seed while the user is typing (a focus
  // refetch of the project would otherwise wipe half-entered edits).
  useEffect(() => {
    if (!open) return;
    setContactId(initial?.primary_contact_id || NONE);
    setSource(isSourceSet(initial?.source) ? (initial!.source as string) : NONE);
    setSourceContactId(initial?.source_contact_id || NONE);
    setSourceDetail(initial?.source_detail ?? '');
    setAdding(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data: contacts = [] } = useQuery({
    // Shares the ContactsCard / ContactQuickPick key on purpose (Gotcha #27).
    queryKey: ['contacts', 'client', clientId],
    enabled: open && !isBulk && !!clientId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', clientId!)
        .order('is_primary', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  // Active people, plus whoever is already selected even if since deactivated.
  const pickable = contacts.filter(
    (c) => c.is_active || c.id === contactId || c.id === sourceContactId,
  );
  const personLabel = (c: Contact) => (c.title ? `${c.name} · ${c.title}` : c.name);

  const handleAddPerson = async () => {
    if (!clientId || !newName.trim()) {
      toast.error('Give the person a name');
      return;
    }
    setAddingBusy(true);
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        client_id: clientId,
        name: newName.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        // First person at a client becomes its primary; later ones do not.
        is_primary: contacts.length === 0,
      })
      .select()
      .single();
    setAddingBusy(false);
    if (error || !data) {
      console.error('Adding contact failed:', error);
      toast.error('Could not add the person', { description: error?.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['contacts', 'client', clientId] });
    setContactId(data.id);
    setAdding(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
  };

  const handleSave = async () => {
    // Bulk never clears: pick a source, or cancel.
    if (isBulk && source === NONE) {
      toast.error('Pick a source first');
      return;
    }
    const values: Partial<ProjectPeopleValues> = {
      source: source === NONE ? null : source,
      source_detail: sourceDetail,
    };
    if (!isBulk) {
      values.primary_contact_id = contactId === NONE ? null : contactId;
      values.source_contact_id = sourceContactId === NONE ? null : sourceContactId;
    }
    try {
      await save.mutateAsync({ projectIds, values });
      onSaved?.();
      onOpenChange(false);
    } catch {
      // toast already shown by the mutation; keep the sheet open with the edits.
    }
  };

  const busy = save.isPending || addingBusy;

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="right" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-[480px]">
        <SheetHeader className="shrink-0 space-y-1 border-b px-6 pb-4 pt-6 text-left">
          <SheetTitle>{isBulk
              ? `Set source on ${projectIds.length} ${projectIds.length === 1 ? 'project' : 'projects'}`
              : 'Contact & source'}</SheetTitle>
          <SheetDescription>
            {isBulk
              ? 'How these jobs came in. Each project keeps its own contact.'
              : 'Who our person is on this job, and how the job came in. Nothing here is required.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {!isBulk && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
              {!clientId ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  This project has no client linked yet. Set the client on the project to pick a contact.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="project-people-contact">
                      Main contact{clientName ? ` at ${clientName}` : ''}
                    </Label>
                    <Select value={contactId} onValueChange={setContactId} disabled={busy}>
                      <SelectTrigger id="project-people-contact" className="min-h-[44px]">
                        <SelectValue placeholder="No contact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No contact</SelectItem>
                        {pickable.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {personLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {adding ? (
                    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                      <div className="space-y-2">
                        <Label htmlFor="project-people-new-name">Name *</Label>
                        <Input
                          id="project-people-new-name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="First and last name"
                          autoComplete="off"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="project-people-new-phone">Phone</Label>
                          <Input
                            id="project-people-new-phone"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            inputMode="tel"
                            autoComplete="off"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="project-people-new-email">Email</Label>
                          <Input
                            id="project-people-new-email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            inputMode="email"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={addingBusy}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddPerson} disabled={addingBusy}>
                          {addingBusy ? 'Adding…' : 'Add person'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 min-h-[36px] gap-1.5 text-primary"
                      onClick={() => setAdding(true)}
                      disabled={busy}
                    >
                      <UserPlus className="h-4 w-4" />
                      Add a new person
                    </Button>
                  )}
                </>
              )}
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</h3>
            <div className="space-y-2">
              <Label htmlFor="project-people-source">
                {isBulk ? 'How did these jobs come in?' : 'How did this job come in?'}
              </Label>
              {/* Bulk has no "Not set" item, so an unset value must be undefined for
                  the placeholder to show (a value with no matching item renders blank). */}
              <Select
                value={isBulk && source === NONE ? undefined : source}
                onValueChange={setSource}
                disabled={busy}
              >
                <SelectTrigger id="project-people-source" className="min-h-[44px]">
                  <SelectValue placeholder={isBulk ? "Pick a source" : "Not set"} />
                </SelectTrigger>
                <SelectContent>
                  {!isBulk && <SelectItem value={NONE}>Not set</SelectItem>}
                  {PROJECT_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LEAD_SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isBulk && !!clientId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="project-people-source-contact">Who brought it in?</Label>
                  {contactId !== NONE && sourceContactId !== contactId && (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setSourceContactId(contactId)}
                      disabled={busy}
                    >
                      Same as contact
                    </button>
                  )}
                </div>
                <Select value={sourceContactId} onValueChange={setSourceContactId} disabled={busy}>
                  <SelectTrigger id="project-people-source-contact" className="min-h-[44px]">
                    <SelectValue placeholder="No one in particular" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No one in particular</SelectItem>
                    {pickable.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {personLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="project-people-source-detail">Detail</Label>
              <Input
                id="project-people-source-detail"
                value={sourceDetail}
                onChange={(e) => setSourceDetail(e.target.value)}
                placeholder="e.g. referred by Matt at ABC Architects"
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                Use this for someone who is not in your contacts, or for the campaign or site it came from.
              </p>
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
