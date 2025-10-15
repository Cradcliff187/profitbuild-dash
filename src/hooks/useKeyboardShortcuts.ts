import { useEffect } from 'react';

interface KeyboardShortcutHandlers {
  onClockIn?: () => void;
  onClockOut?: () => void;
  onManualEntry?: () => void;
  onSearch?: () => void;
  onApprove?: () => void;
}

/**
 * Hook to enable keyboard shortcuts for time tracker
 * 
 * Shortcuts:
 * - Ctrl/Cmd + I: Clock In
 * - Ctrl/Cmd + O: Clock Out
 * - Ctrl/Cmd + M: Manual Entry
 * - Ctrl/Cmd + K: Search (future)
 * - Ctrl/Cmd + A: Approve Queue
 */
export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (isMod && e.key === 'i') {
        e.preventDefault();
        handlers.onClockIn?.();
      }

      if (isMod && e.key === 'o') {
        e.preventDefault();
        handlers.onClockOut?.();
      }

      if (isMod && e.key === 'm') {
        e.preventDefault();
        handlers.onManualEntry?.();
      }

      if (isMod && e.key === 'k') {
        e.preventDefault();
        handlers.onSearch?.();
      }

      if (isMod && e.key === 'a' && e.shiftKey) {
        e.preventDefault();
        handlers.onApprove?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};
