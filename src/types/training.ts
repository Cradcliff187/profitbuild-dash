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

