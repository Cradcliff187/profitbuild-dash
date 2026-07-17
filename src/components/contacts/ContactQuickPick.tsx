import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import type { Contact } from '@/types/contact';
import { CONTACT_ROLE_LABELS } from '@/types/contact';
import { cn } from '@/lib/utils';

interface ContactQuickPickProps {
  clientId?: string | null;
  payeeId?: string | null;
  selectedName?: string; // highlight the chip matching the current form value
  onSelect: (contact: Contact) => void;
}

/** Chip row of a parent's active contacts. Tapping one fills the form fields via onSelect. */
export function ContactQuickPick({ clientId, payeeId, selectedName, onSelect }: ContactQuickPickProps) {
  const { data: contacts = [] } = useQuery({
    queryKey: clientId ? ['contacts', 'client', clientId] : ['contacts', 'payee', payeeId],
    enabled: !!(clientId || payeeId),
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq(clientId ? 'client_id' : 'payee_id', (clientId ?? payeeId)!)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  if (contacts.length < 2) return null; // nothing to switch between

  return (
    <div className="flex flex-wrap gap-1.5">
      {contacts.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent',
            selectedName === c.name && 'border-primary bg-primary/5'
          )}
        >
          {c.is_primary && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
          {c.name}
          {c.role && (
            <Badge variant="secondary" className="px-1 py-0 text-[10px]">
              {CONTACT_ROLE_LABELS[c.role]}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
