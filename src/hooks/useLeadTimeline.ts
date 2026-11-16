import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useBidMedia } from '@/hooks/useBidMedia';
import type { BidMedia, LeadTimelineAttachment, LeadTimelineEntry, TimelineKind, TouchKind } from '@/types/bid';

export const leadTimelineKey = (bidId: string) => ['lead-timeline', bidId] as const;

type TimelineRow = {
  id: string;
  target_type: string;
  target_id: string;
  kind: string;
  occurred_at: string;
  summary: string | null;
  body: string | null;
  user_id: string | null;
  written_by: string | null;
  attachments: unknown;
  metadata: unknown;
  created_at: string;
};

const mediaToEntry = (m: BidMedia): LeadTimelineEntry => ({
  id: `media:${m.id}`,
  target_type: 'lead',
  target_id: m.bid_id,
  kind: 'file',
  occurred_at: m.taken_at ?? m.created_at,
  summary: m.caption,
  body: m.description,
  user_id: m.uploaded_by,
  written_by: null,
  attachments: [
    {
      media_id: m.id,
      file_type: m.file_type,
      file_name: m.file_name,
      url: m.file_url,
      thumbnail_url: m.thumbnail_url,
    },
  ],
  metadata: {},
  created_at: m.created_at,
  author_name: m.profiles?.full_name ?? null,
  source: 'media',
});

export interface AddTouchInput {
  kind: TouchKind;
  body: string;
  /** Defaults to now. */
  occurredAt?: Date;
  attachments?: LeadTimelineAttachment[];
  /**
   * The next step to record on the lead after this touch. `undefined` leaves
   * it alone; `null` clears it (the step is done); an object sets it.
   */
  nextStep?: { text: string; due: string | null } | null;
}

/**
 * The lead's activity timeline: lead_timeline rows (touches a person logged,
 * stage changes and job links the triggers logged) UNIONed at read time with
 * bid_media uploads that no touch references, so a bar-captured photo and the
 * words typed about it live on ONE timeline (Rule 20's read-side pattern — no
 * dual-write). Zero realtime (Gotchas #53/#55): freshness is invalidation on
 * our own writes + focus refetch.
 */
export function useLeadTimeline(bidId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { media, isLoading: mediaLoading } = useBidMedia(bidId ?? '');

  const query = useQuery({
    queryKey: leadTimelineKey(bidId ?? ''),
    enabled: !!bidId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<LeadTimelineEntry[]> => {
      const { data, error } = await supabase
        .from('lead_timeline')
        .select('id, target_type, target_id, kind, occurred_at, summary, body, user_id, written_by, attachments, metadata, created_at')
        .eq('target_type', 'lead')
        .eq('target_id', bidId!)
        .order('occurred_at', { ascending: false })
        .range(0, 999);
      if (error) throw error;
      const rows = (data ?? []) as TimelineRow[];
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
      let names = new Map<string, string | null>();
      if (userIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (pErr) throw pErr;
        names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || null]));
      }
      return rows.map((r) => ({
        id: r.id,
        target_type: r.target_type as LeadTimelineEntry['target_type'],
        target_id: r.target_id,
        kind: r.kind as TimelineKind,
        occurred_at: r.occurred_at,
        summary: r.summary,
        body: r.body,
        user_id: r.user_id,
        written_by: r.written_by,
        attachments: Array.isArray(r.attachments) ? (r.attachments as LeadTimelineAttachment[]) : [],
        metadata: (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, unknown>,
        created_at: r.created_at,
        author_name: r.user_id ? (names.get(r.user_id) ?? null) : null,
        source: 'timeline' as const,
      }));
    },
  });

  // Merge: media attached to a touch renders inside that touch (resolved URL
  // comes from the bid_media row); the rest become their own 'file' entries.
  const entries = useMemo<LeadTimelineEntry[]>(() => {
    const rows = query.data ?? [];
    const byId = new Map(media.map((m) => [m.id, m]));
    const attachedIds = new Set<string>();
    const resolved = rows.map((r) => {
      if (r.attachments.length === 0) return r;
      const attachments = r.attachments.map((a) => {
        if (a.media_id) attachedIds.add(a.media_id);
        const m = a.media_id ? byId.get(a.media_id) : undefined;
        return m
          ? { ...a, url: m.file_url, thumbnail_url: m.thumbnail_url, file_type: m.file_type, file_name: m.file_name }
          : a;
      });
      return { ...r, attachments };
    });
    const loose = media.filter((m) => !attachedIds.has(m.id)).map(mediaToEntry);
    return [...resolved, ...loose].sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );
  }, [query.data, media]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: leadTimelineKey(bidId ?? '') });
    queryClient.invalidateQueries({ queryKey: ['branch-bid', bidId] });
    queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
    queryClient.invalidateQueries({ queryKey: ['bid-media', bidId] });
  };

  const addTouch = useMutation({
    mutationFn: async (input: AddTouchInput) => {
      if (!bidId) throw new Error('No lead id');
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('lead_timeline').insert({
        target_type: 'lead',
        target_id: bidId,
        kind: input.kind,
        occurred_at: (input.occurredAt ?? new Date()).toISOString(),
        body: input.body,
        user_id: user.id,
        written_by: 'app',
        attachments: (input.attachments ?? []) as unknown as Json,
      });
      if (error) throw error;
      if (input.nextStep !== undefined) {
        const { error: stepErr } = await supabase
          .from('branch_bids')
          .update({
            next_step: input.nextStep?.text?.trim() || null,
            next_step_due: input.nextStep?.due || null,
          })
          .eq('id', bidId);
        if (stepErr) throw stepErr;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Logged');
    },
    onError: (error: Error) => {
      toast.error('Could not log that', { description: error.message });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      if (entryId.startsWith('media:')) throw new Error('Delete uploads from the Photos or Documents view');
      const { error } = await supabase.from('lead_timeline').delete().eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Removed');
    },
    onError: (error: Error) => {
      toast.error('Could not remove that', { description: error.message });
    },
  });

  return {
    entries,
    isLoading: query.isLoading || mediaLoading,
    error: query.error as Error | null,
    addTouch: addTouch.mutateAsync,
    isAdding: addTouch.isPending,
    deleteEntry: deleteEntry.mutate,
    isDeleting: deleteEntry.isPending,
    invalidateAll,
  };
}

/** Small write path for the lead record itself (next step, owner, size band…). */
export function useUpdateLead(bidId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!bidId) throw new Error('No lead id');
      const { error } = await supabase.from('branch_bids').update(patch).eq('id', bidId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-bid', bidId] });
      queryClient.invalidateQueries({ queryKey: ['branch-bids'] });
    },
    onError: (error: Error) => {
      toast.error('Could not save the lead', { description: error.message });
    },
  });
}
