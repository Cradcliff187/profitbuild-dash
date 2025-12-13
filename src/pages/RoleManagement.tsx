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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Users, UserPlus, KeyRound, Search, X, Trash2, Clock, Mail, Calendar, ChevronDown, Shield } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { MobilePageWrapper } from '@/components/ui/mobile-page-wrapper';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import CreateUserModal from '@/components/CreateUserModal';
import ResetPasswordModal from '@/components/ResetPasswordModal';
import EditProfileModal from '@/components/EditProfileModal';
import { DeleteUserDialog } from '@/components/DeleteUserDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreVertical, UserCog } from 'lucide-react';
import { ActiveTimersTable } from '@/components/role-management/ActiveTimersTable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface Profile {
  id: string;
  email: string;
  full_name: string;
}

interface UserWithRoles extends Profile {
  roles: AppRole[];
  must_change_password?: boolean;
  last_sign_in_at?: string | null;
  confirmed_at?: string | null;
  has_password?: boolean;
  is_active?: boolean;
  deactivated_at?: string | null;
}

export default function RoleManagement() {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only administrators can manage user roles',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [isAdmin, rolesLoading, navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get all user auth status using secure RPC function
      const { data: profiles, error: profilesError } = await supabase
        .rpc('get_user_auth_status');

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

  const toggleCard = (userId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Helper function to determine password status
  const getPasswordStatus = (user: UserWithRoles): {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  } => {
    if (!user.has_password) {
      return { label: 'No Password', variant: 'destructive' };
    }
    if (!user.confirmed_at) {
      return { label: 'Not Confirmed', variant: 'outline', className: 'border-yellow-500 text-yellow-700' };
    }
    if (user.must_change_password) {
      return { label: 'Must Change', variant: 'outline', className: 'border-orange-500 text-orange-700' };
    }
    return { label: 'Active', variant: 'secondary' };
  };

  // Helper function to format last sign-in
  const formatLastSignIn = (lastSignIn: string | null | undefined): string => {
    if (!lastSignIn) return 'Never';
    try {
      return formatDistanceToNow(parseISO(lastSignIn), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  // Helper function to format full timestamp for tooltip
  const formatFullTimestamp = (timestamp: string | null | undefined): string => {
    if (!timestamp) return 'Never signed in';
    try {
      return format(parseISO(timestamp), 'MMM dd, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  // Filter users based on search and active status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === 'active') {
      return matchesSearch && user.is_active !== false;
    } else if (activeFilter === 'inactive') {
      return matchesSearch && user.is_active === false;
    }
    return matchesSearch;
  });

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
      <div className="w-full overflow-x-hidden px-2 sm:px-3 py-2 sm:py-4 max-w-7xl mx-auto">
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
    <MobilePageWrapper className="space-y-3">
      <PageHeader
        icon={Shield}
        title="Role Management"
        description="Manage user roles and permissions"
      />

      {/* Search and Bulk Actions Bar */}
      <div className="mb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Input
            id="user-search"
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-3 pr-8 text-xs"
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
        
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active" className="text-xs">Active Only</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive Only</SelectItem>
            <SelectItem value="all" className="text-xs">All Users</SelectItem>
          </SelectContent>
        </Select>
        
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
            <>
              {/* Mobile Card View */}
              {isMobile ? (
                <div className="space-y-3">
                  {filteredUsers.map((user) => {
                    const passwordStatus = getPasswordStatus(user);
                    const isInactive = user.is_active === false;
                    const isExpanded = expandedCards.has(user.id);
                    
                    return (
                      <Card 
                        key={user.id} 
                        className={`${isInactive ? 'opacity-60' : ''}`}
                      >
                        <Collapsible open={isExpanded} onOpenChange={() => toggleCard(user.id)}>
                          {/* Collapsed Header */}
                          <CardHeader className="p-3 bg-gradient-to-r from-primary/5 to-transparent">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedUserIds.has(user.id)}
                                onCheckedChange={() => toggleUserSelection(user.id)}
                                className="mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <CardTitle className="text-sm font-medium truncate">
                                    {user.full_name || 'No name'}
                                  </CardTitle>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isInactive && (
                                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-orange-500 text-orange-700 dark:text-orange-500">
                                        Inactive
                                      </Badge>
                                    )}
                                    <Badge 
                                      variant={passwordStatus.variant} 
                                      className={`h-4 px-1.5 text-[10px] ${passwordStatus.className || ''}`}
                                    >
                                      {passwordStatus.label}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </CardHeader>

                          {/* Collapsible Trigger */}
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50 border-t"
                            >
                              <div className="flex items-center gap-2">
                                {user.roles.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">No roles assigned</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {user.roles.map((role) => (
                                      <Badge key={role} variant="secondary" className="h-5 px-1.5 text-[10px]">
                                        {role.replace('_', ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <ChevronDown className={`h-4 w-4 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>

                          {/* Expanded Content */}
                          <CollapsibleContent>
                            <CardContent className="p-3 space-y-3 pt-2" onClick={(e) => e.stopPropagation()}>
                              {/* Role Management */}
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">Assigned Roles</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {user.roles.length === 0 ? (
                                    <Badge variant="outline" className="h-6 px-2 text-xs text-muted-foreground">
                                      No roles
                                    </Badge>
                                  ) : (
                                    user.roles.map((role) => (
                                      <Badge key={role} variant="secondary" className="h-6 px-2 text-xs gap-1.5">
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

                              {/* Account Info */}
                              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
                                <div>
                                  <div className="text-muted-foreground text-[10px] mb-0.5">Last Sign-In</div>
                                  <div className="font-medium">{formatLastSignIn(user.last_sign_in_at)}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground text-[10px] mb-0.5">Account Status</div>
                                  <Badge 
                                    variant={passwordStatus.variant} 
                                    className={`h-5 px-1.5 text-[10px] ${passwordStatus.className || ''}`}
                                  >
                                    {passwordStatus.label}
                                  </Badge>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 pt-2 border-t">
                                <Select onValueChange={(value) => addRole(user.id, value as AppRole)}>
                                  <SelectTrigger className="h-8 flex-1 text-xs">
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
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
                                      <MoreVertical className="h-4 w-4" />
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
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="border-t overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Password Status</TableHead>
                        <TableHead>Last Sign-In</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const passwordStatus = getPasswordStatus(user);
                        const isInactive = user.is_active === false;
                        return (
                          <TableRow key={user.id} className={isInactive ? 'opacity-60 bg-muted/20' : ''}>
                            {/* Checkbox Column */}
                            <TableCell>
                              <Checkbox
                                checked={selectedUserIds.has(user.id)}
                                onCheckedChange={() => toggleUserSelection(user.id)}
                              />
                            </TableCell>

                            {/* User Column */}
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{user.full_name || 'No name'}</span>
                                  {isInactive && (
                                    <Badge variant="outline" className="h-4 px-1 text-[10px] border-orange-500 text-orange-700 dark:text-orange-500">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                            </TableCell>

                            {/* Roles Column */}
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {user.roles.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">No roles</span>
                                ) : (
                                  user.roles.map((role) => (
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
                            </TableCell>

                            {/* Password Status Column */}
                            <TableCell>
                              <Badge variant={passwordStatus.variant} className={passwordStatus.className}>
                                {passwordStatus.label}
                              </Badge>
                            </TableCell>

                            {/* Last Sign-In Column */}
                            <TableCell>
                              {user.last_sign_in_at ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs cursor-help">
                                        {formatLastSignIn(user.last_sign_in_at)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {formatFullTimestamp(user.last_sign_in_at)}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-xs text-muted-foreground">Never</span>
                              )}
                            </TableCell>

                            {/* Actions Column */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Select onValueChange={(value) => addRole(user.id, value as AppRole)}>
                                  <SelectTrigger className="h-7 w-[100px] sm:w-[120px] text-xs">
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
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
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

      {/* Active Timers Section - Admin Only */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Timers
          </CardTitle>
          <CardDescription>
            Workers currently clocked in. Force clock-out if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveTimersTable onTimerClosed={loadUsers} />
        </CardContent>
      </Card>
    </MobilePageWrapper>
  );
}
