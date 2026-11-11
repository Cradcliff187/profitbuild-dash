import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Mail, Phone, Plus, Search, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { LeadContact } from '@/types/bid';

interface ContactPickerProps {
  value: LeadContact | null;
  onChange: (contact: LeadContact | null) => void;
  /** Contacts on this client sort first; a new person is attached to it. */
  clientId?: string | null;
  idPrefix?: string;
}

const norm = (s: string) => s.trim().toLowerCase();
const digits = (s: string) => s.replace(/\D/g, '');

/**
 * The person on a lead. Match BEFORE create (sales design rule 6): as you type
 * a name, email or phone it searches existing contacts (email exact → phone
 * digits → name) so the same human never gets two rows. "New person" creates
 * a contacts row — attached to the lead's client when there is one, otherwise
 * a prospect (no parent; allowed since the Nov 7 2026 CHECK relaxation).
 */
export function ContactPicker({ value, onChange, clientId, idPrefix = 'contact' }: ContactPickerProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', 'picker'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<LeadContact[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, title, email, phone, client_id')
        .eq('is_active', true)
        .order('name')
        .range(0, 999);
      if (error) throw error;
      return (data ?? []) as LeadContact[];
    },
  });

  const matches = useMemo(() => {
    const q = norm(search);
    if (!q) return [] as LeadContact[];
    const qd = digits(q);
    const scored = contacts
      .map((c) => {
        let score = 0;
        if (c.email && norm(c.email) === q) score = 100;
        else if (qd.length >= 7 && c.phone && digits(c.phone).includes(qd)) score = 90;
        else if (norm(c.name).includes(q)) score = 60;
        else if (c.email && norm(c.email).includes(q)) score = 50;
        if (score && clientId && c.client_id === clientId) score += 5;
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));
    return scored.slice(0, 8).map((x) => x.c);
  }, [contacts, search, clientId]);

  // Seed the new-person form from what was typed so nothing is retyped.
  useEffect(() => {
    if (!creating) return;
    const q = search.trim();
    if (!q) return;
    if (q.includes('@')) setNewEmail((v) => v || q);
    else if (digits(q).length >= 7) setNewPhone((v) => v || q);
    else setNewName((v) => v || q);
  }, [creating, search]);

  const create = useMutation({
    mutationFn: async (): Promise<LeadContact> => {
      const name = newName.trim();
      if (!name) throw new Error('Name is required');
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name,
          title: newTitle.trim() || null,
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
          client_id: clientId || null,
          is_primary: false,
        })
        .select('id, name, title, email, phone, client_id')
        .single();
      if (error) throw error;
      return data as LeadContact;
    },
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onChange(contact);
      setCreating(false);
      setSearch('');
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewTitle('');
      toast.success('Person added');
    },
    onError: (e: Error) => toast.error('Could not add the person', { description: e.message }),
  });

  if (value) {
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <div className="flex min-w-0 items-start gap-2">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 text-sm">
            <div className="truncate font-medium">
              {value.name}
              {value.title && <span className="text-muted-foreground"> · {value.title}</span>}
            </div>
            <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {value.phone && (
                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" aria-hidden />{value.phone}</span>
              )}
              {value.email && (
                <span className="inline-flex items-center gap-1 truncate"><Mail className="h-3 w-3" aria-hidden />{value.email}</span>
              )}
            </div>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onChange(null)} aria-label="Remove person">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-3 rounded-md border p-3">
        <div className="text-sm font-medium">New person</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-new-name`}>Name *</Label>
            <Input id={`${idPrefix}-new-name`} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-new-phone`}>Phone</Label>
            <Input id={`${idPrefix}-new-phone`} inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-new-email`}>Email</Label>
            <Input id={`${idPrefix}-new-email`} type="text" inputMode="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-new-title`}>Title / role</Label>
            <Input id={`${idPrefix}-new-title`} placeholder="Facility manager, owner, …" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
          <Button type="button" size="sm" onClick={() => create.mutate()} disabled={create.isPending || !newName.trim()}>
            {create.isPending ? 'Adding…' : 'Add person'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={`${idPrefix}-search`}
          className="pl-8"
          placeholder="Name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </div>
      {search.trim() && (
        <div className="overflow-hidden rounded-md border">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onChange(c); setSearch(''); }}
              className={cn(
                'flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0',
                'hover:bg-accent/50 active:bg-accent min-h-[44px]',
              )}
            >
              <Check className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {c.name}
                  {c.title && <span className="font-normal text-muted-foreground"> · {c.title}</span>}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[c.phone, c.email].filter(Boolean).join(' · ') || 'No phone or email on file'}
                </span>
              </span>
              {clientId && c.client_id === clientId && (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary">this client</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-accent/50 min-h-[44px]"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            {matches.length > 0 ? 'None of these — add a new person' : `Add “${search.trim()}” as a new person`}
          </button>
        </div>
      )}
      {!search.trim() && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New person
        </Button>
      )}
    </div>
  );
}
