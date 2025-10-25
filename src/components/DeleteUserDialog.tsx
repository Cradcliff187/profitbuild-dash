import { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, ShieldBan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AppRole } from '@/contexts/RoleContext';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string;
    roles: AppRole[];
  } | null;
  onSuccess: () => void;
}

export function DeleteUserDialog({ open, onOpenChange, user, onSuccess }: DeleteUserDialogProps) {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasFinancialRecords, setHasFinancialRecords] = useState(false);
  const [expenseCount, setExpenseCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  // Check for financial records when user changes
  useEffect(() => {
    const checkFinancialRecords = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const [expensesResult, receiptsResult] = await Promise.all([
          supabase
            .from('expenses')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('receipts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
        ]);

        const expenses = expensesResult.count || 0;
        const receipts = receiptsResult.count || 0;
        
        setExpenseCount(expenses);
        setReceiptCount(receipts);
        setHasFinancialRecords(expenses > 0 || receipts > 0);
      } catch (error) {
        console.error('Error checking financial records:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      checkFinancialRecords();
    }
  }, [user, open]);

  const handleDeactivate = async () => {
    if (!user || confirmEmail !== user.email) {
      toast.error('Email confirmation does not match');
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-disable-user', {
        body: { userId: user.id }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('User deactivated successfully');
      onOpenChange(false);
      setConfirmEmail('');
      onSuccess();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = async (force = false) => {
    if (!user || confirmEmail !== user.email) {
      toast.error('Email confirmation does not match');
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: user.id, forceDelete: force }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('User deleted successfully');
      onOpenChange(false);
      setConfirmEmail('');
      setForceDelete(false);
      onSuccess();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setConfirmEmail('');
        setForceDelete(false);
      }
    }
  };

  if (!user) return null;

  const emailMatches = confirmEmail === user.email;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            {hasFinancialRecords ? (
              <>
                <ShieldBan className="h-5 w-5" />
                Deactivate User Account
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5" />
                Delete User Account
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className={`rounded-lg border p-3 ${
                  hasFinancialRecords 
                    ? 'bg-yellow-500/10 border-yellow-500/20' 
                    : 'bg-destructive/10 border-destructive/20'
                }`}>
                  <p className={`text-sm font-medium mb-2 ${
                    hasFinancialRecords ? 'text-yellow-700 dark:text-yellow-500' : 'text-destructive'
                  }`}>
                    {hasFinancialRecords ? '🔒 User Has Financial Records' : '⚠️ This action cannot be undone!'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasFinancialRecords 
                      ? `This user has ${expenseCount} expense record(s) and ${receiptCount} receipt(s). Their account will be deactivated to preserve financial data. They will not be able to log in.`
                      : 'This will permanently delete the user account and all associated data.'
                    }
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">User:</span> {user.full_name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {user.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Roles:</span>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.map(role => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground border-t pt-3">
                  <p className="font-medium text-foreground">
                    {hasFinancialRecords ? 'What will happen:' : 'The following will be permanently deleted:'}
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    {hasFinancialRecords ? (
                      <>
                        <li>User login access will be disabled</li>
                        <li>Profile marked as inactive</li>
                        <li>Financial records will be preserved</li>
                        <li>Time entries and expenses remain visible</li>
                        <li>Can be reactivated by admin if needed</li>
                      </>
                    ) : (
                      <>
                        <li>User authentication and login access</li>
                        <li>Profile information</li>
                        <li>All role assignments</li>
                        <li>Project assignments</li>
                        <li>All related audit logs</li>
                      </>
                    )}
                  </ul>
                </div>

                {hasFinancialRecords && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="force-delete"
                        checked={forceDelete}
                        onCheckedChange={(checked) => setForceDelete(checked === true)}
                        disabled={isDeleting}
                      />
                      <div className="space-y-1 flex-1">
                        <Label
                          htmlFor="force-delete"
                          className="text-sm font-medium text-destructive cursor-pointer leading-none"
                        >
                          ⚠️ Force permanent deletion
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          This will permanently delete the user AND all their financial records ({expenseCount} expenses, {receiptCount} receipts). This action cannot be undone and may affect financial reporting.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label htmlFor="confirm-email" className="text-sm font-medium">
                    Type the user's email to confirm:
                  </Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    placeholder={user.email}
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    disabled={isDeleting}
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting || isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={hasFinancialRecords && !forceDelete ? 'default' : 'destructive'}
            onClick={() => {
              if (hasFinancialRecords && !forceDelete) {
                handleDeactivate();
              } else {
                handleDelete(forceDelete);
              }
            }}
            disabled={!emailMatches || isDeleting || isLoading}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {hasFinancialRecords && !forceDelete ? 'Deactivating...' : 'Deleting...'}
              </>
            ) : (
              hasFinancialRecords && !forceDelete ? 'Deactivate User' : 'Permanently Delete User'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
