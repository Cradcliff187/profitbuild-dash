import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles, AppRole } from '@/contexts/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Users, UserPlus, KeyRound, Search, X, Trash2 } from 'lucide-react';
import CreateUserModal from '@/components/CreateUserModal';
import ResetPasswordModal from '@/components/ResetPasswordModal';
import EditProfileModal from '@/components/EditProfileModal';
import { DeleteUserDialog } from '@/components/DeleteUserDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, UserCog } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
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
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkRoleOpen, setBulkRoleOpen] = useState(false);

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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
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
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, loadUsers]);

  const openResetPassword = (user: UserWithRoles) => {
    setSelectedUser(user);
    setResetPasswordOpen(true);
  };

  const openEditProfile = (user: UserWithRoles) => {
    setSelectedUser(user);
    setEditProfileOpen(true);
  };

  const openDeleteUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDeleteUserOpen(true);
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

  const bulkAddRole = async (role: AppRole) => {
    const userIds = Array.from(selectedUserIds);
    if (userIds.length === 0) return;

    try {
      const inserts = userIds.map(userId => ({ user_id: userId, role }));
      const { error } = await supabase
        .from('user_roles')
        .insert(inserts);

      if (error) throw error;

      toast({
        title: 'Roles Added',
        description: `Successfully assigned ${role} to ${userIds.length} user(s)`,
      });
      
      setSelectedUserIds(new Set());
      await loadUsers();
    } catch (error: any) {
      console.error('Error adding roles:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add roles',
        variant: 'destructive',
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSkeletonLoader = () => (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-3 w-full" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="px-3 py-2 border-b">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-64 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (rolesLoading || loading) {
    return (
      <div className="container mx-auto px-3 py-4 max-w-7xl">
        <div className="mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-3 w-96" />
        </div>
        {renderSkeletonLoader()}
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
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateUserOpen(true)} size="sm" className="h-8 text-xs">
              <UserPlus className="h-3 w-3 mr-1.5" />
              Create User
              <kbd className="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex text-muted-foreground">
                <span className="text-[10px]">⌘</span>N
              </kbd>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage user accounts, roles and permissions • Press <kbd className="px-1 py-0.5 text-[10px] border rounded">⌘K</kbd> to search
        </p>
      </div>

      {/* Search and Bulk Actions Bar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            id="user-search"
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {selectedUserIds.size > 0 && (
          <div className="flex items-center gap-2 animate-fade-in">
            <Badge variant="secondary" className="h-7 px-2 text-xs">
              {selectedUserIds.size} selected
            </Badge>
            <Select onValueChange={(value) => bulkAddRole(value as AppRole)}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <span>Bulk Add Role</span>
              </SelectTrigger>
              <SelectContent>
                {(['admin', 'manager', 'field_worker'] as AppRole[]).map(role => (
                  <SelectItem key={role} value={role} className="text-xs">
                    {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUserIds(new Set())}
              className="h-7 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Users & Roles
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Admin: full access | Manager: projects & financials | Field Worker: assigned projects only
              </CardDescription>
            </div>
            {filteredUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedUserIds.size === filteredUsers.length}
                  onCheckedChange={toggleSelectAll}
                  className="h-4 w-4"
                />
                <span className="text-xs text-muted-foreground">Select all</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? 'No users found' : 'No users yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'Create your first user to get started'}
              </p>
            </div>
          ) : (
            <div className="border-t">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-muted/50 transition-all ${
                    selectedUserIds.has(user.id) ? 'bg-muted/70' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mr-3">
                    <Checkbox
                      checked={selectedUserIds.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">{user.full_name || 'No name'}</p>
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
                        <DropdownMenuItem onClick={() => openEditProfile(user)} className="text-xs">
                          <UserCog className="h-3 w-3 mr-2" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openResetPassword(user)} className="text-xs">
                          <KeyRound className="h-3 w-3 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeleteUser(user)} 
                          className="text-xs text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserModal
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onUserCreated={loadUsers}
      />

      {selectedUser && (
        <>
          <ResetPasswordModal
            open={resetPasswordOpen}
            onOpenChange={setResetPasswordOpen}
            userId={selectedUser.id}
            userEmail={selectedUser.email}
          />
          <EditProfileModal
            open={editProfileOpen}
            onOpenChange={setEditProfileOpen}
            user={selectedUser}
            onSuccess={loadUsers}
          />
          <DeleteUserDialog
            open={deleteUserOpen}
            onOpenChange={setDeleteUserOpen}
            user={selectedUser}
            onSuccess={loadUsers}
          />
        </>
      )}
    </div>
  );
}
