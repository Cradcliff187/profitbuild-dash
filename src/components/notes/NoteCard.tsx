import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, MoreVertical, Pencil, Trash2, Maximize2, FileText, Download, Eye } from 'lucide-react';
import { ProjectNote } from '@/types/projectNote';
import { splitTextAndMentions } from '@/utils/mentionUtils';

export type NoteCardVariant = 'default' | 'compact';

interface NoteCardProps {
  note: ProjectNote;
  variant?: NoteCardVariant;
  editingNoteId: string | null;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEdit: (note: ProjectNote) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onEnlargeImage?: (url: string) => void;
  onEnlargeVideo?: (url: string) => void;
  onPreviewPdf?: (url: string, name: string | null | undefined) => void;
  formatTimestamp: (ts: string | null | undefined) => string;
}

// Tailwind class maps per variant
const styles = {
  default: {
    card: 'p-2 hover:bg-accent/50 transition-colors group',
    avatar: 'h-7 w-7',
    avatarText: 'text-[10px]',
    name: 'text-xs font-semibold',
    timestamp: 'text-[10px]',
    timestampIcon: 'h-2.5 w-2.5',
    menuButton: 'h-5 w-5 p-0 opacity-0 group-hover:opacity-100',
    menuIcon: 'h-3.5 w-3.5',
    menuItemIcon: 'h-3 w-3 mr-2',
    noteText: 'text-xs leading-snug whitespace-pre-wrap',
    editTextarea: 'text-xs min-h-[60px]',
    editButton: 'h-6 text-[10px] px-2',
    imageMax: 'max-w-[180px]',
    enlargeIcon: 'w-4 h-4',
    fileText: 'text-xs',
    fileIcon: 'w-4 h-4',
  },
  compact: {
    card: 'p-1.5 hover:bg-accent/30 transition-colors group',
    avatar: 'h-5 w-5',
    avatarText: 'text-[8px]',
    name: 'text-[10px] font-semibold',
    timestamp: 'text-[9px]',
    timestampIcon: 'h-2 w-2',
    menuButton: 'h-4 w-4 p-0 opacity-0 group-hover:opacity-100',
    menuIcon: 'h-3 w-3',
    menuItemIcon: 'h-2.5 w-2.5 mr-1.5',
    noteText: 'text-[11px] leading-tight whitespace-pre-wrap line-clamp-3',
    editTextarea: 'text-[11px] min-h-[50px]',
    editButton: 'h-5 text-[9px] px-1.5',
    imageMax: 'max-w-[120px]',
    enlargeIcon: 'w-3 h-3',
    fileText: 'text-[10px]',
    fileIcon: 'w-3 h-3',
  },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isPdfFile(fileName: string | null | undefined): boolean {
  if (!fileName) return false;
  return fileName.toLowerCase().endsWith('.pdf');
}

export function NoteCard({
  note,
  variant = 'default',
  editingNoteId,
  editText,
  onEditTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEnlargeImage,
  onEnlargeVideo,
  onPreviewPdf,
  formatTimestamp,
}: NoteCardProps) {
  const s = styles[variant];
  const displayName =
    note.profiles?.full_name || note.profiles?.email || 'Unknown User';
  const initials = getInitials(displayName);
  const isEditing = editingNoteId === note.id;

  return (
    <Card className={s.card}>
      <div className="flex items-start gap-2">
        <Avatar className={`${s.avatar} flex-shrink-0`}>
          <AvatarFallback className={`${s.avatarText} font-medium bg-primary/10 text-primary`}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className={`${s.name} truncate text-foreground`}>
              {displayName}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-0.5 ${s.timestamp} text-muted-foreground`}>
                <Clock className={s.timestampIcon} />
                <span>{formatTimestamp(note.created_at)}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className={s.menuButton}>
                    <MoreVertical className={s.menuIcon} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onStartEdit(note)}>
                    <Pencil className={s.menuItemIcon} />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 className={s.menuItemIcon} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-1">
              <Textarea
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                className={s.editTextarea}
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={onSaveEdit} className={s.editButton}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit} className={s.editButton}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className={`${s.noteText} text-foreground`}>
                {splitTextAndMentions(note.note_text).map((part, i) =>
                  part.type === 'mention' ? (
                    <span key={i} className="font-semibold text-primary bg-primary/10 px-0.5 rounded">
                      @{part.name}
                    </span>
                  ) : (
                    <span key={i}>{part.content}</span>
                  )
                )}
              </p>
              {note.attachment_url && (
                <div className="mt-1.5">
                  {note.attachment_type === 'image' ? (
                    <div
                      className="relative inline-block group/img cursor-pointer"
                      onClick={() => onEnlargeImage?.(note.attachment_url!)}
                    >
                      <img
                        src={note.attachment_url}
                        alt="Note attachment"
                        className={`w-full ${s.imageMax} rounded border hover:opacity-90 transition-opacity`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/20 rounded">
                        <Maximize2 className={`${s.enlargeIcon} text-white`} />
                      </div>
                    </div>
                  ) : note.attachment_type === 'video' ? (
                    <div
                      className="relative inline-block group/vid cursor-pointer"
                      onClick={() => onEnlargeVideo?.(note.attachment_url!)}
                    >
                      <video
                        src={note.attachment_url}
                        className={`w-full ${s.imageMax} rounded border`}
                        controls
                      />
                      <div className="absolute top-1 right-1 bg-black/60 rounded p-0.5 opacity-0 group-hover/vid:opacity-100 transition-opacity">
                        <Maximize2 className={`${s.enlargeIcon} text-white`} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {isPdfFile(note.attachment_name) && onPreviewPdf && (
                        <Button
                          onClick={() => onPreviewPdf(note.attachment_url!, note.attachment_name)}
                          size="sm"
                          variant="outline"
                          className="min-h-[44px]"
                        >
                          <Eye className={`${s.fileIcon} mr-1`} />
                          Preview
                        </Button>
                      )}
                      <a
                        href={note.attachment_url}
                        download={note.attachment_name}
                        className={`flex items-center gap-2 p-1.5 bg-muted rounded border hover:bg-muted/80 transition-colors ${s.fileText} flex-1`}
                      >
                        <FileText className={`${s.fileIcon} text-muted-foreground`} />
                        <span className="truncate">{note.attachment_name || 'Download file'}</span>
                        <Download className={`${s.fileIcon} text-muted-foreground ml-auto`} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
