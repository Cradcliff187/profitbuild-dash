import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Check, LinkIcon, Plus, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
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
import {
  useEmployeesAudit,
  useCreateLinkedPayee,
  useLinkExistingPayee,
  useReactivatePayee,
  useDeactivatePayee,
  type EmployeeAuditRow,
  type LinkageStatus,
} from '@/hooks/useEmployeesAudit';

const STATUS_META: Record<LinkageStatus, { label: string; variant: 'secondary' | 'destructive' | 'outline' | 'default'; description: string }> = {
  OK:                 { label: 'Active',                 variant: 'secondary',   description: 'Employee is set up and active' },
  NO_PAYEE:           { label: 'Time tracking missing',  variant: 'outline',     description: 'Employee record needed for field workers to log time; optional for everyone else' },
  PAYEE_NOT_LINKED:   { label: 'Unlinked record',        variant: 'destructive', description: 'An employee record with this email exists but is not attached to this user' },
  PAYEE_INACTIVE:     { label: 'Retired',                variant: 'outline',     description: 'Employee record exists but is retired' },
  OTHER:              { label: 'Other',                  variant: 'outline',     description: 'Unclassified' },
};

// Only field workers MUST have a payee (they log labor → expenses need payee_id).
// Admin/manager without a payee is a valid, common state — they don't do labor and
// don't need accounting plumbing unless they become a project owner later.
function needsAttention(row: EmployeeAuditRow): boolean {
  if (row.linkage_status === 'PAYEE_NOT_LINKED') return true;
  if (row.linkage_status === 'PAYEE_INACTIVE') return true;
  if (row.linkage_status === 'NO_PAYEE') {
    return (row.roles ?? []).includes('field_worker');
  }
  return false;
}

export function EmployeeAuditSection() {
  const { data: rows, isLoading, error } = useEmployeesAudit();
  const createMutation = useCreateLinkedPayee();
  const linkMutation = useLinkExistingPayee();
  const reactivateMutation = useReactivatePayee();
  const deactivateMutation = useDeactivatePayee();
  const [showOthers, setShowOthers] = useState(false);
  const [confirmReactivate, setConfirmReactivate] = useState<EmployeeAuditRow | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<EmployeeAuditRow | null>(null);

  const { attention, others } = useMemo(() => {
    const list = rows ?? [];
    return {
      attention: list.filter(needsAttention),
      // Everyone else — OK rows, plus admin/manager with no payee (valid, not a problem)
      others: list.filter((r) => !needsAttention(r)),
    };
  }, [rows]);

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-3 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4 border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Accounting Linkage unavailable
          </CardTitle>
          <CardDescription className="text-xs">
            {error instanceof Error ? error.message : 'Unknown error'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isBusy = createMutation.isPending || linkMutation.isPending || reactivateMutation.isPending || deactivateMutation.isPending;

  const renderRow = (row: EmployeeAuditRow) => {
    const meta = STATUS_META[row.linkage_status];
    const isFieldWorker = (row.roles ?? []).includes('field_worker');
    return (
      <TableRow key={row.user_id}>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {row.full_name || row.email.split('@')[0]}
            </span>
            <span className="text-xs text-muted-foreground">{row.email}</span>
          </div>
        </TableCell>
        <TableCell>
          {(row.roles ?? []).length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(row.roles ?? []).map((r) => (
                <Badge key={r} variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {r.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          )}
        </TableCell>
        <TableCell>
          <Badge variant={meta.variant} className="h-5 px-1.5 text-[10px]" title={meta.description}>
            {meta.label}
          </Badge>
          {row.linkage_status === 'NO_PAYEE' && !isFieldWorker && (
            <div className="text-[10px] text-muted-foreground mt-0.5">optional for this role</div>
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {row.payee_name ?? <span className="italic">—</span>}
          {row.provides_labor === true && row.payee_name && (
            <Badge variant="outline" className="ml-2 h-4 px-1 text-[9px]">logs time</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {row.linkage_status === 'NO_PAYEE' && isFieldWorker && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isBusy}
                onClick={() => createMutation.mutate(row)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Enable time tracking
              </Button>
            )}
            {row.linkage_status === 'NO_PAYEE' && !isFieldWorker && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                disabled={isBusy}
                onClick={() => createMutation.mutate(row)}
                title="Optional — only needed if you plan to assign them as a project owner or attribute an expense to them"
              >
                <Plus className="h-3 w-3 mr-1" />
                Set up anyway
              </Button>
            )}
            {row.linkage_status === 'PAYEE_NOT_LINKED' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isBusy}
                  onClick={() => linkMutation.mutate(row)}
                >
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Link to this user
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  disabled={isBusy}
                  onClick={() => setConfirmDeactivate(row)}
                  title="Retire this record if it shouldn't be used"
                >
                  Retire
                </Button>
              </>
            )}
            {row.linkage_status === 'PAYEE_INACTIVE' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isBusy}
                onClick={() => setConfirmReactivate(row)}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restore
              </Button>
            )}
            {row.linkage_status === 'OK' && (
              <span className="text-xs text-muted-foreground inline-flex items-center">
                <Check className="h-3 w-3 mr-1 text-green-600" />
                Active
              </span>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Employees
            {attention.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {attention.length} need{attention.length === 1 ? 's' : ''} attention
              </Badge>
            )}
            {attention.length === 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                All set up
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Field workers need an employee record to log time. Admins and managers only need one if they'll own a project or have an expense attributed to them — otherwise it's optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {attention.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              <Check className="h-5 w-5 mx-auto mb-2 text-green-600" />
              No setup issues. {others.length} user{others.length === 1 ? '' : 's'} total.
            </div>
          ) : (
            <div className="border-t overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Employee record</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{attention.map(renderRow)}</TableBody>
              </Table>
            </div>
          )}

          {others.length > 0 && (
            <div className="border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOthers((v) => !v)}
                className="w-full justify-start text-xs h-8 px-4 text-muted-foreground"
              >
                {showOthers ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                {showOthers ? 'Hide' : 'Show'} {others.length} other user{others.length === 1 ? '' : 's'}
              </Button>
              {showOthers && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>{others.map(renderRow)}</TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmReactivate !== null}
        onOpenChange={(open) => !open && setConfirmReactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore employee record?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores <span className="font-medium">{confirmReactivate?.payee_name}</span>. They'll reappear in @mentions and (if they log time) in the time-tracker worker picker.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmReactivate?.payee_id) {
                  reactivateMutation.mutate(confirmReactivate.payee_id);
                }
                setConfirmReactivate(null);
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDeactivate !== null}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire employee record?</AlertDialogTitle>
            <AlertDialogDescription>
              This retires <span className="font-medium">{confirmDeactivate?.payee_name}</span>. The user's login and role are unaffected — only this record is marked retired. Past expenses and contracts that reference it stay intact. Use this when the record is a duplicate, legacy placeholder, or otherwise shouldn't be used going forward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeactivate?.payee_id) {
                  deactivateMutation.mutate(confirmDeactivate.payee_id);
                }
                setConfirmDeactivate(null);
              }}
            >
              Retire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
