import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles, AppRole } from '@/contexts/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Users, UserPlus, KeyRound, AlertCircle, Lock } from 'lucide-react';
import CreateUserModal from '@/components/CreateUserModal';
import ResetPasswordModal from '@/components/ResetPasswordModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  must_change_password: boolean | null;
  failed_login_attempts: number | null;
  account_locked_until: string | null;
}

interface UserWithRoles extends Profile {
  roles: AppRole[];
}

export default function RoleManagement() {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only administrators can manage user roles',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [isAdmin, rolesLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, must_change_password, failed_login_attempts, account_locked_until')
        .order('email');

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        ...profile,
        roles: (userRoles || [])
          .filter(ur => ur.user_id === profile.id)
          .map(ur => ur.role as AppRole),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openResetPassword = (user: UserWithRoles) => {
    setSelectedUser(user);
    setResetPasswordOpen(true);
  };

  const addRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;

      toast({
        title: 'Role Added',
        description: `Successfully assigned ${role} role`,
      });
      
      await loadUsers();
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add role',
        variant: 'destructive',
      });
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Role Removed',
        description: `Successfully removed ${role} role`,
      });
      
      await loadUsers();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove role',
        variant: 'destructive',
      });
    }
  };

  if (rolesLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-3 py-4 max-w-7xl">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Role Management</h1>
          </div>
          <Button onClick={() => setCreateUserOpen(true)} size="sm" className="h-8 text-xs">
            <UserPlus className="h-3 w-3 mr-1.5" />
            Create User
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage user accounts, roles and permissions
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Users & Roles
          </CardTitle>
          <CardDescription className="text-xs">
            Admin: full access | Manager: projects & financials | Field Worker: assigned projects only
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            {users.map(user => {
              const isLocked = user.account_locked_until && new Date(user.account_locked_until) > new Date();
              
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">{user.full_name || 'No name'}</p>
                      {user.must_change_password && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1">
                          <AlertCircle className="h-2.5 w-2.5" />
                          Must Reset
                        </Badge>
                      )}
                      {isLocked && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">{user.email}</p>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">No roles</Badge>
                      ) : (
                        user.roles.map(role => (
                          <Badge key={role} variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
                            {role.replace('_', ' ')}
                            <button
                              onClick={() => removeRole(user.id, role)}
                              className="ml-0.5 hover:text-destructive font-bold"
                            >
                              ×
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Select onValueChange={(value) => addRole(user.id, value as AppRole)}>
                      <SelectTrigger className="h-7 w-[140px] text-xs">
                        <div className="flex items-center gap-1.5">
                          <UserPlus className="h-3 w-3" />
                          <span>Add Role</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {(['admin', 'manager', 'field_worker'] as AppRole[])
                          .filter(role => !user.roles.includes(role))
                          .map(role => (
                            <SelectItem key={role} value={role} className="text-xs">
                              {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openResetPassword(user)} className="text-xs">
                          <KeyRound className="h-3 w-3 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <CreateUserModal
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onUserCreated={loadUsers}
      />

      {selectedUser && (
        <ResetPasswordModal
          open={resetPasswordOpen}
          onOpenChange={setResetPasswordOpen}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
        />
      )}
    </div>
  );
}
