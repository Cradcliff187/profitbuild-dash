import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { type AppRole } from '@/contexts/RoleContext';
import { useQueryClient } from '@tanstack/react-query';

type WorkerType = 'internal' | 'subcontractor';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string | null;
    sms_notifications_enabled?: boolean | null;
  };
  onSuccess: () => void;
}

const ALL_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin',        label: 'Admin',        description: 'Full access — every page, every action.' },
  { value: 'manager',      label: 'Manager',      description: 'Projects + financials, no role management.' },
  { value: 'field_worker', label: 'Field Worker', description: 'Time tracker, training, mentions. No financials.' },
];

export default function EditProfileModal({ open, onOpenChange, user, onSuccess }: EditProfileModalProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  // Profile section
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [canBeMentioned, setCanBeMentioned] = useState(true);

  // Roles section
  const [roles, setRoles] = useState<Set<AppRole>>(new Set());
  const [initialRoles, setInitialRoles] = useState<Set<AppRole>>(new Set());

  // Payee / time-tracking section
  const [hasExistingPayee, setHasExistingPayee] = useState(false);
  const [existingPayeeId, setExistingPayeeId] = useState<string | null>(null);
  const [workerType, setWorkerType] = useState<WorkerType>('internal');
  const [initialWorkerType, setInitialWorkerType] = useState<WorkerType>('internal');
  const [hourlyRate, setHourlyRate] = useState<string>('75');
  const [initialHourlyRate, setInitialHourlyRate] = useState<string>('75');

  const isFieldWorker = roles.has('field_worker');

  // Hydrate on open
  useEffect(() => {
    if (!open) return;
    setHydrating(true);

    async function hydrate() {
      try {
        const [profileRes, rolesRes, payeeRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('phone, sms_notifications_enabled, can_be_mentioned')
            .eq('id', user.id)
            .single(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id),
          // Look for the user's linked payee — either internal or labor sub
          supabase
            .from('payees')
            .select('id, is_internal, payee_type, hourly_rate, provides_labor')
            .eq('user_id', user.id)
            .order('is_internal', { ascending: false })
            .limit(1),
        ]);

        setFullName(user.full_name || '');

        if (profileRes.data) {
          setPhone(profileRes.data.phone || '');
          setSmsEnabled(profileRes.data.sms_notifications_enabled ?? true);
          setCanBeMentioned(profileRes.data.can_be_mentioned ?? true);
        }

        const fetchedRoles = new Set((rolesRes.data || []).map(r => r.role as AppRole));
        setRoles(fetchedRoles);
        setInitialRoles(new Set(fetchedRoles));

        const payee = payeeRes.data?.[0];
        if (payee) {
          setHasExistingPayee(true);
          setExistingPayeeId(payee.id);
          const wt: WorkerType =
            payee.is_internal ? 'internal' :
            (payee.payee_type === 'subcontractor' && payee.provides_labor) ? 'subcontractor' :
            'internal';
          setWorkerType(wt);
          setInitialWorkerType(wt);
          const rateStr = payee.hourly_rate != null ? String(payee.hourly_rate) : '';
          setHourlyRate(rateStr || '75');
          setInitialHourlyRate(rateStr || '75');
        } else {
          setHasExistingPayee(false);
          setExistingPayeeId(null);
          setWorkerType('internal');
          setInitialWorkerType('internal');
          setHourlyRate('75');
          setInitialHourlyRate('75');
        }
      } catch (err) {
        console.error('Failed to hydrate Edit User sheet:', err);
        toast.error('Failed to load user details');
      } finally {
        setHydrating(false);
      }
    }
    hydrate();
  }, [open, user.id, user.full_name]);

  const toggleRole = (role: AppRole, on: boolean) => {
    setRoles(prev => {
      const next = new Set(prev);
      if (on) next.add(role);
      else next.delete(role);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1) Profile fields
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          sms_notifications_enabled: smsEnabled,
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      // 2) can_be_mentioned (admin-only RPC; needs separate write so RLS stays clean)
      const { error: mentionError } = await supabase.rpc('set_user_can_be_mentioned', {
        target_user_id: user.id,
        value: canBeMentioned,
      });
      if (mentionError) throw mentionError;

      // 3) Role diff
      const rolesToAdd = [...roles].filter(r => !initialRoles.has(r));
      const rolesToRemove = [...initialRoles].filter(r => !roles.has(r));

      if (rolesToAdd.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .insert(rolesToAdd.map(role => ({ user_id: user.id, role })));
        if (error) throw error;
      }
      for (const role of rolesToRemove) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', role);
        if (error) throw error;
      }

      // 4) Payee (only relevant when field_worker is part of the final role set)
      if (isFieldWorker) {
        const isInternal = workerType === 'internal';
        const rate = isInternal && hourlyRate.trim() ? Number(hourlyRate) : null;
        if (isInternal && (rate === null || Number.isNaN(rate) || rate < 0)) {
          throw new Error('Hourly rate must be a non-negative number for W2 employees.');
        }

        if (!hasExistingPayee) {
          // Create a brand-new linked payee.
          const { error } = await supabase.from('payees').insert({
            user_id: user.id,
            payee_name: fullName.trim() || user.email.split('@')[0],
            email: user.email,
            is_internal: isInternal,
            is_active: true,
            provides_labor: true,
            payee_type: isInternal ? 'internal_labor' : 'subcontractor',
            hourly_rate: isInternal ? (rate ?? 75) : null,
          });
          if (error && (error as { code?: string }).code !== '23505') throw error;
        } else {
          // Update only if shape changed.
          const typeChanged = workerType !== initialWorkerType;
          const rateChanged = hourlyRate !== initialHourlyRate;
          if (typeChanged || rateChanged) {
            const { error } = await supabase
              .from('payees')
              .update({
                is_internal: isInternal,
                payee_type: isInternal ? 'internal_labor' : 'subcontractor',
                provides_labor: true,
                hourly_rate: isInternal ? (rate ?? 75) : null,
              })
              .eq('id', existingPayeeId!);
            if (error) throw error;
          }
        }
      }

      // 5) Invalidate caches the various surfaces depend on
      queryClient.invalidateQueries({ queryKey: ['employees-audit'] });
      queryClient.invalidateQueries({ queryKey: ['mentionable-users'] });
      queryClient.invalidateQueries({ queryKey: ['payees'] });

      toast.success('User updated', { description: `${fullName.trim() || user.email} saved.` });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const payeeShapeChanged =
    hasExistingPayee && (workerType !== initialWorkerType || hourlyRate !== initialHourlyRate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col p-0">
        <SheetHeader className="space-y-1 px-6 pt-6 pb-4 border-b">
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>
            Update profile, roles, and time-tracking setup.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {hydrating ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading user details...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" id="edit-user-form">
              {/* ── Profile ─────────────────────────────── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Profile</h3>
                  <p className="text-xs text-muted-foreground">Identity and how they receive notifications.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (read-only)</Label>
                  <Input id="email" value={user.email} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Phone (for SMS)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for clock-in reminders and team notifications.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="sms-enabled"
                    checked={smsEnabled}
                    onCheckedChange={(c) => setSmsEnabled(c === true)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="sms-enabled" className="text-sm cursor-pointer">
                      Receive SMS notifications
                    </label>
                    <p className="text-xs text-muted-foreground">Clock-in reminders, approvals, etc.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="can-be-mentioned"
                    checked={canBeMentioned}
                    onCheckedChange={(c) => setCanBeMentioned(c === true)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="can-be-mentioned" className="text-sm cursor-pointer">
                      Can be @mentioned
                    </label>
                    <p className="text-xs text-muted-foreground">Appears in @mention autocomplete in project notes.</p>
                  </div>
                </div>
              </section>

              <Separator />

              {/* ── Roles ─────────────────────────────── */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Roles</h3>
                  <p className="text-xs text-muted-foreground">Controls which pages this user can access.</p>
                </div>

                <div className="space-y-3">
                  {ALL_ROLES.map(({ value, label, description }) => (
                    <div key={value} className="flex items-start gap-3 rounded-md border p-3">
                      <Checkbox
                        id={`role-${value}`}
                        checked={roles.has(value)}
                        onCheckedChange={(c) => toggleRole(value, c === true)}
                        disabled={loading}
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5 flex-1">
                        <label htmlFor={`role-${value}`} className="text-sm font-medium cursor-pointer">
                          {label}
                        </label>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {roles.size === 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>This user has no role and won&apos;t be able to access the app. Add at least one role.</span>
                  </div>
                )}
              </section>

              {/* ── Expense & Time Tracking ─────────────────────────────── */}
              {isFieldWorker && (
                <>
                  <Separator />
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">Expense &amp; Time Tracking</h3>
                      <p className="text-xs text-muted-foreground">
                        Required for field workers — determines how their clocked time is categorized.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="workerType">Worker Type</Label>
                      <Select
                        value={workerType}
                        onValueChange={(v) => setWorkerType(v as WorkerType)}
                        disabled={loading}
                      >
                        <SelectTrigger id="workerType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal Employee (W2)</SelectItem>
                          <SelectItem value="subcontractor">Subcontractor with hourly time tracking</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {workerType === 'internal'
                          ? 'Their clocked time × rate flows into the project as labor cost.'
                          : 'Their clocked time is captured for visibility only — actual cost flows through normal vendor bills.'}
                      </p>
                    </div>

                    {workerType === 'internal' && (
                      <div className="space-y-2">
                        <Label htmlFor="hourlyRate">Hourly Rate</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            id="hourlyRate"
                            type="number"
                            min={0}
                            step={0.01}
                            value={hourlyRate}
                            onChange={(e) => setHourlyRate(e.target.value)}
                            disabled={loading}
                            className="max-w-[160px]"
                          />
                          <span className="text-xs text-muted-foreground">/ hr</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Default cost rate used when they clock time. You can override per project later.
                        </p>
                      </div>
                    )}

                    {payeeShapeChanged && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-medium">You&apos;re changing this user&apos;s time-tracking setup.</div>
                          <div>
                            Future time entries will follow the new setup. Past entries keep their original categorization (no rewrite).
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
            </form>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" disabled={loading || hydrating || roles.size === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
