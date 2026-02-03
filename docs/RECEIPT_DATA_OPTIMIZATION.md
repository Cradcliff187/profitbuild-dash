# Receipt Data Fetching Optimization

## Summary

Migrate receipt data hooks from raw `useState`/`useEffect` patterns to TanStack React Query (`useQuery`) to match the established codebase patterns used in `useBidNotes.ts`, `useProjectMedia.ts`, and `useCompanySettings.ts`. This eliminates redundant network calls, adds caching, and fixes slow page loads.

## Problem

Three receipt views use inconsistent and slow data fetching:

1. **`src/hooks/useReceiptsData.ts`** — Raw `useState`/`useEffect` with no caching. Fires 4 separate sequential requests (receipts → profiles → payees → projects) on every mount. Real-time subscription triggers a full reload of everything on any receipt change. Navigating away and back re-fetches from scratch.

2. **`src/components/time-tracker/ReceiptsList.tsx`** — Inline `useState`/`useEffect` with its own independent Supabase fetch. Also uncached and re-fetches on every mount.

3. **`src/components/ProjectReceiptsView.tsx`** — Already uses `useQuery` (partially modernized) but does sequential profile/payee fetches and has no `staleTime`.

Meanwhile, newer hooks like `useBidNotes`, `useBidMedia`, `useProjectMedia`, and `useCompanySettings` all use TanStack React Query with proper caching, `staleTime`, and `queryClient.invalidateQueries()`.

## Architecture Principle

**Zero breaking changes.** The `UnifiedReceipt` interface, all exported return types, and all consumer component props remain identical. This refactor changes internal implementation only.

---

## Files to Modify

| File | Change Type | Risk |
|------|------------|------|
| `src/hooks/useReceiptsData.ts` | **Rewrite internals** — replace useState/useEffect with useQuery | Medium — main data hook, but return shape stays identical |
| `src/hooks/useReceiptActions.ts` | **Update callback** — replace `loadReceipts()` with `queryClient.invalidateQueries` | Low — only changes how refresh is triggered |
| `src/hooks/useReceiptBulkActions.ts` | **Update callback** — same as above | Low |
| `src/components/time-tracker/ReceiptsList.tsx` | **Replace inline fetch** — use shared `useQuery` or `useReceiptsData` | Medium — self-contained component |
| `src/components/ProjectReceiptsView.tsx` | **Add staleTime + real-time** — minor enhancement | Low |

## Files NOT Modified (No Changes Needed)

These files consume data via props or pure logic — they are unaffected:

- `src/hooks/useReceiptFiltering.ts` — Pure memoized filter, takes `UnifiedReceipt[]` input
- `src/hooks/useReceiptSorting.tsx` — Pure memoized sort, takes `UnifiedReceipt[]` input
- `src/components/receipts/ReceiptsTable.tsx` — Presentational, receives props
- `src/components/receipts/ReceiptsCardView.tsx` — Presentational, receives props
- `src/components/receipts/ReceiptsTableHeader.tsx` — Presentational
- `src/components/receipts/ReceiptsTableRow.tsx` — Presentational
- `src/components/ReceiptSearchFilters.tsx` — Filter UI, no data fetching
- `src/config/receiptColumns.ts` — Static column config
- `src/utils/receiptExport.ts` — Export utility
- `src/utils/receiptDownloadUtils.ts` — Download utility
- `src/components/ReceiptsManagement.tsx` — Consumer of `useReceiptsData`, no changes needed because the hook's return shape is preserved

---

## Phase 1: Rewrite `useReceiptsData.ts`

### Current Pattern (REMOVE)
```typescript
// OLD: useState + useEffect + manual loading
const [allReceipts, setAllReceipts] = useState<UnifiedReceipt[]>([]);
const [loading, setLoading] = useState(true);
const [payees, setPayees] = useState<Array<{ id: string; name: string }>>([]);
const [projects, setProjects] = useState<Array<{ id: string; number: string; name: string }>>([]);

const loadReceipts = useCallback(async () => { ... }, []);

useEffect(() => { loadReceipts(); }, [loadReceipts]);
useEffect(() => { fetchPayees(); }, []);
useEffect(() => { fetchProjects(); }, []);
useEffect(() => { /* realtime channel calls loadReceipts() */ }, [loadReceipts]);
```

### New Pattern (REPLACE WITH)

Follow the established pattern from `useBidNotes.ts` and `useProjectMedia.ts`:

```typescript
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================
// IMPORTANT: The UnifiedReceipt interface MUST NOT change.
// Keep the exact same export as the current file.
// ============================================================
export interface UnifiedReceipt {
  id: string;
  type: 'time_entry' | 'standalone';
  image_url: string;
  payee_id: string;
  payee_name: string;
  project_id: string;
  project_number: string;
  project_name: string;
  date: string;
  amount: number;
  description?: string;
  hours?: number;
  approval_status?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  submitted_for_approval_at?: string;
  user_id?: string;
  captured_at?: string;
  submitted_by_name?: string;
}

// ============================================================
// Query Keys — centralized for cache invalidation
// ============================================================
export const receiptQueryKeys = {
  all: ['receipts'] as const,
  list: () => [...receiptQueryKeys.all, 'list'] as const,
  payees: () => ['receipt-payees'] as const,
  projects: () => ['receipt-projects'] as const,
};

/**
 * Hook for fetching and managing receipt data
 *
 * Fetches standalone receipts from the database, handles real-time updates,
 * and provides statistics. Also fetches payees and projects for filtering.
 *
 * RETURN SHAPE IS IDENTICAL TO THE PREVIOUS VERSION.
 */
export const useReceiptsData = () => {
  const queryClient = useQueryClient();

  // ---- Main receipts query ----
  const {
    data: allReceipts = [],
    isLoading: receiptsLoading,
    refetch: refetchReceipts,
  } = useQuery({
    queryKey: receiptQueryKeys.list(),
    queryFn: async (): Promise<UnifiedReceipt[]> => {
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          id,
          image_url,
          amount,
          description,
          captured_at,
          approval_status,
          approved_by,
          approved_at,
          submitted_for_approval_at,
          rejection_reason,
          payee_id,
          project_id,
          user_id,
          payees(payee_name),
          projects(project_number, project_name)
        `)
        .order('captured_at', { ascending: false });

      if (receiptsError) throw receiptsError;

      // Fetch user profiles in parallel (not sequentially)
      const userIds = [...new Set((receiptsData || [])
        .filter((r: any) => r.user_id)
        .map((r: any) => r.user_id))];

      let profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap.set(p.id, p.full_name || 'Unknown');
          });
        }
      }

      // Transform to UnifiedReceipt — same mapping as before
      return (receiptsData || [])
        .map((receipt: any) => ({
          id: receipt.id,
          type: 'standalone' as const,
          image_url: receipt.image_url,
          payee_id: receipt.payee_id || '',
          payee_name: receipt.payees?.payee_name || 'Unknown',
          project_id: receipt.project_id || '',
          project_number: receipt.projects?.project_number || 'SYS-000',
          project_name: receipt.projects?.project_name || 'Unassigned',
          date: receipt.captured_at,
          amount: receipt.amount,
          description: receipt.description || '',
          approval_status: receipt.approval_status,
          approved_by: receipt.approved_by,
          approved_at: receipt.approved_at,
          rejection_reason: receipt.rejection_reason,
          submitted_for_approval_at: receipt.submitted_for_approval_at,
          user_id: receipt.user_id,
          captured_at: receipt.captured_at,
          submitted_by_name: receipt.user_id
            ? profilesMap.get(receipt.user_id)
            : undefined,
        }))
        .sort((a: UnifiedReceipt, b: UnifiedReceipt) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    },
  });

  // ---- Payees query (rarely changes — 30 min staleTime) ----
  const { data: payeesRaw = [] } = useQuery({
    queryKey: receiptQueryKeys.payees(),
    queryFn: async () => {
      const { data } = await supabase
        .from('payees')
        .select('id, payee_name')
        .eq('is_active', true)
        .order('payee_name');
      return (data || []).map((p: any) => ({ id: p.id, name: p.payee_name }));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // ---- Projects query (rarely changes — 30 min staleTime) ----
  const { data: projectsRaw = [] } = useQuery({
    queryKey: receiptQueryKeys.projects(),
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_number, project_name, category')
        .eq('category', 'construction')
        .order('project_number');
      return (data || []).map((p: any) => ({
        id: p.id,
        number: p.project_number,
        name: p.project_name,
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // ---- Real-time subscription (invalidate, don't refetch) ----
  useEffect(() => {
    const channel = supabase
      .channel('receipts-realtime-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'receipts',
      }, () => {
        queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ---- Statistics (memoized from cached data — no extra queries) ----
  const statistics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return {
      pendingCount: allReceipts.filter(
        (r) => !r.approval_status || r.approval_status === 'pending'
      ).length,
      approvedTodayCount: allReceipts.filter(
        (r) =>
          r.approval_status === 'approved' &&
          r.approved_at &&
          new Date(r.approved_at) >= todayStart
      ).length,
      rejectedCount: allReceipts.filter(
        (r) => r.approval_status === 'rejected'
      ).length,
      totalThisWeekCount: allReceipts.filter(
        (r) => new Date(r.date) >= weekStart
      ).length,
    };
  }, [allReceipts]);

  // ---- loadReceipts compatibility shim ----
  // Some consumers (useReceiptActions, useReceiptBulkActions, ReceiptsManagement ref)
  // call loadReceipts(). This bridges to the new pattern.
  const loadReceipts = () => {
    queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all });
  };

  // ============================================================
  // RETURN SHAPE — must be identical to current version
  // ============================================================
  return {
    allReceipts,
    loading: receiptsLoading,
    payees: payeesRaw,
    projects: projectsRaw,
    loadReceipts,
    statistics,
  };
};
```

### Why This Is Non-Breaking

- **`allReceipts`**: Same `UnifiedReceipt[]` type, same data shape, same sort order
- **`loading`**: Maps from `isLoading` — same boolean behavior
- **`payees`**: Same `Array<{ id: string; name: string }>` shape
- **`projects`**: Same `Array<{ id: string; number: string; name: string }>` shape
- **`loadReceipts`**: Still a callable function — now wraps `invalidateQueries` instead of raw fetch
- **`statistics`**: Same computed object, same memoization

### What Gets Faster

- **Navigation caching**: Leaving and returning to receipts page shows cached data instantly, background refreshes
- **Payees/projects**: Cached for 30 minutes instead of re-fetched every mount
- **Real-time**: `invalidateQueries` only refetches if the component is mounted and data is stale — no wasted requests
- **Parallel queries**: React Query fires all 3 queries simultaneously instead of sequentially

---

## Phase 2: Update `useReceiptActions.ts`

### Current Pattern
```typescript
interface UseReceiptActionsProps {
  loadReceipts: () => void;  // Currently calls the old imperative loadReceipts
  // ...
}
```

### Change Required

**No interface change needed.** The `loadReceipts` prop is already typed as `() => void`. The updated `useReceiptsData` now returns a `loadReceipts` that calls `queryClient.invalidateQueries`, which satisfies the same signature.

**Verify**: Confirm that `useReceiptActions.ts` calls `loadReceipts()` after mutations (approve, reject, delete). These calls will now trigger cache invalidation instead of a full refetch — which is the correct behavior. **No code changes needed in this file** as long as Phase 1 is implemented correctly.

The same applies to `useReceiptBulkActions.ts` — it receives `loadReceipts` as a prop and calls it after bulk operations. No changes needed.

---

## Phase 3: Update `ReceiptsList.tsx`

### Current Pattern (REMOVE)

The component at `src/components/time-tracker/ReceiptsList.tsx` has its own inline data fetching:

```typescript
// OLD: Component-local state and fetching
const [receipts, setReceipts] = useState<ReceiptData[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => { loadReceipts(); }, []);

const loadReceipts = async () => {
  setLoading(true);
  const { data, error } = await supabase
    .from('receipts')
    .select(`*, payees:payee_id (payee_name), projects:project_id (project_number, project_name)`)
    .order('captured_at', { ascending: false });
  // ... transform and setReceipts
};
```

### New Pattern (REPLACE WITH)

Replace the inline fetch with `useQuery` using the shared query key so it benefits from the same cache:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { receiptQueryKeys } from '@/hooks/useReceiptsData';

// Remove: const [receipts, setReceipts] = useState<ReceiptData[]>([]);
// Remove: const [loading, setLoading] = useState(true);
// Remove: useEffect(() => { loadReceipts(); }, []);
// Remove: const loadReceipts = async () => { ... };

const queryClient = useQueryClient();

const { data: receipts = [], isLoading: loading } = useQuery({
  queryKey: ['field-receipts'], // Separate key for field worker view
  queryFn: async (): Promise<ReceiptData[]> => {
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        payees:payee_id (payee_name),
        projects:project_id (project_number, project_name)
      `)
      .order('captured_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      image_url: r.image_url,
      amount: r.amount,
      payee_id: r.payee_id,
      payee_name: r.payees?.payee_name || undefined,
      project_id: r.project_id,
      project_number: r.projects?.project_number || undefined,
      project_name: r.projects?.project_name || undefined,
      description: r.description,
      captured_at: r.captured_at,
    }));
  },
});

// Replace all calls to loadReceipts() with:
const loadReceipts = () => {
  queryClient.invalidateQueries({ queryKey: ['field-receipts'] });
  // Also invalidate the main receipts cache so admin view stays in sync
  queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all });
};
```

### Important Details

- The `ReceiptData` interface inside this component is different from `UnifiedReceipt` — it has fewer fields. Keep the same interface.
- Every place in the component that calls `loadReceipts()` (after delete, bulk delete, edit success, reassign success) will now call the invalidation wrapper instead.
- The `filteredAndSortedReceipts` memoization that depends on `receipts` continues to work identically since it reads from the same variable name.

---

## Phase 4: Enhance `ProjectReceiptsView.tsx`

This component already uses `useQuery` — it just needs minor improvements:

### Add staleTime and real-time subscription

```typescript
// EXISTING (keep):
const { data: receipts = [], isLoading } = useQuery<Receipt[]>({
  queryKey: ['project-receipts', projectId],
  queryFn: async () => { /* existing queryFn is fine */ },
  // ADD these:
  staleTime: 1000 * 60 * 5, // 5 minutes
  enabled: !!projectId,
});

// ADD: Real-time subscription (follow useBidNotes pattern)
useEffect(() => {
  if (!projectId) return;

  const channel = supabase
    .channel(`project-receipts-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'receipts',
        filter: `project_id=eq.${projectId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['project-receipts', projectId] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [projectId, queryClient]);
```

### Also update delete handler

The existing delete handler in this component calls `queryClient.invalidateQueries` already — verify it also invalidates the main receipts cache:

```typescript
// After successful delete, add:
queryClient.invalidateQueries({ queryKey: ['project-receipts', projectId] });
queryClient.invalidateQueries({ queryKey: receiptQueryKeys.all }); // ADD this line
```

This requires importing: `import { receiptQueryKeys } from '@/hooks/useReceiptsData';`

---

## Validation Checklist

After implementing all phases, verify:

### Functional Tests
- [ ] Navigate to Receipts Management page — receipts load correctly
- [ ] Navigate away and back — page loads instantly from cache (no loading spinner on return)
- [ ] Approve a receipt — list updates without full page reload
- [ ] Reject a receipt — list updates, reject dialog closes
- [ ] Delete a receipt — list updates
- [ ] Bulk approve/reject/delete — list updates, selection clears
- [ ] Create a new receipt — appears in list via real-time subscription
- [ ] Filter by payee, project, status, date range — filters work correctly
- [ ] Sort by any column — sorting works correctly
- [ ] Export to CSV — exports filtered data
- [ ] Column visibility toggle — persists in localStorage
- [ ] Mobile card view — renders correctly, expand/collapse works

### ReceiptsList (Field Worker View)
- [ ] Navigate to time-tracker receipts — receipts load
- [ ] Add a receipt — list updates
- [ ] Edit a receipt — list updates after save
- [ ] Delete a receipt — list updates
- [ ] Bulk delete — list updates
- [ ] Reassign receipt to project — list updates
- [ ] Filter and sort — work correctly

### ProjectReceiptsView
- [ ] Open project detail → Receipts tab — receipts load for that project
- [ ] Delete a receipt — list updates
- [ ] Preview a receipt — modal opens with correct image
- [ ] Real-time: another user adds a receipt — appears without refresh

### Performance Checks
- [ ] First load: receipts page loads within 1-2 seconds
- [ ] Return navigation: receipts page shows cached data instantly (<100ms)
- [ ] Payees/projects dropdown: populated from cache, not re-fetched
- [ ] Network tab: no duplicate requests on mount
- [ ] Network tab: real-time update triggers single targeted refetch, not multiple

### Type Safety
- [ ] `npm run type-check` passes with zero errors
- [ ] No new TypeScript `any` types introduced
- [ ] `UnifiedReceipt` interface unchanged

---

## Reference: Established Patterns to Follow

### Pattern Source: `src/hooks/useBidNotes.ts`
- `useQuery` with `queryKey` and `queryFn`
- `enabled: !!id` guard
- Real-time via `queryClient.invalidateQueries({ queryKey })`
- Cleanup with `supabase.removeChannel(channel)`

### Pattern Source: `src/hooks/useCompanySettings.ts`
- `staleTime: 1000 * 60 * 30` for rarely-changing data
- Clean `useQuery` return

### Pattern Source: `src/hooks/useProjectMedia.ts`
- `useQuery` with options parameter
- Real-time subscription in `useEffect`
- `queryClient.invalidateQueries` on channel event

---

## Execution Order

1. **Phase 1 first** — `useReceiptsData.ts` is the foundation
2. **Phase 2** — Verify (likely no code changes needed) `useReceiptActions.ts` and `useReceiptBulkActions.ts`
3. **Phase 3** — `ReceiptsList.tsx` — independent component, can be done in parallel with Phase 4
4. **Phase 4** — `ProjectReceiptsView.tsx` — minor enhancement

Each phase can be committed and tested independently. If any phase causes issues, it can be reverted without affecting the others (except Phase 2-4 depend on Phase 1's `receiptQueryKeys` export).

---

## Dependencies

No new packages required. `@tanstack/react-query` is already installed and used throughout the codebase (see `package.json`). The `QueryClient` provider is already configured at the app root.
