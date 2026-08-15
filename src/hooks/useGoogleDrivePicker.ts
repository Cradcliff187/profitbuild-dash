import { useCallback, useState } from "react";
import {
  googleDriveConfig,
  GOOGLE_DRIVE_SCOPE,
  isDriveImportConfigured,
} from "@/lib/googleDriveConfig";
import {
  downloadDriveFile,
  DRIVE_IMPORT_MAX_BYTES,
  type PickedDriveDoc,
} from "@/utils/googleDriveImport";

/**
 * Google Drive Picker flow: load Google's scripts on demand, get a drive.file
 * access token via the GIS token client, open the Picker, download each picked
 * file into a browser File for the existing upload pipelines.
 *
 * House rules honored:
 * - Scripts are injected dynamically — index.html is never touched (Gotcha #31:
 *   Lovable's Publish dialog rewrites managed head tags).
 * - The access token lives in module memory only, NEVER localStorage — a
 *   persisted token would leak across users on a shared device (Gotcha #67).
 * - No auth.getUser()/realtime anywhere on this path (Gotchas #53/#63).
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";

const scriptPromises = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = scriptPromises.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      // Allow a retry on the next call instead of caching the failure forever.
      scriptPromises.delete(src);
      reject(new Error("Couldn't load Google scripts — check your connection"));
    };
    document.head.appendChild(el);
  });
  scriptPromises.set(src, promise);
  return promise;
}

let pickerModulePromise: Promise<void> | null = null;

function loadPickerModule(): Promise<void> {
  if (!pickerModulePromise) {
    pickerModulePromise = loadScript(GAPI_SRC).then(
      () =>
        new Promise<void>((resolve) => {
          window.gapi!.load("picker", () => resolve());
        })
    );
  }
  return pickerModulePromise;
}

/**
 * Warm both Google scripts so the click-time token request runs inside the
 * user-gesture window (popup blockers kill token popups that open after a
 * long async gap). Call from the import button's mount effect. Silent on
 * failure — the click path surfaces the real error.
 */
export function preloadDrivePicker(): void {
  if (!isDriveImportConfigured()) return;
  loadScript(GIS_SRC).catch(() => {});
  loadPickerModule().catch(() => {});
}

// In-memory only (see header comment). 60s early-expiry margin.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  await loadScript(GIS_SRC);
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Google sign-in script failed to load");
  }
  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: googleDriveConfig.clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                "Google sign-in was cancelled"
            )
          );
          return;
        }
        const expiresIn = Number(response.expires_in) || 3600;
        cachedToken = {
          token: response.access_token,
          expiresAt: Date.now() + expiresIn * 1000,
        };
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error?.message || "Google sign-in was cancelled"));
      },
    });
    client.requestAccessToken();
  });
}

function openPicker(
  token: string,
  multiple: boolean
): Promise<PickedDriveDoc[]> {
  return new Promise((resolve, reject) => {
    const picker = window.google?.picker;
    if (!picker) {
      reject(new Error("Google Picker failed to load"));
      return;
    }
    const view = new picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);
    const builder = new picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(googleDriveConfig.apiKey)
      .addView(view)
      .enableFeature(picker.Feature.SUPPORT_DRIVES)
      .setTitle("Select from Google Drive")
      // Response JSON uses plain keys: { action, docs: [{ id, name, mimeType }] }
      .setCallback((data: {
        action?: string;
        docs?: Array<{ id?: string; name?: string; mimeType?: string }>;
      }) => {
        if (data.action === picker.Action.PICKED) {
          resolve(
            (data.docs || []).map((doc) => ({
              id: doc.id,
              name: doc.name || "drive-file",
              mimeType: doc.mimeType || "application/octet-stream",
            }))
          );
        } else if (data.action === picker.Action.CANCEL) {
          resolve([]);
        }
      });
    if (googleDriveConfig.appId) {
      builder.setAppId(googleDriveConfig.appId);
    }
    if (multiple) {
      builder.enableFeature(picker.Feature.MULTISELECT_ENABLED);
    }
    builder.build().setVisible(true);
  });
}

export interface DrivePickOptions {
  multiple?: boolean;
  maxBytes?: number;
}

export interface DrivePickResult {
  files: File[];
  /** Per-file problems (unsupported type, too large, download failure). */
  skipped: { name: string; reason: string }[];
}

export function useGoogleDrivePicker() {
  const [isBusy, setIsBusy] = useState(false);

  /**
   * Opens the auth popup (first use) + Picker, then downloads the selection.
   * Resolves { files: [] } on user cancel. THROWS on auth/script failures —
   * callers own the error toast (Gotcha #42: one layer owns user feedback).
   */
  const pickFiles = useCallback(
    async ({
      multiple = false,
      maxBytes = DRIVE_IMPORT_MAX_BYTES,
    }: DrivePickOptions = {}): Promise<DrivePickResult> => {
      if (!isDriveImportConfigured()) {
        return { files: [], skipped: [] };
      }
      setIsBusy(true);
      try {
        const [token] = await Promise.all([
          getAccessToken(),
          loadPickerModule(),
        ]);
        const docs = await openPicker(token, multiple);
        const files: File[] = [];
        const skipped: DrivePickResult["skipped"] = [];
        // Sequential on purpose — mirrors the house multi-file upload pattern
        // (Rule 22) and keeps memory bounded on big batches.
        for (const doc of docs) {
          const { file, skippedReason } = await downloadDriveFile(
            doc,
            token,
            maxBytes
          );
          if (file) {
            files.push(file);
          } else {
            skipped.push({ name: doc.name, reason: skippedReason || "Skipped" });
          }
        }
        return { files, skipped };
      } finally {
        setIsBusy(false);
      }
    },
    []
  );

  return { pickFiles, isBusy };
}
