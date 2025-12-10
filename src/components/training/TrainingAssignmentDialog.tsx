import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useTrainingAssignments } from '@/hooks/useTrainingAssignments';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Loader2, Users, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AppRole } from '@/types/training';

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  roles: AppRole[];
}

interface TrainingAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainingContentId: string;
  onSuccess: () => void;
}

export const TrainingAssignmentDialog = ({
  open,
  onOpenChange,
  trainingContentId,
  onSuccess,
}: TrainingAssignmentDialogProps) => {
  const { createAssignments, sendNotifications } = useTrainingAssignments();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState(0);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users with roles when dialog opens
  useEffect(() => {
    if (open) {
      const loadUsers = async () => {
        setIsLoading(true);
        try {
          // Fetch active users
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('is_active', true)
            .order('full_name');

          if (profilesError) throw profilesError;

          // Fetch user roles
          const { data: userRoles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role');

          if (rolesError) throw rolesError;

          // Combine users with their roles
          const usersWithRoles: User[] = (profiles || []).map(profile => ({
            ...profile,
            roles: (userRoles || [])
              .filter(ur => ur.user_id === profile.id)
              .map(ur => ur.role as AppRole),
          }));

          setUsers(usersWithRoles);
        } catch (error) {
          console.error('Error loading users:', error);
          toast.error('Failed to load users');
        } finally {
          setIsLoading(false);
        }
      };

      loadUsers();
    } else {
      // Reset state when dialog closes
      setSelectedUserIds(new Set());
      setUserSearchQuery('');
      setDueDate(undefined);
      setPriority(0);
      setCustomMessage('');
    }
  }, [open]);

  // Filter users based on search query
  const filteredUsers = users.filter(user =>
    !userSearchQuery ||
    user.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Handlers
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSelectByRole = (role: AppRole) => {
    const usersWithRole = filteredUsers.filter(u => u.roles.includes(role));
    const userIdsWithRole = new Set(usersWithRole.map(u => u.id));
    
    // If all users with this role are already selected, deselect them
    // Otherwise, select all users with this role
    const allSelected = usersWithRole.every(u => selectedUserIds.has(u.id));
    
    if (allSelected) {
      setSelectedUserIds(prev => {
        const next = new Set(prev);
        userIdsWithRole.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedUserIds(prev => {
        const next = new Set(prev);
        userIdsWithRole.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleAssign = async (sendNotification: boolean) => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setIsSubmitting(true);

    try {
      const userIds = Array.from(selectedUserIds);
      
      // Create assignments
      const success = await createAssignments(
        trainingContentId,
        userIds,
        {
          due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
          priority,
          notes: customMessage || undefined,
        }
      );

      if (!success) {
        setIsSubmitting(false);
        return;
      }

      // Send notifications if requested
      if (sendNotification) {
        await sendNotifications({
          training_content_id: trainingContentId,
          user_ids: userIds,
          notification_type: 'assignment',
          custom_message: customMessage || undefined,
        });
      }

      // Success - close dialog and call callback
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning training:', error);
      toast.error('Failed to assign training');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleCount = (role: AppRole) => {
    return filteredUsers.filter(u => u.roles.includes(role)).length;
  };

  const getRoleLabel = (role: AppRole) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Training</DialogTitle>
          <DialogDescription>
            Select users to assign this training content to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Search */}
          <div className="space-y-2">
            <Label>Search Users</Label>
            <Input
              placeholder="Search by name or email..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Quick Select Buttons */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs"
              >
                <Users className="h-3 w-3 mr-1.5" />
                {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0
                  ? 'Deselect All'
                  : 'All Users'}
              </Button>
              {(['admin', 'manager', 'field_worker'] as AppRole[]).map(role => {
                const count = getRoleCount(role);
                const selectedCount = filteredUsers
                  .filter(u => u.roles.includes(role) && selectedUserIds.has(u.id))
                  .length;
                const allSelected = count > 0 && selectedCount === count;
                
                return (
                  <Button
                    key={role}
                    type="button"
                    variant={allSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSelectByRole(role)}
                    className="h-8 text-xs"
                    disabled={count === 0}
                  >
                    <UserCheck className="h-3 w-3 mr-1.5" />
                    {getRoleLabel(role)} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Users</Label>
              {selectedUserIds.size > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {userSearchQuery ? 'No users found' : 'No active users'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => toggleUserSelection(user.id)}
                    >
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{user.full_name || 'No name'}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        {user.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.roles.map(role => (
                              <span
                                key={role}
                                className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded"
                              >
                                {getRoleLabel(role)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">Higher numbers = higher priority</p>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="customMessage">Custom Message (Optional)</Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[80px]"
              placeholder="Add a custom message to include in the notification email..."
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {customMessage.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => handleAssign(false)}
              disabled={selectedUserIds.size === 0 || isSubmitting}
              variant="outline"
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign'
              )}
            </Button>
            <Button
              onClick={() => handleAssign(true)}
              disabled={selectedUserIds.size === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign & Notify'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

