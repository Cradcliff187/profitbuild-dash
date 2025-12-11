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
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
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
