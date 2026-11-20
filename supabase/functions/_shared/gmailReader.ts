// supabase/functions/_shared/gmailReader.ts
//
// Read-only Gmail reader for one mailbox, used by scheduled functions.
//
// First user: lead-alert (outside mail to the info@ addresses, every minute).
// Built so the CRM mail logger (handoffs/rcg-work-crm-build.md) can use the
// same reader with its own cursor row in public.mail_sync_state.
//
// Auth: a service account with domain-wide delegation for gmail.readonly only.
// Its JSON key is a function secret and is never written anywhere else. The
// reader asks Google for a short-lived token as the mailbox owner; nothing
// here can send, change, label or delete mail.
//
// Nothing in this file stores mail. Callers decide what to keep.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://gmail.googleapis.com/gmail/v1/users';
const READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const CALL_TIMEOUT_MS = 12_000;

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  /** When Gmail received it. */
  receivedAt: string;
  /** Header names lower-cased. A header that repeats keeps every value, joined with ", ". */
  headers: Record<string, string>;
  /** Gmail's own one-line preview. */
  snippet: string;
  /** Plain text of the body. Only filled by getMessage(..., 'full'). */
  text: string;
}

export class GmailError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function timed(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const b64url = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const b64urlText = (text: string): string => b64url(new TextEncoder().encode(text));

function fromB64url(data: string): Uint8Array {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const tokens = new Map<string, { token: string; expiresAt: number }>();

/**
 * A short-lived read-only token for one mailbox. Kept in memory until two
 * minutes before it runs out, so Google sees about one token request an hour.
 */
export async function gmailToken(serviceAccountJson: string, mailbox: string): Promise<string> {
  const cached = tokens.get(mailbox);
  if (cached && cached.expiresAt - Date.now() > 120_000) return cached.token;

  let sa: { client_email?: string; private_key?: string };
  try {
    sa = JSON.parse(serviceAccountJson);
  } catch (_e) {
    throw new GmailError('the Gmail key is not valid JSON', 0);
  }
  if (!sa.client_email || !sa.private_key) throw new GmailError('the Gmail key is missing its e-mail or private key', 0);

  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
    '.' +
    b64urlText(JSON.stringify({ iss: sa.client_email, sub: mailbox, scope: READONLY_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    fromB64url(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));

  const res = await timed(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // unauthorized_client = the Admin console grant for this key's client id is missing or lacks gmail.readonly.
    throw new GmailError(`Gmail sign-in refused (${res.status} ${body?.error ?? 'unknown'})`, res.status);
  }
  const data = await res.json();
  tokens.set(mailbox, { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 });
  return data.access_token;
}

async function call(token: string, mailbox: string, path: string): Promise<Record<string, unknown>> {
  const res = await timed(`${API}/${encodeURIComponent(mailbox)}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    if (res.status === 401) tokens.delete(mailbox);
    throw new GmailError(`Gmail read failed (${res.status} on ${path.split('?')[0]})`, res.status);
  }
  return await res.json();
}

/** The mailbox's newest history id: the starting point for a new cursor. */
export async function currentHistoryId(token: string, mailbox: string): Promise<string> {
  const data = await call(token, mailbox, 'profile');
  return String(data.historyId);
}

/**
 * Ids of every message added to the mailbox since a history id, Spam included.
 * `expired` means Gmail no longer keeps history that far back: the caller
 * starts a new cursor and covers the gap with searchIds().
 */
export async function addedSince(
  token: string,
  mailbox: string,
  historyId: string,
): Promise<{ ids: string[]; historyId: string; expired: boolean }> {
  const ids = new Set<string>();
  let newest = historyId;
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    let data: Record<string, unknown>;
    try {
      data = await call(
        token,
        mailbox,
        `history?startHistoryId=${encodeURIComponent(historyId)}&historyTypes=messageAdded&maxResults=500` +
          (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''),
      );
    } catch (e) {
      if (e instanceof GmailError && e.status === 404) return { ids: [], historyId, expired: true };
      throw e;
    }
    for (const h of (data.history as { messagesAdded?: { message?: { id?: string } }[] }[] | undefined) ?? []) {
      for (const added of h.messagesAdded ?? []) if (added.message?.id) ids.add(added.message.id);
    }
    if (data.historyId) newest = String(data.historyId);
    pageToken = (data.nextPageToken as string | undefined) ?? '';
    if (!pageToken) break;
  }
  return { ids: [...ids], historyId: newest, expired: false };
}

/** Ids of messages matching a Gmail search, Spam and Trash included. Newest first. */
export async function searchIds(token: string, mailbox: string, query: string, max = 100): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = '';
  while (ids.length < max) {
    const data = await call(
      token,
      mailbox,
      `messages?q=${encodeURIComponent(query)}&includeSpamTrash=true&maxResults=${Math.min(100, max - ids.length)}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''),
    );
    for (const m of (data.messages as { id: string }[] | undefined) ?? []) ids.push(m.id);
    pageToken = (data.nextPageToken as string | undefined) ?? '';
    if (!pageToken) break;
  }
  return ids;
}

interface Part {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string };
  parts?: Part[];
}

function decodeBody(part: Part): string {
  if (!part.body?.data) return '';
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(fromB64url(part.body.data));
  } catch (_e) {
    return '';
  }
}

function findText(part: Part, mime: string): string {
  if (part.mimeType === mime && !part.filename) {
    const text = decodeBody(part);
    if (text.trim()) return text;
  }
  for (const child of part.parts ?? []) {
    const text = findText(child, mime);
    if (text) return text;
  }
  return '';
}

function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/**
 * One message, or null when it no longer exists.
 * 'headers' fetches the headers and Gmail's preview only (no body leaves Google).
 * 'full' also fetches the body as plain text.
 */
export async function getMessage(
  token: string,
  mailbox: string,
  id: string,
  detail: 'headers' | 'full',
): Promise<GmailMessage | null> {
  let data: Record<string, unknown>;
  try {
    data = await call(token, mailbox, `messages/${encodeURIComponent(id)}?format=${detail === 'full' ? 'full' : 'metadata'}`);
  } catch (e) {
    if (e instanceof GmailError && e.status === 404) return null;
    throw e;
  }
  const payload = (data.payload ?? {}) as Part;
  const headers: Record<string, string> = {};
  for (const h of payload.headers ?? []) {
    const name = h.name.toLowerCase();
    headers[name] = headers[name] ? `${headers[name]}, ${h.value}` : h.value;
  }
  let text = '';
  if (detail === 'full') {
    text = findText(payload, 'text/plain') || htmlToText(findText(payload, 'text/html'));
    text = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  return {
    id: String(data.id),
    threadId: String(data.threadId ?? ''),
    labelIds: (data.labelIds as string[] | undefined) ?? [],
    receivedAt: new Date(Number(data.internalDate ?? Date.now())).toISOString(),
    headers,
    snippet: String(data.snippet ?? ''),
    text,
  };
}

/** Every e-mail address in a header value, lower-cased. */
export function addressesIn(value: string | undefined): string[] {
  if (!value) return [];
  return (value.match(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []).map((a) => a.toLowerCase());
}

/** The display name of a From header, without quotes or a mailing list's "via ..." suffix. */
export function displayName(from: string | undefined): string | null {
  if (!from) return null;
  const name = from
    .replace(/<[^>]*>/g, '')
    .replace(/\s+via\s+.+$/i, '')
    .replace(/^[\s"']+|[\s"']+$/g, '')
    .trim();
  return name && !name.includes('@') ? name : null;
}
