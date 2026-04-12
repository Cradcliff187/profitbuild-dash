import type { MentionableUser } from '@/types/notification';

// Regex for stored mention tokens: @[Display Name](userId)
const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parse stored @[Name](id) tokens from note text.
 */
export function parseMentions(text: string): { name: string; userId: string }[] {
  const mentions: { name: string; userId: string }[] = [];
  let match;
  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g');
  while ((match = regex.exec(text)) !== null) {
    mentions.push({ name: match[1], userId: match[2] });
  }
  return mentions;
}

/**
 * Resolve typed @Name references in raw text against the user list.
 * Returns formatted text with @[Name](id) tokens + list of mentioned user IDs.
 */
export function resolveMentions(
  rawText: string,
  users: MentionableUser[]
): { formattedText: string; mentionedUserIds: string[] } {
  const mentionedUserIds: string[] = [];
  let formattedText = rawText;

  // Sort by name length (longest first) to avoid partial matches
  const sortedUsers = [...users].sort(
    (a, b) => b.display_name.length - a.display_name.length
  );

  for (const user of sortedUsers) {
    // Match @Name (case-insensitive, word boundary after @)
    const escapedName = user.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`@${escapedName}(?![\\w])`, 'gi');

    if (regex.test(formattedText)) {
      formattedText = formattedText.replace(
        regex,
        `@[${user.display_name}](${user.user_id})`
      );
      if (!mentionedUserIds.includes(user.user_id)) {
        mentionedUserIds.push(user.user_id);
      }
    }
  }

  return { formattedText, mentionedUserIds };
}

/**
 * Render note text with mentions as an array of React-renderable parts.
 * Mentions become objects with name/userId; plain text stays as strings.
 */
export function splitTextAndMentions(
  text: string
): Array<{ type: 'text'; content: string } | { type: 'mention'; name: string; userId: string }> {
  const parts: Array<{ type: 'text'; content: string } | { type: 'mention'; name: string; userId: string }> = [];
  const regex = new RegExp(MENTION_TOKEN_REGEX.source, 'g');
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this mention
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'mention', name: match[1], userId: match[2] });
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}
