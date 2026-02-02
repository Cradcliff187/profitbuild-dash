# 04 — Comment Badge Consolidation

## Priority: Fourth (Significant Performance Improvement)
## Risk Level: Low-Medium — changing component interface, but contained to gallery
## Estimated Time: 30 minutes
## Depends On: 03 (batch URL pattern establishes the approach)

---

## Context

`MediaCommentBadge` is a standalone component that each gallery item renders independently. Every instance creates its own Supabase query AND its own realtime subscription channel. With 40 gallery items, that's 40 queries + 40 websocket channels on mount.

The fix: fetch all comment counts once at the `ProjectMediaGallery` level, pass counts as props to a simplified badge, and use a single project-scoped realtime subscription for updates.

## Files to Modify

### File 1: `src/components/MediaCommentBadge.tsx`

**Replace the entire file** with a simple presentational component that takes a count prop:

```typescript
import { MessageSquare } from 'lucide-react';
import { Badge } from './ui/badge';

interface MediaCommentBadgeProps {
  count: number;
}

export function MediaCommentBadge({ count }: MediaCommentBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge className="absolute bottom-2 left-2 z-10 text-xs bg-black/70 text-white border-0">
      <MessageSquare className="h-3 w-3 mr-1" />
      {count}
    </Badge>
  );
}
```

**What this removes:**
- `useState` for count
- `useEffect` with Supabase query
- `useEffect` with Supabase realtime channel subscription
- `supabase` import

**What this preserves:**
- Identical visual output (same Badge, same styling, same MessageSquare icon)
- Same component name and export
- Same conditional render (count === 0 returns null)

### File 2: `src/components/ProjectMediaGallery.tsx`

This file needs three additions:

#### Addition 1: Import and state for comment counts

Add near the top with other imports:
```typescript
import { useEffect, useState, useCallback } from 'react';
// ... existing imports ...
```

Add state inside the component (near other state declarations):
```typescript
const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
```

#### Addition 2: Fetch all comment counts in a single query

Add a `useEffect` that runs when `allMedia` changes:
```typescript
// Fetch comment counts for all media items in one query
useEffect(() => {
  if (allMedia.length === 0) return;

  const fetchCommentCounts = async () => {
    const mediaIds = allMedia.map((m) => m.id);

    // Single query: get count grouped by media_id
    // Supabase doesn't support GROUP BY directly, so we fetch all comment media_ids
    // and count client-side. For large datasets, an RPC would be better.
    const { data, error } = await supabase
      .from('media_comments')
      .select('media_id')
      .in('media_id', mediaIds);

    if (error) {
      console.error('Failed to fetch comment counts:', error);
      return;
    }

    const counts = new Map<string, number>();
    (data || []).forEach((row) => {
      counts.set(row.media_id, (counts.get(row.media_id) || 0) + 1);
    });
    setCommentCounts(counts);
  };

  fetchCommentCounts();
}, [allMedia]);
```

**Important note on the query approach:** We're fetching `media_id` column only (lightweight) and counting client-side. For projects with thousands of comments, a Supabase RPC with `GROUP BY` would be more efficient, but for typical project volumes (< 500 comments) this is fine and avoids a database migration.

#### Addition 3: Single realtime subscription for comment changes

Add another `useEffect` for realtime (below the fetch effect):
```typescript
// Single realtime subscription for all comment changes on this project's media
useEffect(() => {
  if (!projectId) return;

  const channel = supabase
    .channel(`project-media-comments-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'media_comments',
      },
      (payload) => {
        // When any comment changes, update the relevant count
        const mediaId =
          payload.new && typeof payload.new === 'object' && 'media_id' in payload.new
            ? (payload.new as { media_id: string }).media_id
            : payload.old && typeof payload.old === 'object' && 'media_id' in payload.old
              ? (payload.old as { media_id: string }).media_id
              : null;

        if (!mediaId) return;

        // Refetch counts for accuracy (avoids complex insert/delete tracking)
        const mediaIds = allMedia.map((m) => m.id);
        supabase
          .from('media_comments')
          .select('media_id')
          .in('media_id', mediaIds)
          .then(({ data }) => {
            const counts = new Map<string, number>();
            (data || []).forEach((row) => {
              counts.set(row.media_id, (counts.get(row.media_id) || 0) + 1);
            });
            setCommentCounts(counts);
          });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [projectId, allMedia]);
```

#### Addition 4: Pass count to MediaCommentBadge

Find every place `<MediaCommentBadge` is rendered in this file. The current usage is:
```tsx
<MediaCommentBadge mediaId={item.id} />
```

**Change to:**
```tsx
<MediaCommentBadge count={commentCounts.get(item.id) || 0} />
```

**Search for ALL instances** — there may be multiple (grid view, list view, timeline view). Every single one must be updated.

### File 3: Check for other consumers of MediaCommentBadge

```bash
grep -r "MediaCommentBadge" src/ --include="*.tsx" --include="*.ts"
```

If `MediaCommentBadge` is used in files OTHER than `ProjectMediaGallery.tsx`, those consumers also need to provide a `count` prop. Check each one and decide:
- If the consumer already has access to comment count data, pass it
- If not, the consumer needs its own count fetch (but should still not use the old per-item pattern)

**Most likely result:** MediaCommentBadge is only used inside ProjectMediaGallery. If so, no other files need changes.

## What NOT to Change

- `src/components/MediaCommentsList.tsx` — This is the expanded comments panel, not the badge. It has its own per-item subscription which is acceptable (only 1 panel open at a time, not N items).
- The `supabase` import in `ProjectMediaGallery.tsx` — it's already imported for other uses.
- The realtime subscription pattern for `project_media` changes — that's a different subscription, leave it alone.

## Validation Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Gallery loads, photos display correctly
- [ ] Photos with comments show the comment count badge
- [ ] Photos without comments show no badge
- [ ] Add a comment to a photo → badge appears/updates without page refresh
- [ ] Delete a comment → badge count decreases without page refresh
- [ ] Open DevTools → check there is only ONE `project-media-comments-*` channel (not N separate `comments-{mediaId}` channels)
- [ ] Open a photo's comment panel → comments still load and display correctly (MediaCommentsList is unchanged)

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Initial queries (40 items) | 40 count queries | 1 query |
| Realtime channels (40 items) | 40 channels | 1 channel |
| Memory (subscriptions) | 40 listeners | 1 listener |
