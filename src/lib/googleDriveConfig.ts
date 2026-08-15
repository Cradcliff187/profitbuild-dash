/**
 * Google Drive import — client configuration.
 *
 * These are PUBLIC browser identifiers, not secrets: every deployed SPA ships
 * its OAuth client ID and browser API key in the bundle. Security comes from
 * the Google Cloud console restrictions (authorized JavaScript origins on the
 * client ID; HTTP-referrer + API restrictions on the API key), not from hiding
 * the values.
 *
 * They are committed constants (with an env override for local dev) because
 * Lovable's build strips/overrides VITE_* env vars (Gotcha #18), so env vars
 * cannot deliver these values to production.
 *
 * Values come from the RCG Google Cloud project — see
 * docs/GOOGLE_DRIVE_IMPORT_SETUP.md for the one-time console setup. Until they
 * are filled in, every Drive-import affordance renders nothing.
 */

// Google Cloud OAuth 2.0 Web client ID (…apps.googleusercontent.com)
const COMMITTED_CLIENT_ID = "";
// Browser API key, restricted to the Picker API + rcgwork.com/localhost referrers
const COMMITTED_API_KEY = "";
// Google Cloud project NUMBER (not the id). Recommended with the drive.file
// scope so picked files get durably authorized to this app.
const COMMITTED_APP_ID = "";

export const googleDriveConfig = {
  clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || COMMITTED_CLIENT_ID,
  apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || COMMITTED_API_KEY,
  appId: import.meta.env.VITE_GOOGLE_DRIVE_APP_ID || COMMITTED_APP_ID,
};

/**
 * The drive.file scope only grants access to files the user explicitly picks
 * in the Google Picker — never the whole Drive. It is a non-sensitive scope,
 * which is what keeps the OAuth consent screen out of Google's app-verification
 * process entirely.
 */
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export function isDriveImportConfigured(): boolean {
  return Boolean(googleDriveConfig.clientId && googleDriveConfig.apiKey);
}
