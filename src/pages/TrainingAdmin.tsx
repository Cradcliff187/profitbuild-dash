import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/contexts/RoleContext';
import { useTrainingContent } from '@/hooks/useTrainingContent';
import { CreateTrainingContentData, UpdateTrainingContentData } from '@/types/training';
import { useTrainingAssignments } from '@/hooks/useTrainingAssignments';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  BookOpen, 
  Search, 
  X, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Send, 
  Users, 
  FileText, 
  Video, 
  Link as LinkIcon,
  Calendar,
  Loader2,
  ChevronDown,
  GraduationCap,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
import { TrainingContent, TrainingStatus, TrainingContentType, AppRole } from '@/types/training';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadTrainingFile, deleteTrainingFile } from '@/utils/trainingStorage';
import { Upload } from 'lucide-react';

// Form schema for training content
const trainingContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  content_type: z.enum(['video_link', 'video_embed', 'document', 'presentation', 'external_link']),
  content_url: z.string().url().optional().or(z.literal('')),
  storage_path: z.string().optional(),
  embed_code: z.string().optional(),
  duration_minutes: z.coerce.number().min(1).max(480).optional().or(z.literal('')),
  is_required: z.boolean().default(false),
  target_roles: z.array(z.enum(['admin', 'manager', 'field_worker'])).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

type TrainingContentFormData = z.infer<typeof trainingContentSchema>;

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function TrainingAdmin() {
  const { isAdmin, isManager, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { content, isLoading, createContent, updateContent, deleteContent, setContentStatus, fetchContent } = useTrainingContent();
  const { assignments, createAssignments, sendNotifications } = useTrainingAssignments();

  // State
  const [statusFilter, setStatusFilter] = useState<'all' | TrainingStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editContent, setEditContent] = useState<TrainingContent | null>(null);
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<TrainingContent | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [priority, setPriority] = useState(0);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; path: string } | null>(null);

  // Form
  const form = useForm<TrainingContentFormData>({
    resolver: zodResolver(trainingContentSchema),
    defaultValues: {
      title: '',
      description: '',
      content_type: 'video_link',
      content_url: '',
      storage_path: '',
      embed_code: '',
      duration_minutes: undefined,
      is_required: false,
      target_roles: [],
      status: 'draft',
    },
  });

  // Access control
  useEffect(() => {
    if (!rolesLoading && !isAdmin && !isManager) {
      toast({
        title: 'Access Denied',
        description: 'Only administrators and managers can manage training content',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [isAdmin, isManager, rolesLoading, navigate, toast]);

  // Load users for assignment
  useEffect(() => {
    if (assignSheetOpen) {
      const loadUsers = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('is_active', true)
          .order('full_name');

        if (!error && data) {
          setUsers(data);
        }
      };
      loadUsers();
    }
  }, [assignSheetOpen]);

  // Calculate stats
  const stats = {
    total: content.length,
    published: content.filter(c => c.status === 'published').length,
    draft: content.filter(c => c.status === 'draft').length,
    archived: content.filter(c => c.status === 'archived').length,
  };

  // Filter content
  const filteredContent = content.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Get assignment count for content
  const getAssignmentCount = useCallback((contentId: string) => {
    return assignments.filter(a => a.training_content_id === contentId).length;
  }, [assignments]);

  // Handlers
  const handleCreate = () => {
    setEditContent(null);
    setUploadedFile(null);
    form.reset({
      title: '',
      description: '',
      content_type: 'video_link',
      content_url: '',
      storage_path: '',
      embed_code: '',
      duration_minutes: undefined,
      is_required: false,
      target_roles: [],
      status: 'draft',
    });
    setCreateSheetOpen(true);
  };

  const handleEdit = (content: TrainingContent) => {
    setEditContent(content);
    setUploadedFile(
      content.storage_path ? { name: 'Existing file', path: content.storage_path } : null
    );
    form.reset({
      title: content.title,
      description: content.description || '',
      content_type: content.content_type,
      content_url: content.content_url || '',
      storage_path: content.storage_path || '',
      embed_code: content.embed_code || '',
      duration_minutes: content.duration_minutes || undefined,
      is_required: content.is_required,
      target_roles: content.target_roles || [],
      status: content.status,
    });
    setCreateSheetOpen(true);
  };

  const handleDelete = (content: TrainingContent) => {
    setContentToDelete(content);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!contentToDelete) return;
    const success = await deleteContent(contentToDelete.id);
    if (success) {
      setDeleteDialogOpen(false);
      setContentToDelete(null);
    }
  };

  const handleStatusChange = async (id: string, currentStatus: TrainingStatus) => {
    let newStatus: TrainingStatus;
    if (currentStatus === 'draft') {
      newStatus = 'published';
    } else if (currentStatus === 'published') {
      newStatus = 'archived';
    } else {
      newStatus = 'published';
    }
    await setContentStatus(id, newStatus);
  };

  const handleAssign = (contentId: string) => {
    setSelectedContentId(contentId);
    setSelectedUserIds(new Set());
    setDueDate(undefined);
    setPriority(0);
    setAssignmentNotes('');
    setSendNotification(true);
    setUserSearchQuery('');
    setAssignSheetOpen(true);
  };

  const handleAssignmentSubmit = async () => {
    if (!selectedContentId || selectedUserIds.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one user',
        variant: 'destructive',
      });
      return;
    }

    const userIds = Array.from(selectedUserIds);
    const success = await createAssignments(
      selectedContentId,
      userIds,
      {
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        priority,
        notes: assignmentNotes || undefined,
      }
    );

    if (success) {
      if (sendNotification) {
        await sendNotifications({
          training_content_id: selectedContentId,
          user_ids: userIds,
          notification_type: 'assignment',
        });
      }
      setAssignSheetOpen(false);
      setSelectedContentId(null);
      setSelectedUserIds(new Set());
    }
  };

  const handleFormSubmit = async (data: TrainingContentFormData) => {
    // Transform form data - convert empty strings to undefined for API compatibility
    const cleanedData = {
      title: data.title,
      description: data.description || undefined,
      content_type: data.content_type,
      content_url: data.content_url || undefined,
      storage_path: data.storage_path || undefined,
      embed_code: data.embed_code || undefined,
      duration_minutes: data.duration_minutes === '' ? undefined : data.duration_minutes,
      is_required: data.is_required,
      target_roles: data.target_roles,
      status: data.status,
    };

    if (editContent) {
      const success = await updateContent({
        id: editContent.id,
        ...cleanedData,
      } as UpdateTrainingContentData);
      if (success) {
        setCreateSheetOpen(false);
        setEditContent(null);
      }
    } else {
      const success = await createContent(cleanedData as CreateTrainingContentData);
      if (success) {
        setCreateSheetOpen(false);
      }
    }
  };

  const toggleCard = (contentId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(contentId)) {
        next.delete(contentId);
      } else {
        next.add(contentId);
      }
      return next;
    });
  };

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

  const toggleSelectAllUsers = () => {
    const filteredUsers = users.filter(u => 
      !userSearchQuery || 
      u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
    
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const filteredUsers = users.filter(u => 
    !userSearchQuery || 
    u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const getContentTypeIcon = (type: TrainingContentType) => {
    switch (type) {
      case 'video_link':
      case 'video_embed':
        return Video;
      case 'document':
      case 'presentation':
        return FileText;
      case 'external_link':
        return LinkIcon;
      default:
        return FileText;
    }
  };

  const getContentTypeLabel = (type: TrainingContentType) => {
    switch (type) {
      case 'video_link':
        return 'Video Link';
      case 'video_embed':
        return 'Video Embed';
      case 'document':
        return 'Document';
      case 'presentation':
        return 'Presentation';
      case 'external_link':
        return 'External Link';
      default:
        return type;
    }
  };

  if (rolesLoading || isLoading) {
    return (
      <div className="w-full overflow-x-hidden px-2 sm:px-3 py-2 sm:py-4 max-w-7xl mx-auto">
        <div className="mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-3 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin && !isManager) {
    return null;
  }

  return (
    <div className="w-full overflow-x-hidden px-2 sm:px-3 py-2 sm:py-4 max-w-7xl mx-auto">
      <PageHeader
        icon={GraduationCap}
        title="Training Admin"
        description="Manage training content and assignments"
        actions={
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Published</div>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Draft</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Archived</div>
            <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search by title or description..."
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
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="published" className="text-xs">Published</SelectItem>
            <SelectItem value="draft" className="text-xs">Draft</SelectItem>
            <SelectItem value="archived" className="text-xs">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Table/Cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Training Content
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
              {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredContent.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? 'No content found' : 'No training content yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'Create your first training content to get started'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              {isMobile ? (
                <div className="space-y-3 p-3">
                  {filteredContent.map((item) => {
                    const isExpanded = expandedCards.has(item.id);
                    const TypeIcon = getContentTypeIcon(item.content_type);
                    const assignmentCount = getAssignmentCount(item.id);
                    
                    return (
                      <Card key={item.id}>
                        <Collapsible open={isExpanded} onOpenChange={() => toggleCard(item.id)}>
                          <CardHeader className="p-3 bg-gradient-to-r from-primary/5 to-transparent">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm font-medium truncate mb-1">
                                  {item.title}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                    <TypeIcon className="h-3 w-3 mr-1" />
                                    {getContentTypeLabel(item.content_type)}
                                  </Badge>
                                  <Badge 
                                    variant={item.status === 'published' ? 'default' : 'outline'}
                                    className="h-4 px-1.5 text-[10px]"
                                  >
                                    {item.status}
                                  </Badge>
                                  {assignmentCount > 0 && (
                                    <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                                      {assignmentCount} assigned
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronDown className={`h-4 w-4 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </CardHeader>

                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50 border-t"
                            >
                              <span className="text-xs text-muted-foreground">
                                {item.description || 'No description'}
                              </span>
                            </Button>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <CardContent className="p-3 space-y-3 pt-2">
                              {item.description && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                                  <p className="text-xs">{item.description}</p>
                                </div>
                              )}
                              
                              <div className="flex gap-2 pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 flex-1 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssign(item.id);
                                  }}
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  Assign
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={() => handleEdit(item)}
                                      className="text-xs"
                                    >
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleStatusChange(item.id, item.status)}
                                      className="text-xs"
                                    >
                                      {item.status === 'draft' ? 'Publish' : item.status === 'published' ? 'Archive' : 'Publish'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(item)}
                                      className="text-xs text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Delete
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
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assignments</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContent.map((item) => {
                        const TypeIcon = getContentTypeIcon(item.content_type);
                        const assignmentCount = getAssignmentCount(item.id);
                        
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{item.title}</span>
                                {item.description && (
                                  <span className="text-xs text-muted-foreground truncate max-w-md">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {getContentTypeLabel(item.content_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={item.status === 'published' ? 'default' : 'outline'}
                                className="h-5 px-1.5 text-[10px]"
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assignmentCount > 0 ? (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                  {assignmentCount} assigned
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleAssign(item.id)}
                                >
                                  <Users className="h-3 w-3 mr-1" />
                                  Assign
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={() => handleEdit(item)}
                                      className="text-xs"
                                    >
                                      <Edit className="h-3 w-3 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleStatusChange(item.id, item.status)}
                                      className="text-xs"
                                    >
                                      {item.status === 'draft' ? 'Publish' : item.status === 'published' ? 'Archive' : 'Publish'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(item)}
                                      className="text-xs text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Delete
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

      {/* Create/Edit Sheet */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editContent ? 'Edit Training Content' : 'Create Training Content'}</SheetTitle>
            <SheetDescription>
              {editContent ? 'Update training content details' : 'Add new training content to the system'}
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...form.register('title')}
                className="h-9"
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_type">Content Type *</Label>
              <Select
                value={form.watch('content_type')}
                onValueChange={(value) => {
                  form.setValue('content_type', value as TrainingContentType);
                  // Reset file upload when switching away from document/presentation
                  if (value !== 'document' && value !== 'presentation') {
                    if (uploadedFile?.path && !editContent?.storage_path) {
                      deleteTrainingFile(uploadedFile.path);
                    }
                    setUploadedFile(null);
                    form.setValue('storage_path', '');
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video_link">Video Link (YouTube, Vimeo, Loom)</SelectItem>
                  <SelectItem value="video_embed">Video Embed (iframe code)</SelectItem>
                  <SelectItem value="document">Document (PDF)</SelectItem>
                  <SelectItem value="presentation">Presentation (PowerPoint)</SelectItem>
                  <SelectItem value="external_link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(form.watch('content_type') === 'video_link' || form.watch('content_type') === 'external_link') && (
              <div className="space-y-2">
                <Label htmlFor="content_url">Content URL</Label>
                <Input
                  id="content_url"
                  {...form.register('content_url')}
                  placeholder="https://..."
                  className="h-9"
                />
              </div>
            )}

            {form.watch('content_type') === 'video_embed' && (
              <div className="space-y-2">
                <Label htmlFor="embed_code">Embed Code</Label>
                <Textarea
                  id="embed_code"
                  {...form.register('embed_code')}
                  placeholder="<iframe>...</iframe>"
                  className="min-h-[100px] font-mono text-xs"
                />
              </div>
            )}

            {(form.watch('content_type') === 'document' || form.watch('content_type') === 'presentation') && (
              <div className="space-y-2">
                <Label htmlFor="file_upload">
                  {form.watch('content_type') === 'document' ? 'PDF File *' : 'PowerPoint File *'}
                </Label>
                
                {uploadedFile ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="flex-1 text-sm truncate">{uploadedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (uploadedFile.path && !editContent?.storage_path) {
                          await deleteTrainingFile(uploadedFile.path);
                        }
                        setUploadedFile(null);
                        form.setValue('storage_path', '');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      id="file_upload"
                      accept={form.watch('content_type') === 'document' ? '.pdf' : '.ppt,.pptx'}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const fileContentType = form.watch('content_type') === 'document' ? 'document' : 'presentation';
                        
                        setIsUploading(true);
                        const result = await uploadTrainingFile(file, fileContentType);
                        setIsUploading(false);

                        if (result.success && result.path) {
                          setUploadedFile({ name: file.name, path: result.path });
                          form.setValue('storage_path', result.path);
                          toast({
                            title: 'File uploaded successfully',
                            description: 'The file is ready to be saved.',
                          });
                        } else {
                          toast({
                            title: 'Upload failed',
                            description: result.error || 'Failed to upload file',
                            variant: 'destructive',
                          });
                        }
                        
                        e.target.value = '';
                      }}
                      disabled={isUploading}
                      className="flex-1"
                    />
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {form.watch('content_type') === 'document' 
                    ? 'Upload a PDF file (max 50MB)' 
                    : 'Upload a PowerPoint file (.ppt, .pptx, max 50MB)'}
                </p>
                
                {/* Hidden field for storage_path */}
                <input type="hidden" {...form.register('storage_path')} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                {...form.register('duration_minutes', { valueAsNumber: true })}
                className="h-9"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_required"
                checked={form.watch('is_required')}
                onCheckedChange={(checked) => form.setValue('is_required', checked as boolean)}
              />
              <Label htmlFor="is_required" className="text-sm font-normal cursor-pointer">
                Required Training
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Target Roles</Label>
              <div className="space-y-2">
                {(['admin', 'manager', 'field_worker'] as AppRole[]).map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={form.watch('target_roles')?.includes(role) || false}
                      onCheckedChange={(checked) => {
                        const current = form.watch('target_roles') || [];
                        if (checked) {
                          form.setValue('target_roles', [...current, role]);
                        } else {
                          form.setValue('target_roles', current.filter(r => r !== role));
                        }
                      }}
                    />
                    <Label htmlFor={`role-${role}`} className="text-sm font-normal cursor-pointer">
                      {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as TrainingStatus)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editContent ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreateSheetOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Assignment Sheet */}
      <Sheet open={assignSheetOpen} onOpenChange={setAssignSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assign Training</SheetTitle>
            <SheetDescription>
              Select users to assign this training content to
            </SheetDescription>
          </SheetHeader>

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

            {/* User Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Users</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAllUsers}
                  className="h-7 text-xs"
                >
                  {selectedUserIds.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="border rounded-md max-h-[300px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No users found
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedUserIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
                </p>
              )}
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

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="assignmentNotes">Notes (Optional)</Label>
              <Textarea
                id="assignmentNotes"
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                className="min-h-[80px]"
                placeholder="Add any notes for this assignment..."
              />
            </div>

            {/* Send Notification */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendNotification"
                checked={sendNotification}
                onCheckedChange={(checked) => setSendNotification(checked as boolean)}
              />
              <Label htmlFor="sendNotification" className="text-sm font-normal cursor-pointer">
                Send email notification to assigned users
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAssignmentSubmit} className="flex-1" disabled={selectedUserIds.size === 0}>
                Assign Training
              </Button>
              <Button type="button" variant="outline" onClick={() => setAssignSheetOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Training Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{contentToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

