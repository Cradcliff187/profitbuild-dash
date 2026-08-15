import { describe, expect, it } from "vitest";
import {
  ensureFileExtension,
  resolveDriveDownloadPlan,
} from "./googleDriveImport";

describe("ensureFileExtension", () => {
  it("appends the extension when missing", () => {
    expect(ensureFileExtension("Kitchen Remodel Bid", ".pdf")).toBe(
      "Kitchen Remodel Bid.pdf"
    );
  });

  it("does not double-append (case-insensitive)", () => {
    expect(ensureFileExtension("plans.PDF", ".pdf")).toBe("plans.PDF");
    expect(ensureFileExtension("plans.pdf", ".pdf")).toBe("plans.pdf");
  });

  it("falls back to a stable name for blank input", () => {
    expect(ensureFileExtension("   ", ".pdf")).toBe("drive-file.pdf");
  });
});

describe("resolveDriveDownloadPlan", () => {
  it("plans a direct media download for binary files", () => {
    const plan = resolveDriveDownloadPlan({
      id: "abc123",
      name: "vendor-quote.pdf",
      mimeType: "application/pdf",
    });
    expect(plan.kind).toBe("media");
    if (plan.kind === "media") {
      expect(plan.url).toContain("/files/abc123?alt=media");
      expect(plan.url).toContain("supportsAllDrives=true");
      expect(plan.fileName).toBe("vendor-quote.pdf");
    }
  });

  it("exports Google Docs to PDF with a corrected extension", () => {
    const plan = resolveDriveDownloadPlan({
      id: "doc1",
      name: "Scope of Work",
      mimeType: "application/vnd.google-apps.document",
    });
    expect(plan.kind).toBe("export");
    if (plan.kind === "export") {
      expect(plan.url).toContain("/files/doc1/export?mimeType=");
      expect(plan.url).toContain(encodeURIComponent("application/pdf"));
      expect(plan.fileName).toBe("Scope of Work.pdf");
      expect(plan.mimeType).toBe("application/pdf");
    }
  });

  it("exports Google Sheets to XLSX, not PDF", () => {
    const plan = resolveDriveDownloadPlan({
      id: "sheet1",
      name: "Material Takeoff",
      mimeType: "application/vnd.google-apps.spreadsheet",
    });
    expect(plan.kind).toBe("export");
    if (plan.kind === "export") {
      expect(plan.fileName).toBe("Material Takeoff.xlsx");
      expect(plan.mimeType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    }
  });

  it("rejects folders with an actionable reason", () => {
    const plan = resolveDriveDownloadPlan({
      id: "f1",
      name: "Job Folder",
      mimeType: "application/vnd.google-apps.folder",
    });
    expect(plan.kind).toBe("unsupported");
  });

  it("rejects Google-native types with no file representation", () => {
    const plan = resolveDriveDownloadPlan({
      id: "form1",
      name: "Safety Checklist",
      mimeType: "application/vnd.google-apps.form",
    });
    expect(plan.kind).toBe("unsupported");
    if (plan.kind === "unsupported") {
      expect(plan.reason).toContain("form");
    }
  });

  it("URL-encodes file ids", () => {
    const plan = resolveDriveDownloadPlan({
      id: "weird/id",
      name: "x.pdf",
      mimeType: "application/pdf",
    });
    if (plan.kind === "media") {
      expect(plan.url).toContain("weird%2Fid");
    }
  });
});
