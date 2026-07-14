import { useMemo, useState } from 'react';
import { useRoles } from '@/contexts/RoleContext';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Flag, History, Plus, ShieldAlert, Trash2, Users } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  useFeatureFlags,
  useFeatureFlagOverrides,
  useFeatureFlagAudit,
  useFlagUserDirectory,
  useSetGlobalFlag,
  useUpsertFlagOverride,
  useRemoveFlagOverride,
  type FlagUserRow,
} from '@/hooks/useFeatureFlagAdmin';

/** Render a nullable boolean audit state as On / Off / — (no prior state). */
const fmtState = (value: boolean | null) => (value === null ? '—' : value ? 'On' : 'Off');

const displayName = (u: FlagUserRow) =>
  u.full_name?.trim() || u.email || u.id.slice(0, 8);

export default function FeatureFlagsSettings() {
  const { isAdmin, loading: rolesLoading } = useRoles();

  const flagsQuery = useFeatureFlags();
  const overridesQuery = useFeatureFlagOverrides();
  const auditQuery = useFeatureFlagAudit();
  const usersQuery = useFlagUserDirectory();

  const setGlobalFlag = useSetGlobalFlag();
  const upsertOverride = useUpsertFlagOverride();
  const removeOverride = useRemoveFlagOverride();

  // Section 2 state — which flag's overrides are shown, and the Add dialog.
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newUserId, setNewUserId] = useState<string>('');
  const [newEnabled, setNewEnabled] = useState(true);

  const flags = flagsQuery.data ?? [];
  const overrides = overridesQuery.data ?? [];
  const users = usersQuery.data ?? [];

  // Derive (no effect needed): explicit selection wins, else first flag.
  const activeFlagId = selectedFlagId ?? flags[0]?.id ?? null;
  const activeFlag = flags.find((f) => f.id === activeFlagId) ?? null;
  const activeOverrides = useMemo(
    () => overrides.filter((o) => o.flag_id === activeFlagId),
    [overrides, activeFlagId]
  );

  const userById = useMemo(() => {
    const map = new Map<string, FlagUserRow>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const nameFor = (userId: string | null) => {
    if (!userId) return 'System';
    const u = userById.get(userId);
    return u ? displayName(u) : `${userId.slice(0, 8)}…`;
  };

  // Users without an override on the active flag, actives first, then by name.
  const availableUsers = useMemo(() => {
    const taken = new Set(activeOverrides.map((o) => o.user_id));
    return users
      .filter((u) => !taken.has(u.id))
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return displayName(a).localeCompare(displayName(b));
      });
  }, [users, activeOverrides]);

  const openAddDialog = () => {
    setNewUserId('');
    setNewEnabled(true);
    setAddOpen(true);
  };

  const handleAddOverride = () => {
    if (!activeFlagId || !newUserId) return;
    upsertOverride.mutate(
      { flagId: activeFlagId, userId: newUserId, enabled: newEnabled },
      { onSuccess: () => setAddOpen(false) }
    );
  };

  if (rolesLoading) {
    return (
      <MobilePageWrapper>
        <PageHeader icon={Flag} title="Feature Flags" description="Global and per-user feature toggles" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </MobilePageWrapper>
    );
  }

  if (!isAdmin) {
    return (
      <MobilePageWrapper>
        <PageHeader icon={Flag} title="Feature Flags" description="Global and per-user feature toggles" />
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Admins only</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Feature flag management is restricted to administrators. Ask an admin if you need a
              feature turned on for your account.
            </p>
          </CardContent>
        </Card>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      <PageHeader
        icon={Flag}
        title="Feature Flags"
        description="Global toggles with per-user overrides. An override always wins over the global setting."
      />

      <div className="grid gap-6">
        {/* ---------- Section 1: Global flags ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Flag className="h-5 w-5" />
              <span>Global flags</span>
            </CardTitle>
            <CardDescription>
              The default state for everyone without a per-user override.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flagsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : flags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No feature flags defined.</p>
            ) : (
              <div className="divide-y">
                {flags.map((flag) => (
                  <div key={flag.id} className="flex items-start justify-between gap-4 py-3 min-h-[44px]">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                          {flag.flag_name}
                        </code>
                        <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                          {flag.enabled ? 'On' : 'Off'}
                        </Badge>
                      </div>
                      {flag.description && (
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                      )}
                      {flag.updated_at && (
                        <p className="text-xs text-muted-foreground">
                          Updated {formatDistanceToNow(parseISO(flag.updated_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <Switch
                      className="mt-1 shrink-0"
                      checked={!!flag.enabled}
                      disabled={setGlobalFlag.isPending}
                      onCheckedChange={(checked) =>
                        setGlobalFlag.mutate({
                          flagId: flag.id,
                          flagName: flag.flag_name,
                          enabled: checked,
                        })
                      }
                      aria-label={`Toggle ${flag.flag_name} globally`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---------- Section 2: Per-user overrides ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Per-user overrides</span>
            </CardTitle>
            <CardDescription>
              Force a flag on or off for specific users regardless of the global setting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {flags.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Create a feature flag first — overrides attach to a flag.
              </p>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="flag-selector">Flag</Label>
                    <Select
                      value={activeFlagId ?? undefined}
                      onValueChange={(value) => setSelectedFlagId(value)}
                    >
                      <SelectTrigger id="flag-selector" className="min-h-[44px]">
                        <SelectValue placeholder="Select a flag" />
                      </SelectTrigger>
                      <SelectContent>
                        {flags.map((flag) => (
                          <SelectItem key={flag.id} value={flag.id} className="min-h-[44px]">
                            {flag.flag_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={openAddDialog}
                    disabled={!activeFlagId || availableUsers.length === 0}
                    className="min-h-[44px]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add override
                  </Button>
                </div>

                {overridesQuery.isLoading || usersQuery.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : activeOverrides.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No overrides for{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {activeFlag?.flag_name}
                    </code>{' '}
                    — everyone follows the global setting ({activeFlag?.enabled ? 'On' : 'Off'}).
                  </p>
                ) : (
                  <div className="divide-y rounded-md border">
                    {activeOverrides.map((override) => {
                      const overrideUser = userById.get(override.user_id);
                      return (
                        <div
                          key={override.id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 min-h-[52px]"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {nameFor(override.user_id)}
                              {overrideUser && overrideUser.is_active === false && (
                                <span className="text-muted-foreground font-normal"> (inactive)</span>
                              )}
                            </p>
                            {overrideUser?.email && overrideUser.full_name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {overrideUser.email}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant={override.enabled ? 'default' : 'secondary'}>
                              {override.enabled ? 'On' : 'Off'}
                            </Badge>
                            <Switch
                              checked={override.enabled}
                              disabled={upsertOverride.isPending}
                              onCheckedChange={(checked) =>
                                upsertOverride.mutate({
                                  flagId: override.flag_id,
                                  userId: override.user_id,
                                  enabled: checked,
                                })
                              }
                              aria-label={`Toggle override for ${nameFor(override.user_id)}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 text-muted-foreground hover:text-destructive"
                              disabled={removeOverride.isPending}
                              onClick={() => removeOverride.mutate(override.id)}
                              aria-label={`Remove override for ${nameFor(override.user_id)}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ---------- Section 3: Recent changes (trigger-written audit) ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Recent changes</span>
            </CardTitle>
            <CardDescription>
              Last 50 flag and override changes, recorded automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (auditQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No changes recorded yet.</p>
            ) : (
              <div className="divide-y">
                {(auditQuery.data ?? []).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5 text-sm"
                  >
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {entry.flag_name}
                    </code>
                    <Badge variant={entry.target_user_id ? 'secondary' : 'outline'}>
                      {entry.target_user_id ? nameFor(entry.target_user_id) : 'Global'}
                    </Badge>
                    <span className="text-muted-foreground">
                      {fmtState(entry.old_enabled)} → {fmtState(entry.new_enabled)}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                      {nameFor(entry.changed_by)} ·{' '}
                      {formatDistanceToNow(parseISO(entry.changed_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------- Add override dialog ---------- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add override</DialogTitle>
            <DialogDescription>
              {activeFlag ? (
                <>
                  Force{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {activeFlag.flag_name}
                  </code>{' '}
                  on or off for one user. The override wins over the global setting (
                  {activeFlag.enabled ? 'On' : 'Off'}).
                </>
              ) : (
                'Force a flag on or off for one user.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="override-user">User</Label>
              <Select value={newUserId || undefined} onValueChange={setNewUserId}>
                <SelectTrigger id="override-user" className="min-h-[44px]">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="min-h-[44px]">
                      {displayName(u)}
                      {u.is_active === false ? ' (inactive)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between min-h-[44px]">
              <div className="space-y-0.5 pr-4">
                <Label htmlFor="override-enabled">Enabled for this user</Label>
                <p className="text-xs text-muted-foreground">
                  Off creates a force-disable override.
                </p>
              </div>
              <Switch id="override-enabled" checked={newEnabled} onCheckedChange={setNewEnabled} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-[44px]" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              className="min-h-[44px]"
              onClick={handleAddOverride}
              disabled={!newUserId || upsertOverride.isPending}
            >
              {upsertOverride.isPending ? 'Saving…' : 'Add override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobilePageWrapper>
  );
}
