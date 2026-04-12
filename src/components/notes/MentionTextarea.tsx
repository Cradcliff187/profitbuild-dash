import { useState, useRef, useCallback } from 'react';
import { AtSign } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import type { MentionableUser } from '@/types/notification';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  mentionableUsers: MentionableUser[];
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  className,
  disabled,
  mentionableUsers,
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filter, setFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<number>(0);
  const mentionStartRef = useRef<number>(-1);
  const isMobile = useIsMobile();

  const filteredUsers = mentionableUsers.filter((u) =>
    u.display_name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    cursorPosRef.current = cursorPos;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Find the last @ that isn't inside a resolved mention token
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    // Check if there's a space before @ (or it's the start)
    const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
    if (charBefore !== ' ' && charBefore !== '\n' && lastAtIndex !== 0) {
      setShowSuggestions(false);
      return;
    }

    // Check if already resolved (followed by [...])
    const textAfterAt = value.slice(lastAtIndex);
    if (textAfterAt.match(/^@\[[^\]]+\]\([^)]+\)/)) {
      setShowSuggestions(false);
      return;
    }

    const query = textBeforeCursor.slice(lastAtIndex + 1);

    // Abandon mention if query contains a newline or has 3+ words (names are max 2 words)
    const wordCount = query.trim().split(/\s+/).length;
    if (query.includes('\n') || wordCount > 2) {
      setShowSuggestions(false);
      return;
    }

    // Also abandon if query is long enough but has zero matches
    const hasMatches = query.length === 0 || mentionableUsers.some((u) =>
      u.display_name.toLowerCase().includes(query.toLowerCase())
    );
    if (!hasMatches && query.length > 2) {
      setShowSuggestions(false);
      return;
    }

    mentionStartRef.current = lastAtIndex;
    setFilter(query);
    setShowSuggestions(true);
  }, [value, mentionableUsers]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Delay input handling to next tick so selectionStart is updated
    setTimeout(handleInput, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close suggestions on Escape
    if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false);
      e.preventDefault();
    }
  };

  const insertMention = (user: MentionableUser) => {
    const start = mentionStartRef.current;
    if (start === -1) return;

    const cursorPos = cursorPosRef.current;
    const before = value.slice(0, start);
    const after = value.slice(cursorPos);
    const mentionText = `@${user.display_name} `;

    onChange(before + mentionText + after);
    setShowSuggestions(false);
    setFilter('');
    mentionStartRef.current = -1;

    // Refocus textarea after selection
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newPos = start + mentionText.length;
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  const suggestionList = (
    <div className="space-y-1">
      {filteredUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No matching team members</p>
      ) : (
        filteredUsers.map((user) => (
          <button
            key={user.user_id}
            onClick={() => insertMention(user)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors text-left min-h-[44px]"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-primary">
                {user.display_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.display_name}</p>
              {user.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  );

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
        disabled={disabled}
      />

      {/* Hint: @ to mention */}
      {!disabled && !showSuggestions && value.length === 0 && (
        <div className="absolute bottom-1.5 right-2 flex items-center gap-1 text-[10px] text-muted-foreground/50 pointer-events-none">
          <AtSign className="h-2.5 w-2.5" />
          <span>to mention</span>
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <Sheet open={showSuggestions} onOpenChange={setShowSuggestions}>
          <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[50vh]">
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <SheetHeader className="px-4 pt-1 pb-2">
              <SheetTitle className="text-left text-sm">Tag a team member</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-2">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search..."
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <ScrollArea className="px-4 pb-4 max-h-[30vh]">
              {suggestionList}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop: floating dropdown */}
      {!isMobile && showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg max-h-[200px] overflow-auto">
          <div className="p-1">
            {suggestionList}
          </div>
        </div>
      )}
    </div>
  );
}
