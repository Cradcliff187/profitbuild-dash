import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Contact } from '@/types/contact';
import { toast } from 'sonner';

export type ContactParent = { clientId: string } | { payeeId: string };

const parentKey = (parent: ContactParent) =>
  'clientId' in parent
    ? (['contacts', 'client', parent.clientId] as const)
    : (['contacts', 'payee', parent.payeeId] as const);

export type ContactInput = {
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: Contact['role'];
  is_primary?: boolean;
  notes?: string | null;
};

export function useContacts(parent: ContactParent) {
  const queryClient = useQueryClient();
  const queryKey = parentKey(parent);
  const parentCol =
    'clientId' in parent
      ? { col: 'client_id' as const, id: parent.clientId }
      : { col: 'payee_id' as const, id: parent.payeeId };

  const query = useQuery({
    queryKey,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq(parentCol.col, parentCol.id)
        .order('is_primary', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  // Clearing a previous primary first keeps the one-primary-per-parent
  // partial unique index happy.
  const clearPrimary = async () => {
    const { error } = await supabase
      .from('contacts')
      .update({ is_primary: false })
      .eq(parentCol.col, parentCol.id)
      .eq('is_primary', true);
    if (error) throw error;
  };

  const addContact = useMutation({
    mutationFn: async (input: ContactInput) => {
      if (input.is_primary) await clearPrimary();
      const { data, error } = await supabase
        .from('contacts')
        .insert({ [parentCol.col]: parentCol.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Contact added');
    },
    onError: (e) => {
      console.error('addContact failed:', e);
      toast.error('Failed to add contact');
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...input }: ContactInput & { id: string }) => {
      if (input.is_primary) await clearPrimary();
      const { data, error } = await supabase
        .from('contacts')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Contact updated');
    },
    onError: (e) => {
      console.error('updateContact failed:', e);
      toast.error('Failed to update contact');
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Contact deleted');
    },
    onError: (e) => {
      console.error('deleteContact failed:', e);
      toast.error('Failed to delete contact');
    },
  });

  return { ...query, contacts: query.data ?? [], addContact, updateContact, deleteContact };
}
