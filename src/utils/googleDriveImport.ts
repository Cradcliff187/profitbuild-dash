/**
 * Pure helpers for the Google Drive import flow (no DOM, no network mocking
 * needed except downloadDriveFile). The hook (useGoogleDrivePicker) owns
 * scripts/auth/picker; these helpers own "picked doc → downloadable File".
 */

export interface PickedDriveDoc {
  id: string;
  name: string;
  mimeType: string;
}

export const GOOGLE_APPS_MIME_PREFIX = "application/vnd.google-apps.";

interface ExportTarget {
  exportMimeType: string;
  extension: string;
}

/**
 * Google-native formats have no bytes to download — they must be exported.
 * Docs/Slides/Drawings export to PDF (fits the existing preview pipeline and
 * freezes the content at time of import); Sheets export to XLSX because a PDF
 * of a spreadsheet is unusable. Anything else Google-native (Forms, Maps,
 * Sites…) has no meaningful file representation and is skipped.
 */
const GOOGLE_NATIVE_EXPORTS: Record<string, ExportTarget> = {
  "application/vnd.google-apps.document": {
    exportMimeType: "application/pdf",
    extension: ".pdf",
  },
  "application/vnd.google-apps.spreadsheet": {
    exportMimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    exportMimeType: "application/pdf",
    extension: ".pdf",
  },
  "application/vnd.google-apps.drawing": {
    exportMimeType: "application/pdf",
    extension: ".pdf",
  },
};

export type DriveDownloadPlan =
  | { kind: "media"; url: string; fileName: string }
  | { kind: "export"; url: string; fileName: string; mimeType: string }
  | { kind: "unsupported"; reason: string };

export function ensureFileExtension(name: string, extension: string): string {
  const trimmed = name.trim() || "drive-file";
  return trimmed.toLowerCase().endsWith(extension.toLowerCase())
    ? trimmed
    : `${trimmed}${extension}`;
}

export function resolveDriveDownloadPlan(
  doc: Pick<PickedDriveDoc, "id" | "name" | "mimeType">
): DriveDownloadPlan {
  if (doc.mimeType === "application/vnd.google-apps.folder") {
    return {
      kind: "unsupported",
      reason: "Folders can't be imported — pick the files inside instead",
    };
  }
  if (doc.mimeType.startsWith(GOOGLE_APPS_MIME_PREFIX)) {
    const target = GOOGLE_NATIVE_EXPORTS[doc.mimeType];
    if (!target) {
      const kind = doc.mimeType.slice(GOOGLE_APPS_MIME_PREFIX.length);
      return {
        kind: "unsupported",
        reason: `Google ${kind} files can't be imported as documents`,
      };
    }
    return {
      kind: "export",
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}/export?mimeType=${encodeURIComponent(target.exportMimeType)}`,
      fileName: ensureFileExtension(doc.name, target.extension),
      mimeType: target.exportMimeType,
    };
  }
  // Regular binary file (PDF, image, docx…): download bytes as-is.
  // supportsAllDrives so shared-drive files work.
  return {
    kind: "media",
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media&supportsAllDrives=true`,
    fileName: doc.name.trim() || "drive-file",
  };
}

/** Matches the house 20MB upload cap used by DocumentUpload/QuoteAttachmentUpload. */
export const DRIVE_IMPORT_MAX_BYTES = 20 * 1024 * 1024;

export interface DriveDownloadResult {
  file: File | null;
  skippedReason: string | null;
}

/**
 * Downloads (or exports) one picked Drive doc into a browser File, ready for
 * the existing upload pipelines. Never throws for a per-file problem — returns
 * a skippedReason instead so a multi-select batch survives one bad file.
 */
export async function downloadDriveFile(
  doc: PickedDriveDoc,
  accessToken: string,
  maxBytes: number = DRIVE_IMPORT_MAX_BYTES
): Promise<DriveDownloadResult> {
  const plan = resolveDriveDownloadPlan(doc);
  if (plan.kind === "unsupported") {
    return { file: null, skippedReason: plan.reason };
  }
  try {
    const response = await fetch(plan.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return {
        file: null,
        skippedReason: `Google Drive download failed (HTTP ${response.status})`,
      };
    }
    const blob = await response.blob();
    if (blob.size > maxBytes) {
      const mb = Math.round(maxBytes / 1024 / 1024);
      return { file: null, skippedReason: `File is larger than ${mb}MB` };
    }
    const mimeType =
      plan.kind === "export"
        ? plan.mimeType
        : blob.type || "application/octet-stream";
    return {
      file: new File([blob], plan.fileName, { type: mimeType }),
      skippedReason: null,
    };
  } catch (error) {
    console.error("downloadDriveFile failed:", error);
    return { file: null, skippedReason: "Network error downloading from Google Drive" };
  }
}
