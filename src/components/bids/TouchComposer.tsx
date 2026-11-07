import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { format } from 'date-fns';
import { CalendarClock, FileText, Loader2, Paperclip, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { VoiceNoteButton } from '@/components/notes/VoiceNoteButton';
import { useBidMediaUpload } from '@/hooks/useBidMediaUpload';
import { useLeadTimeline } from '@/hooks/useLeadTimeline';
import { createUploadProgressToast } from '@/utils/uploadProgressToast';
import { TOUCH_KIND_ICONS } from '@/components/bids/touchKindIcons';
import { nextBusinessDay, toDueDateString } from '@/utils/leadAttention';
import { TIMELINE_KIND_LABELS, type LeadTimelineAttachment, type TouchKind } from '@/types/bid';
import { cn } from '@/lib/utils';


const KIND_ORDER: TouchKind[] = ['note', 'call', 'text', 'email_out', 'email_in', 'meeting', 'site_walk'];

interface TouchComposerProps {
  bidId: string;
  presentation: 'inline' | 'sheet';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSubmitted?: () => void;
  defaultKind?: TouchKind;
  /** The lead's current next step; the composer pre-fills and lets you change it. */
  currentNextStep?: { text: string | null; due: string | null };
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * THE composer for a lead (Rule 15: one composer per surface family). Logs one
 * touch — kind · words · attachments — and asks for the next step on every
 * save, because a touch without a next step is a lead nobody owns (sales
 * design rule 3). Replaces BidNoteComposer + BidNotesTimeline's inline form.
 * Writes only through useLeadTimeline.addTouch; nothing here changes a stage.
 */
export function TouchComposer({
  bidId,
  presentation,
  open,
  onOpenChange,
  onSubmitted,
  defaultKind = 'note',
  currentNextStep,
  placeholder = 'What happened? Who said what, what they need, when…',
  autoFocus = false,
}: TouchComposerProps) {
  const { addTouch, isAdding } = useLeadTimeline(bidId);
  const { upload } = useBidMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [kind, setKind] = useState<TouchKind>(defaultKind);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<LeadTimelineAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stepText, setStepText] = useState('');
  const [stepDue, setStepDue] = useState('');
  const [stepTouched, setStepTouched] = useState(false);

  const isOpen = presentation === 'inline' ? true : !!open;

  // Seed the next-step fields from the lead each time the composer opens so a
  // focus refetch mid-typing can't wipe what was typed (LeadEditSheet lesson).
  useEffect(() => {
    if (!isOpen) return;
    setStepText(currentNextStep?.text ?? '');
    setStepDue(currentNextStep?.due ?? '');
    setStepTouched(false);
    setKind(defaultKind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // The inline (desktop) composer stays mounted; when the Next-step card or a
  // saved touch changes the lead's step, follow it — unless the user is mid-edit.
  useEffect(() => {
    if (stepTouched) return;
    setStepText(currentNextStep?.text ?? '');
    setStepDue(currentNextStep?.due ?? '');
  }, [currentNextStep?.text, currentNextStep?.due, stepTouched]);

  const quickDue = useMemo(() => {
    const now = new Date();
    const tomorrow = nextBusinessDay(now);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return [
      { label: 'Next business day', value: toDueDateString(tomorrow) },
      { label: 'In a week', value: toDueDateString(nextWeek) },
    ];
  }, []);

  const reset = () => {
    setText('');
    setAttachments([]);
    setKind(defaultKind);
  };

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    const progress = files.length > 1 ? createUploadProgressToast(files.length) : null;
    const added: LeadTimelineAttachment[] = [];
    let failures = 0;
    try {
      for (const [index, file] of files.entries()) {
        progress?.progress(index + 1);
        const result = await upload({ bid_id: bidId, file, upload_source: 'web' });
        if (result) {
          added.push({
            media_id: result.id,
            file_type: result.file_type,
            file_name: result.file_name,
            url: result.file_url,
            thumbnail_url: result.thumbnail_url,
          });
        } else {
          failures += 1;
        }
      }
    } finally {
      setUploading(false);
    }
    if (added.length) setAttachments((prev) => [...prev, ...added]);
    if (progress) {
      if (failures) progress.warning(`Attached ${added.length} of ${files.length}`);
      else progress.success(`Attached ${added.length}`);
    } else if (failures) {
      toast.error('That file did not upload');
    }
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isAdding && !uploading;

  const handleSubmit = async () => {
    if (!canSend) return;
    const body = text.trim() || attachments.map((a) => a.file_name).join(', ');
    let nextStep: { text: string; due: string | null } | null | undefined;
    if (stepTouched) {
      nextStep = stepText.trim() || stepDue ? { text: stepText.trim(), due: stepDue || null } : null;
    }
    // Blur first so an iOS keyboard / dictation session tears down before the
    // sheet closes (Gotcha #71's lesson).
    (document.activeElement as HTMLElement | null)?.blur?.();
    try {
      await addTouch({ kind, body, attachments, nextStep });
    } catch {
      return; // the hook already toasted
    }
    reset();
    setStepTouched(false);
    onSubmitted?.();
    if (presentation === 'sheet') onOpenChange?.(false);
  };

  const appendTranscription = (t: string) => {
    setText((prev) => (prev ? `${prev}\n${t}` : t));
    textareaRef.current?.focus();
  };

  const form = (
    <div className="space-y-4">
      {/* What kind of touch */}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind of touch">
        {KIND_ORDER.map((k) => {
          const Icon = TOUCH_KIND_ICONS[k];
          const active = kind === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setKind(k)}
              className={cn(
                'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {TIMELINE_KIND_LABELS[k]}
            </button>
          );
        })}
      </div>

      {/* Words */}
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={presentation === 'sheet' ? 4 : 3}
          autoFocus={autoFocus}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <li key={a.media_id ?? a.file_name} className="flex items-center gap-1 rounded-md border bg-muted/40 pl-1 pr-1 text-xs">
                {a.file_type === 'image' && a.url ? (
                  <img src={a.thumbnail_url || a.url} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
                )}
                <span className="max-w-[140px] truncate">{a.file_name}</span>
                <button
                  type="button"
                  aria-label={`Detach ${a.file_name}`}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                  onClick={() => setAttachments((prev) => prev.filter((x) => x !== a))}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          <VoiceNoteButton onTranscription={appendTranscription} disabled={isAdding} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isAdding}
            aria-label="Attach a photo or file"
            title="Attach a photo or file"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFiles}
          />
          <span className="ml-auto text-[11px] text-muted-foreground">Ctrl+Enter to save</span>
        </div>
      </div>

      {/* Next step — asked on every save */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          Next step
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            aria-label="Next step"
            placeholder="e.g. Call Dan back with a date for the walk"
            value={stepText}
            onChange={(e) => { setStepText(e.target.value); setStepTouched(true); }}
          />
          <Input
            aria-label="Due date"
            type="date"
            className="sm:w-[160px]"
            value={stepDue}
            onChange={(e) => { setStepDue(e.target.value); setStepTouched(true); }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quickDue.map((q) => (
            <button
              key={q.value}
              type="button"
              onClick={() => { setStepDue(q.value); setStepTouched(true); }}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px]',
                stepDue === q.value ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              {q.label} · {format(new Date(q.value + 'T12:00:00'), 'EEE M/d')}
            </button>
          ))}
          {(stepText || stepDue) && (
            <button
              type="button"
              onClick={() => { setStepText(''); setStepDue(''); setStepTouched(true); }}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent"
            >
              Nothing scheduled
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {presentation === 'sheet' && (
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={isAdding}>
            Cancel
          </Button>
        )}
        <Button type="button" onClick={() => void handleSubmit()} disabled={!canSend} className="min-w-[120px]">
          {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Log {TIMELINE_KIND_LABELS[kind].toLowerCase()}
        </Button>
      </div>
    </div>
  );

  if (presentation === 'inline') return form;

  return (
    <Sheet open={!!open} onOpenChange={onOpenChange}>
      {/* Gotcha #72: width-capped bottom sheets center with inset-x-0 mx-auto, never a transform. */}
      <SheetContent
        side="bottom"
        className="inset-x-0 mx-auto flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-xl"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Log a touch</SheetTitle>
          <SheetDescription className="sr-only">Record a conversation and set the next step.</SheetDescription>
        </SheetHeader>
        <div className="mt-2">{form}</div>
      </SheetContent>
    </Sheet>
  );
}
