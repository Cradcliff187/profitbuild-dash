# Training Module - React Components

> This document specifies all React components, types, hooks, and utilities needed for the training module.

---

## Table of Contents

1. [Types](#types)
2. [Hooks](#hooks)
3. [Utilities](#utilities)
4. [Pages](#pages)
5. [Components](#components)

---

## Types

### File: `src/types/training.ts`

```typescript
/**
 * @file training.ts
 * @description Types for the Training Module
 */

import { Database } from '@/integrations/supabase/types';

// =============================================================================
// DATABASE TYPES
// =============================================================================

export type TrainingContentType = 'video_link' | 'video_embed' | 'document' | 'presentation' | 'external_link';
export type TrainingStatus = 'draft' | 'published' | 'archived';
export type AppRole = Database['public']['Enums']['app_role'];

// =============================================================================
// TRAINING CONTENT
// =============================================================================

export interface TrainingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: TrainingContentType;
  content_url: string | null;
  storage_path: string | null;
  embed_code: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  status: TrainingStatus;
  is_required: boolean;
  target_roles: AppRole[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingContentData {
  title: string;
  description?: string;
  content_type: TrainingContentType;
  content_url?: string;
  storage_path?: string;
  embed_code?: string;
  thumbnail_url?: string;
  duration_minutes?: number;
  status?: TrainingStatus;
  is_required?: boolean;
  target_roles?: AppRole[];
}

export interface UpdateTrainingContentData extends Partial<CreateTrainingContentData> {
  id: string;
}

// =============================================================================
// TRAINING ASSIGNMENTS
// =============================================================================

export interface TrainingAssignment {
  id: string;
  training_content_id: string;
  user_id: string;
  assigned_by: string | null;
  due_date: string | null;
  priority: number;
  notes: string | null;
  notification_sent_at: string | null;
  reminder_sent_at: string | null;
  assigned_at: string;
  // Joined data
  training_content?: TrainingContent;
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
  assigner?: {
    id: string;
    full_name: string | null;
  };
}

export interface CreateAssignmentData {
  training_content_id: string;
  user_id: string;
  due_date?: string;
  priority?: number;
  notes?: string;
}

// =============================================================================
// TRAINING COMPLETIONS
// =============================================================================

export interface TrainingCompletion {
  id: string;
  training_content_id: string;
  user_id: string;
  completed_at: string;
  time_spent_minutes: number | null;
  acknowledged: boolean;
  notes: string | null;
}

export interface CreateCompletionData {
  training_content_id: string;
  time_spent_minutes?: number;
  notes?: string;
}

// =============================================================================
// COMBINED TYPES FOR UI
// =============================================================================

export type TrainingItemStatus = 'completed' | 'overdue' | 'pending' | 'assigned';

export interface MyTrainingItem {
  assignment: TrainingAssignment;
  content: TrainingContent;
  completion: TrainingCompletion | null;
  status: TrainingItemStatus;
  daysRemaining: number | null;
}

export interface TrainingStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export type NotificationType = 'assignment' | 'reminder' | 'overdue';

export interface SendNotificationParams {
  training_content_id: string;
  user_ids: string[];
  notification_type: NotificationType;
  custom_message?: string;
}

export interface NotificationResult {
  success: boolean;
  results: Array<{
    userId: string;
    success: boolean;
    emailId?: string;
    error?: string;
  }>;
  summary: {
    sent: number;
    failed: number;
  };
}
```

---

## Hooks

### File: `src/hooks/useTrainingContent.ts`

```typescript
/**
 * @file useTrainingContent.ts
 * @description Hook for managing training content (admin operations)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrainingContent, 
  CreateTrainingContentData, 
  UpdateTrainingContentData,
  TrainingStatus 
} from '@/types/training';
import { toast } from 'sonner';

export function useTrainingContent() {
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all content (admin view)
  const fetchContent = useCallback(async (statusFilter?: TrainingStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('training_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setContent(data || []);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching training content:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create content
  const createContent = async (data: CreateTrainingContentData): Promise<TrainingContent | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: newContent, error } = await supabase
        .from('training_content')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setContent(prev => [newContent, ...prev]);
      toast.success('Training content created');
      return newContent;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to create content', { description: error.message });
      return null;
    }
  };

  // Update content
  const updateContent = async (data: UpdateTrainingContentData): Promise<TrainingContent | null> => {
    try {
      const { id, ...updates } = data;
      
      const { data: updated, error } = await supabase
        .from('training_content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setContent(prev => prev.map(c => c.id === id ? updated : c));
      toast.success('Training content updated');
      return updated;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to update content', { description: error.message });
      return null;
    }
  };

  // Delete content
  const deleteContent = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('training_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContent(prev => prev.filter(c => c.id !== id));
      toast.success('Training content deleted');
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to delete content', { description: error.message });
      return false;
    }
  };

  // Publish/unpublish content
  const setContentStatus = async (id: string, status: TrainingStatus): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('training_content')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setContent(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success(`Content ${status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'set to draft'}`);
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to update status', { description: error.message });
      return false;
    }
  };

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return {
    content,
    isLoading,
    error,
    fetchContent,
    createContent,
    updateContent,
    deleteContent,
    setContentStatus,
    refresh: fetchContent,
  };
}
```

### File: `src/hooks/useTrainingAssignments.ts`

```typescript
/**
 * @file useTrainingAssignments.ts
 * @description Hook for managing training assignments and user completions
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrainingAssignment, 
  CreateAssignmentData,
  MyTrainingItem,
  TrainingStats,
  SendNotificationParams,
  NotificationResult
} from '@/types/training';
import { toast } from 'sonner';

// =============================================================================
// ADMIN HOOK - Managing assignments
// =============================================================================

export function useTrainingAssignments(contentId?: string) {
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('training_assignments')
        .select(`
          *,
          user:profiles!training_assignments_user_id_fkey(id, full_name, email),
          assigner:profiles!training_assignments_assigned_by_fkey(id, full_name)
        `)
        .order('assigned_at', { ascending: false });

      if (contentId) {
        query = query.eq('training_content_id', contentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAssignments(data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  // Bulk create assignments
  const createAssignments = async (
    trainingContentId: string, 
    userIds: string[], 
    options?: { due_date?: string; priority?: number; notes?: string }
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const assignmentsToCreate = userIds.map(userId => ({
        training_content_id: trainingContentId,
        user_id: userId,
        assigned_by: user?.id,
        due_date: options?.due_date || null,
        priority: options?.priority || 0,
        notes: options?.notes || null,
      }));

      const { error } = await supabase
        .from('training_assignments')
        .upsert(assignmentsToCreate, { 
          onConflict: 'training_content_id,user_id',
          ignoreDuplicates: true 
        });

      if (error) throw error;

      toast.success(`Assigned to ${userIds.length} user(s)`);
      await fetchAssignments();
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to create assignments', { description: error.message });
      return false;
    }
  };

  // Delete assignment
  const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('training_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success('Assignment removed');
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to remove assignment', { description: error.message });
      return false;
    }
  };

  // Send notifications
  const sendNotifications = async (params: SendNotificationParams): Promise<NotificationResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-training-notification', {
        body: params,
      });

      if (error) throw error;

      const result = data as NotificationResult;
      
      if (result.summary.sent > 0) {
        toast.success(`Notifications sent to ${result.summary.sent} user(s)`);
      }
      if (result.summary.failed > 0) {
        toast.warning(`Failed to send to ${result.summary.failed} user(s)`);
      }

      await fetchAssignments(); // Refresh to show notification timestamps
      return result;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to send notifications', { description: error.message });
      return null;
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return {
    assignments,
    isLoading,
    createAssignments,
    deleteAssignment,
    sendNotifications,
    refresh: fetchAssignments,
  };
}

// =============================================================================
// USER HOOK - My training items
// =============================================================================

export function useMyTraining() {
  const [items, setItems] = useState<MyTrainingItem[]>([]);
  const [stats, setStats] = useState<TrainingStats>({ 
    total: 0, completed: 0, pending: 0, overdue: 0, completionRate: 0 
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyTraining = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch assignments with content
      const { data: assignments, error: assignError } = await supabase
        .from('training_assignments')
        .select(`
          *,
          training_content(*)
        `)
        .eq('user_id', user.id);

      if (assignError) throw assignError;

      // Fetch completions
      const { data: completions, error: compError } = await supabase
        .from('training_completions')
        .select('*')
        .eq('user_id', user.id);

      if (compError) throw compError;

      // Combine into MyTrainingItem[]
      const today = new Date();
      const trainingItems: MyTrainingItem[] = (assignments || [])
        .filter(a => a.training_content?.status === 'published')
        .map(assignment => {
          const completion = completions?.find(c => c.training_content_id === assignment.training_content_id) || null;
          const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
          
          let status: MyTrainingItem['status'] = 'assigned';
          let daysRemaining: number | null = null;

          if (completion) {
            status = 'completed';
          } else if (dueDate) {
            daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            status = daysRemaining < 0 ? 'overdue' : 'pending';
          }

          return {
            assignment,
            content: assignment.training_content!,
            completion,
            status,
            daysRemaining,
          };
        });

      // Calculate stats
      const total = trainingItems.length;
      const completed = trainingItems.filter(i => i.status === 'completed').length;
      const overdue = trainingItems.filter(i => i.status === 'overdue').length;
      const pending = total - completed;

      setItems(trainingItems);
      setStats({
        total,
        completed,
        pending,
        overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });

    } catch (err) {
      console.error('Error fetching my training:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark as complete
  const markComplete = async (
    contentId: string, 
    options?: { time_spent_minutes?: number; notes?: string }
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('training_completions')
        .insert({
          training_content_id: contentId,
          user_id: user.id,
          time_spent_minutes: options?.time_spent_minutes,
          notes: options?.notes,
          acknowledged: true,
        });

      if (error) throw error;

      toast.success('Training marked as complete!');
      await fetchMyTraining();
      return true;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to mark as complete', { description: error.message });
      return false;
    }
  };

  useEffect(() => {
    fetchMyTraining();
  }, [fetchMyTraining]);

  return {
    items,
    stats,
    isLoading,
    markComplete,
    refresh: fetchMyTraining,
  };
}
```

---

## Utilities

### File: `src/utils/trainingStorage.ts`

```typescript
/**
 * @file trainingStorage.ts
 * @description Utilities for uploading training content files
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'training-content';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES: Record<string, string[]> = {
  document: ['application/pdf'],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

export interface UploadResult {
  success: boolean;
  path?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Upload a training content file
 */
export async function uploadTrainingFile(
  file: File,
  contentType: 'document' | 'presentation'
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = ALLOWED_TYPES[contentType];
    if (!allowedTypes.includes(file.type)) {
      return { 
        success: false, 
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Generate storage path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Get signed URL (7 days)
    const { data: signedUrlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(uploadData.path, 604800);

    return {
      success: true,
      path: uploadData.path,
      signedUrl: signedUrlData?.signedUrl,
    };

  } catch (err) {
    const error = err as Error;
    return { success: false, error: error.message };
  }
}

/**
 * Delete a training content file
 */
export async function deleteTrainingFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Get a signed URL for a training file
 */
export async function getTrainingFileUrl(path: string): Promise<string | null> {
  try {
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 3600); // 1 hour

    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

/**
 * Extract video ID from common video platforms
 */
export function parseVideoUrl(url: string): { platform: string; id: string } | null {
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return { platform: 'youtube', id: youtubeMatch[1] };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return { platform: 'vimeo', id: vimeoMatch[1] };
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return { platform: 'loom', id: loomMatch[1] };
  }

  return null;
}

/**
 * Generate embed URL for video platforms
 */
export function getVideoEmbedUrl(url: string): string | null {
  const parsed = parseVideoUrl(url);
  if (!parsed) return null;

  switch (parsed.platform) {
    case 'youtube':
      return `https://www.youtube.com/embed/${parsed.id}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${parsed.id}`;
    case 'loom':
      return `https://www.loom.com/embed/${parsed.id}`;
    default:
      return null;
  }
}
```

---

## Pages

### File: `src/pages/Training.tsx` (User's My Training page)

See separate component specification below.

### File: `src/pages/TrainingAdmin.tsx` (Admin management page)

See separate component specification below.

### File: `src/pages/TrainingViewer.tsx` (Content viewer page)

See separate component specification below.

---

## Components

### Component specifications continue in next file...

The component implementations should follow these existing patterns from the codebase:

1. **Form Pattern**: Use `react-hook-form` with `zodResolver` (see `ChangeOrderForm.tsx`)
2. **Table Pattern**: Use shadcn `Table` with sorting/filtering (see `ScheduleTableView.tsx`)
3. **Dialog Pattern**: Use shadcn `Dialog` or `Sheet` (see `ScheduleExportModal.tsx`)
4. **Card Layout**: Use shadcn `Card` with consistent padding (see `RoleManagement.tsx`)
5. **Toast Notifications**: Use `sonner` toast (see throughout codebase)
6. **Loading States**: Use `Loader2` spinner with animation (see `Auth.tsx`)
