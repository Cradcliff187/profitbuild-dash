# Training Content Upload, Storage & Viewing - Complete Implementation

## Overview

This document contains the complete implementation for fixing the training content system to support all 5 content types end-to-end: upload/input → storage → viewing.

**Priority**: Implement in order (File 1 → File 2 → File 3)

---

## Content Type Matrix

| Type | Input Method | Storage | Viewer |
|------|--------------|---------|--------|
| video_link | URL field | content_url column | Embed iframe (YouTube/Vimeo/Loom) |
| video_embed | Textarea (iframe code) | embed_code column | Render iframe HTML |
| document | File upload (PDF) | training-content bucket → storage_path | PDF iframe |
| presentation | File upload (PPTX) | training-content bucket → storage_path | Google Docs Viewer or download |
| external_link | URL field | content_url column | Open in new tab |

---

## FILE 1: src/utils/trainingStorage.ts

Create or replace this file with the complete utility functions:

```typescript
import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'training-content';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  document: ['application/pdf'],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Upload a training content file to Supabase storage
 */
export async function uploadTrainingFile(
  file: File,
  contentType: 'document' | 'presentation'
): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = ALLOWED_MIME_TYPES[contentType];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type. Allowed: ${contentType === 'document' ? 'PDF' : 'PowerPoint (.ppt, .pptx)'}`,
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File too large. Maximum size: 50MB',
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
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    return {
      success: true,
      path: uploadData.path,
    };

  } catch (err) {
    const error = err as Error;
    console.error('Upload exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a training content file from storage
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
 * Get a signed URL for viewing a training file
 */
export async function getTrainingFileUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (err) {
    console.error('getTrainingFileUrl error:', err);
    return null;
  }
}

/**
 * Parse video URL to extract platform and ID
 */
export function parseVideoUrl(url: string): { platform: string; id: string } | null {
  if (!url) return null;
  
  // YouTube - multiple formats
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) return { platform: 'youtube', id: match[1] };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };

  // Loom
  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) return { platform: 'loom', id: loomMatch[1] };

  return null;
}

/**
 * Convert video URL to embeddable URL
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

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() || '';
}
```

---

## FILE 2: src/components/training/TrainingContentForm.tsx

Create or replace this file with the complete form component:

```typescript
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload, X, FileText, Film, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { TrainingContent, CreateTrainingContentData, TrainingContentType } from '@/types/training';
import { uploadTrainingFile, deleteTrainingFile, parseVideoUrl } from '@/utils/trainingStorage';

// Schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  content_type: z.enum(['video_link', 'video_embed', 'document', 'presentation', 'external_link']),
  content_url: z.string().optional(),
  storage_path: z.string().optional(),
  embed_code: z.string().optional(),
  duration_minutes: z.coerce.number().min(1).max(480).optional().or(z.literal('')),
  is_required: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
}).refine((data) => {
  // Validate required fields based on content type
  if (data.content_type === 'video_link' || data.content_type === 'external_link') {
    return !!data.content_url;
  }
  if (data.content_type === 'video_embed') {
    return !!data.embed_code;
  }
  if (data.content_type === 'document' || data.content_type === 'presentation') {
    return !!data.storage_path;
  }
  return true;
}, {
  message: 'Content is required for the selected type',
  path: ['content_url'],
});

type FormData = z.infer<typeof formSchema>;

interface TrainingContentFormProps {
  content?: TrainingContent;
  onSave: (data: CreateTrainingContentData) => Promise<void>;
  onCancel: () => void;
}

export function TrainingContentForm({ content, onSave, onCancel }: TrainingContentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; path: string } | null>(
    content?.storage_path ? { name: 'Existing file', path: content.storage_path } : null
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: content?.title || '',
      description: content?.description || '',
      content_type: content?.content_type || 'video_link',
      content_url: content?.content_url || '',
      storage_path: content?.storage_path || '',
      embed_code: content?.embed_code || '',
      duration_minutes: content?.duration_minutes || '',
      is_required: content?.is_required || false,
      status: content?.status || 'draft',
    },
  });

  const contentType = form.watch('content_type');

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileContentType = contentType === 'document' ? 'document' : 'presentation';
    
    setIsUploading(true);
    const result = await uploadTrainingFile(file, fileContentType);
    setIsUploading(false);

    if (result.success && result.path) {
      setUploadedFile({ name: file.name, path: result.path });
      form.setValue('storage_path', result.path);
      form.clearErrors('content_url'); // Clear validation error
      toast.success('File uploaded successfully');
    } else {
      toast.error('Upload failed', { description: result.error });
    }
    
    // Reset input
    e.target.value = '';
  };

  // Handle file removal
  const handleRemoveFile = async () => {
    if (uploadedFile?.path && !content?.storage_path) {
      // Only delete if it's a new upload, not existing content
      await deleteTrainingFile(uploadedFile.path);
    }
    setUploadedFile(null);
    form.setValue('storage_path', '');
  };

  // Validate video URL on blur
  const handleVideoUrlBlur = (url: string) => {
    if (contentType === 'video_link' && url) {
      const parsed = parseVideoUrl(url);
      if (!parsed) {
        toast.warning('Unrecognized video URL', {
          description: 'Supported: YouTube, Vimeo, Loom. Other URLs may not embed properly.',
        });
      }
    }
  };

  // Submit handler
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const saveData: CreateTrainingContentData = {
        title: data.title,
        description: data.description || undefined,
        content_type: data.content_type,
        content_url: ['video_link', 'external_link'].includes(data.content_type) ? data.content_url : undefined,
        storage_path: ['document', 'presentation'].includes(data.content_type) ? data.storage_path : undefined,
        embed_code: data.content_type === 'video_embed' ? data.embed_code : undefined,
        duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : undefined,
        is_required: data.is_required,
        status: data.status,
      };
      
      await onSave(saveData);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Content type labels
  const contentTypeLabels: Record<TrainingContentType, string> = {
    video_link: 'Video Link (YouTube, Vimeo, Loom)',
    video_embed: 'Video Embed (iframe code)',
    document: 'Document (PDF)',
    presentation: 'Presentation (PowerPoint)',
    external_link: 'External Link',
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Training title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Brief description of the training content" rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Content Type */}
        <FormField
          control={form.control}
          name="content_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(contentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dynamic Content Input based on type */}
        <Card className="border-dashed">
          <CardContent className="pt-4">
            {/* Video Link */}
            {contentType === 'video_link' && (
              <FormField
                control={form.control}
                name="content_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Video URL *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                        onBlur={(e) => handleVideoUrlBlur(e.target.value)}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Supports YouTube, Vimeo, and Loom links
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Video Embed */}
            {contentType === 'video_embed' && (
              <FormField
                control={form.control}
                name="embed_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Embed Code *
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder='<iframe src="..." ...></iframe>'
                        rows={4}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Paste the full iframe embed code from the video provider
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Document / Presentation Upload */}
            {(contentType === 'document' || contentType === 'presentation') && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {contentType === 'document' ? 'PDF File *' : 'PowerPoint File *'}
                </Label>
                
                {uploadedFile ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="flex-1 text-sm truncate">{uploadedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept={contentType === 'document' ? '.pdf' : '.ppt,.pptx'}
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="flex-1"
                    />
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {contentType === 'document' 
                    ? 'Upload a PDF file (max 50MB)' 
                    : 'Upload a PowerPoint file (.ppt, .pptx, max 50MB)'}
                </p>
                
                {/* Hidden field for storage_path */}
                <input type="hidden" {...form.register('storage_path')} />
              </div>
            )}

            {/* External Link */}
            {contentType === 'external_link' && (
              <FormField
                control={form.control}
                name="content_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      External URL *
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/training-page" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Link will open in a new browser tab
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Duration */}
        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Duration (minutes)</FormLabel>
              <FormControl>
                <Input {...field} type="number" min={1} max={480} placeholder="30" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Required & Status */}
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="is_required"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Required for all employees</FormLabel>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="flex-1">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isUploading}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {content ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

---

## FILE 3: src/pages/TrainingViewer.tsx

Create or replace this file with the complete viewer component:

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, Clock, ExternalLink, CheckCircle, FileText, Film, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TrainingContent } from '@/types/training';
import { useMyTraining } from '@/hooks/useTrainingAssignments';
import { getVideoEmbedUrl, getTrainingFileUrl } from '@/utils/trainingStorage';
import { toast } from 'sonner';

export default function TrainingViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items, markComplete, refresh } = useMyTraining();
  
  const [content, setContent] = useState<TrainingContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Find if user has completed this
  const myItem = items.find(i => i.content.id === id);
  const isCompleted = myItem?.status === 'completed';

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('training_content')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setContent(data);

        // Get signed URL for documents/presentations
        if (data.storage_path && (data.content_type === 'document' || data.content_type === 'presentation')) {
          const url = await getTrainingFileUrl(data.storage_path);
          setFileUrl(url);
        }
      } catch (err) {
        console.error('Error fetching content:', err);
        toast.error('Failed to load training content');
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, [id]);

  // Handle mark complete
  const handleMarkComplete = async () => {
    if (!id) return;
    
    setIsCompleting(true);
    const success = await markComplete(id);
    setIsCompleting(false);
    
    if (success) {
      setShowCompleteDialog(false);
      await refresh();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (!content) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Training content not found</p>
        <Button variant="link" onClick={() => navigate('/training')}>
          ← Back to My Training
        </Button>
      </div>
    );
  }

  // Render content based on type
  const renderContent = () => {
    switch (content.content_type) {
      case 'video_link': {
        const embedUrl = getVideoEmbedUrl(content.content_url || '');
        if (!embedUrl) {
          return (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Unable to embed this video</p>
              <Button onClick={() => window.open(content.content_url || '', '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Video in New Tab
              </Button>
            </div>
          );
        }
        return (
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }

      case 'video_embed': {
        return (
          <div 
            className="aspect-video w-full"
            dangerouslySetInnerHTML={{ __html: content.embed_code || '' }}
          />
        );
      }

      case 'document': {
        if (!fileUrl) {
          return (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading document...</p>
            </div>
          );
        }
        return (
          <div className="w-full">
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded-lg border"
              title={content.title}
            />
            <div className="mt-2 text-center">
              <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        );
      }

      case 'presentation': {
        if (!fileUrl) {
          return (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading presentation...</p>
            </div>
          );
        }
        // Use Google Docs Viewer for PowerPoint
        const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        return (
          <div className="w-full">
            <iframe
              src={googleViewerUrl}
              className="w-full h-[70vh] rounded-lg border"
              title={content.title}
            />
            <div className="mt-2 text-center">
              <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download Presentation
              </Button>
            </div>
          </div>
        );
      }

      case 'external_link': {
        return (
          <div className="text-center py-12">
            <ExternalLink className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-2">This training opens in a new window</p>
            <p className="text-muted-foreground mb-6">
              Click the button below to access the training content
            </p>
            <Button size="lg" onClick={() => window.open(content.content_url || '', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Training Content
            </Button>
          </div>
        );
      }

      default:
        return <p className="text-muted-foreground">Unknown content type</p>;
    }
  };

  // Content type icon
  const getTypeIcon = () => {
    switch (content.content_type) {
      case 'video_link':
      case 'video_embed':
        return <Film className="h-5 w-5" />;
      case 'document':
      case 'presentation':
        return <FileText className="h-5 w-5" />;
      case 'external_link':
        return <ExternalLink className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/training')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Training
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getTypeIcon()}
                <Badge variant={isCompleted ? 'default' : 'secondary'}>
                  {isCompleted ? 'Completed' : content.content_type.replace('_', ' ')}
                </Badge>
                {content.is_required && (
                  <Badge variant="destructive">Required</Badge>
                )}
              </div>
              <CardTitle className="text-xl">{content.title}</CardTitle>
              {content.description && (
                <CardDescription className="mt-2">{content.description}</CardDescription>
              )}
            </div>
            
            {content.duration_minutes && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {content.duration_minutes} min
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>

      {/* Complete button */}
      {!isCompleted && (
        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={() => setShowCompleteDialog(true)}>
            <CheckCircle className="h-5 w-5 mr-2" />
            Mark as Complete
          </Button>
        </div>
      )}

      {/* Completion confirmation dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Training as Complete?</DialogTitle>
            <DialogDescription>
              By clicking confirm, you acknowledge that you have completed this training: "{content.title}"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkComplete} disabled={isCompleting}>
              {isCompleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## Pre-Implementation Checklist

Before implementing, verify:

1. **Supabase Storage Bucket**: Ensure `training-content` bucket exists with appropriate RLS policies
2. **Database Columns**: Verify `training_content` table has these columns:
   - `content_url` (text, nullable)
   - `storage_path` (text, nullable)
   - `embed_code` (text, nullable)
   - `content_type` (enum: video_link, video_embed, document, presentation, external_link)
3. **Types File**: Ensure `src/types/training.ts` exports `TrainingContent`, `CreateTrainingContentData`, and `TrainingContentType`
4. **Hook**: Ensure `useMyTraining` hook exists in `src/hooks/useTrainingAssignments.ts`

---

## Implementation Order

1. Create/update `src/utils/trainingStorage.ts`
2. Create/update `src/components/training/TrainingContentForm.tsx`
3. Create/update `src/pages/TrainingViewer.tsx`
4. Test each content type end-to-end

---

## Testing Checklist

After implementation, test each content type:

- [ ] **video_link**: Add YouTube/Vimeo/Loom URL → Verify embed displays
- [ ] **video_embed**: Paste iframe code → Verify renders correctly
- [ ] **document**: Upload PDF → Verify displays in iframe with download option
- [ ] **presentation**: Upload PPTX → Verify Google Docs Viewer works with download option
- [ ] **external_link**: Add URL → Verify opens in new tab
