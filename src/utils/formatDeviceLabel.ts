// Parses a User-Agent (or similar device string) into a short, human-readable
// label for display — raw UA strings are ugly and uninformative in the UI.
//
// The raw UA stays in the DB (audit / forensics) — only the display layer
// formats. Falls back to the full string when we can't parse.
export function formatDeviceLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const ua = trimmed;

  // OS / device family
  let device: string | null = null;
  if (/iPad/i.test(ua)) device = "iPad";
  else if (/iPhone|iPod/i.test(ua)) device = "iPhone";
  else if (/Android/i.test(ua)) device = "Android";
  else if (/Macintosh|Mac OS X/i.test(ua)) device = "Mac";
  else if (/Windows/i.test(ua)) device = "Windows";
  else if (/Linux/i.test(ua)) device = "Linux";

  // Browser — order matters (Chrome includes "Safari" in UA, etc.)
  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  if (device && browser) return `${device} · ${browser}`;
  if (device) return device;
  if (browser) return browser;

  // Last-resort shortening — take up to the first parenthesis, max 40 chars.
  const short = ua.split("(")[0].trim() || ua;
  return short.length > 40 ? `${short.slice(0, 37)}…` : short;
}
