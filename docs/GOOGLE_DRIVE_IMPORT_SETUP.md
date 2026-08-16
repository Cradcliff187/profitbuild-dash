# Google Drive Import — One-Time Setup

The Drive import feature (Rule 40 in CLAUDE.md) ships dark. It needs three
public identifiers from a Google Cloud project before any button appears.
This is the checklist for creating them. Everything here is done once, in the
Google Cloud console, by whoever owns RCG's Google account.

**Total time: ~15 minutes.** Nothing here touches the app's users — each user
signs into their own Google account the first time they use the import button.

---

## 1. Create the Google Cloud project

1. Go to https://console.cloud.google.com signed in as the Google account that
   should own the integration (the account that owns RCG's Drive files is the
   natural choice).
2. Project picker (top bar) → **New Project** → name it `RCG Work` → Create.
3. On the new project's **Dashboard**, note the **Project number** (a plain
   number like `1043...`). This becomes `COMMITTED_APP_ID`.

## 2. Enable the two APIs

**APIs & Services → Library**, search and **Enable** each:

- **Google Picker API**
- **Google Drive API**

## 3. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen** (Google now calls this "Google Auth
Platform / Branding" in some accounts):

1. User type: **External** (Internal is only offered on Google Workspace
   accounts; if RCG ever moves company files to Workspace, Internal is even
   simpler).
2. App name: `RCG Work` · Support email: your email · Developer contact: your
   email. Leave logo empty (uploading one can trigger a brand review).
3. Scopes: **add nothing here.** The app requests the `drive.file` scope at
   runtime; it's non-sensitive, so no verification process applies.
4. **Publish the app** (Publishing status: *In production*, not *Testing*).
   Testing mode limits sign-ins to listed test users and expires grants after
   7 days.

## 4. Create the OAuth client ID

**APIs & Services → Credentials → Create credentials → OAuth client ID**:

- Application type: **Web application**, name `RCG Work web`.
- **Authorized JavaScript origins** — add both:
  - `https://rcgwork.com`
  - `http://localhost:5225`
- Authorized redirect URIs: **leave empty** (the token flow uses a popup, not
  a redirect).
- Copy the **Client ID** (ends in `.apps.googleusercontent.com`). This becomes
  `COMMITTED_CLIENT_ID`.

## 5. Create the API key

**Credentials → Create credentials → API key**, then **Edit** it immediately:

- Application restrictions: **Websites**, add `https://rcgwork.com/*` and
  `http://localhost:5225/*`.
- API restrictions: **Restrict key** → select **Google Picker API** only.
- Copy the key. This becomes `COMMITTED_API_KEY`.

## 6. Put the values in the app

Paste the three values into the constants at the top of
[`src/lib/googleDriveConfig.ts`](../src/lib/googleDriveConfig.ts)
(`COMMITTED_CLIENT_ID`, `COMMITTED_API_KEY`, `COMMITTED_APP_ID`) — or hand
them to a Claude session to do it. Then PR → merge → **Publish in Lovable**.

> Why committed constants and not env vars: Lovable strips `VITE_*` env vars
> from production builds (Gotcha #18). These are public browser identifiers —
> every deployed web app ships them in its JS bundle. Security comes from the
> origin/referrer restrictions set in steps 4–5, not from hiding the values.

## 7. Turn it on

In the app: **Settings → Feature Flags** (`/settings/feature-flags`) → enable
`google_drive_import`. Recommended rollout: a per-user override for yourself
first, sanity-check both surfaces, then flip the global toggle.

Where the buttons appear (desktop only, by design — phones already reach
Drive through the native file sheet on the existing Upload/Attach buttons):

- **Project Details → Documents** header: *Import from Drive* (multi-select;
  on the Drawings/Permits/Licenses tabs the imported docs get that type, on
  All they land as `other`).
- **Quote form / quote view → attachment card**: *Import quote from Google
  Drive* (single file; same PDF/image + 20MB rules as local upload).

First click per user: Google popup → pick account → Allow. The grant only
covers files that user explicitly picks — never their whole Drive.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Button doesn't appear at all | Flag off, credentials still blank in `googleDriveConfig.ts`, or you're on mobile (intentional). |
| Popup blocked | Browser blocked the Google sign-in popup — allow popups for rcgwork.com and click again. |
| `idpiframe / origin mismatch` style errors | The current origin isn't in the client ID's Authorized JavaScript origins (step 4). Remember `http://localhost:5225` for dev. |
| "Access blocked: app not verified" | Should not happen with `drive.file`. If it does, confirm no extra scopes were added on the consent screen (step 3). |
| Picker opens but downloads fail with 403 | API key restrictions too tight (must allow Google Picker API) or the file is a Google-native type with no export path (Forms etc. are skipped by design). |
