# See latest code in dev (no stale cache)

If you don't see recent UI/code changes in the browser:

1. **Stop the dev server** (Ctrl+C in the terminal).

2. **Clear any existing service worker** (one-time, for the tab that had the app):
   - Open http://localhost:5173
   - F12 → **Application** tab → **Service Workers**
   - Click **Unregister** for localhost if one is listed
   - Or **Application** → **Storage** → **Clear site data**

3. **Start dev again:** `npm run dev`

4. **Hard reload:** Ctrl+Shift+R (or Ctrl+F5) so the browser doesn’t use cached JS.

In dev, the PWA service worker is now disabled, so future runs won’t cache old bundles.
