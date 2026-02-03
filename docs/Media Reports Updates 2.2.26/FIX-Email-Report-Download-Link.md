# FIX — Report Generation Must Save PDF to Project Documents + Email Must Include Download Link

## Problem
1. **Neither delivery path saves the PDF** — generated reports are not stored anywhere. No record in project documents, nothing in Storage. The report vanishes after download.
2. **Email delivery sends no report** — recipient gets a branded notification with project metadata but no PDF attachment or download link. Just says "use the portal."

## Solution
**Both paths** (Download and Email) must:
1. Generate PDF as a blob (not auto-download)
2. Upload blob to `project-documents` Storage bucket
3. Insert a record into `project_documents` table with `document_type: 'report'`
4. **Download path:** Also trigger browser download of the same blob
5. **Email path:** Also send email with a signed download URL

This means every generated report appears in Documents Hub → "All" tab automatically (via existing `ProjectDocumentsTimeline` query).

## Risk Level: Medium — modifies report generation flow, adds storage upload + DB insert
## Estimated Time: 60-90 minutes

---

## Global Rules

1. Follow `.cursorrules` in repo root for all project conventions
2. Use Supabase MCP for any database migrations or edge function deployments (NOT CLI commands)
3. Edge function imports must be pinned with explicit versions — check existing edge functions to match their import pattern exactly

---

## Part 1: Add 'report' to DocumentType

### File: `src/types/document.ts`

The `document_type` column in the DB is a plain string (no PostgreSQL enum constraint), so this is purely a frontend type change.

**Add 'report' to the DocumentType union:**

```typescript
export type DocumentType = 
  | 'drawing' 
  | 'permit' 
  | 'license' 
  | 'contract' 
  | 'specification' 
  | 'report'    // ← ADD THIS
  | 'other';
```

**Add label and icon:**

```typescript
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  drawing: 'Drawing/Plan',
  permit: 'Permit',
  license: 'License',
  contract: 'Contract',
  specification: 'Specification',
  report: 'Report',       // ← ADD THIS
  other: 'Other'
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  drawing: '📐',
  permit: '📋',
  license: '📜',
  contract: '📄',
  specification: '📝',
  report: '📊',            // ← ADD THIS
  other: '📎'
};
```

**No database migration needed** — `document_type` is a plain text column.

---

## Part 2: Create Shared Report Upload Utility

### File: `src/utils/reportStorageUtils.ts` (NEW FILE)

Create a utility used by both delivery paths. This follows the exact same pattern as `DocumentUpload.tsx` — upload to `project-documents` bucket, get publicUrl, insert into `project_documents` table.

```typescript
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SaveReportResult {
  documentId: string;
  fileUrl: string;       // publicUrl for DB record
  signedUrl: string;     // signed URL for email/sharing (30-day expiry)
  fileName: string;
  storagePath: string;
}

/**
 * Upload a generated PDF report to Storage and save a record in project_documents.
 * Used by BOTH the Download and Email delivery paths.
 * 
 * Follows the exact pattern from DocumentUpload.tsx:
 * - Upload to 'project-documents' bucket
 * - Get publicUrl for the DB record
 * - Insert into project_documents table
 */
export async function saveReportToProjectDocuments(
  pdfBlob: Blob,
  projectId: string,
  projectNumber: string,
  reportTitle: string,
  mediaCount: number
): Promise<SaveReportResult> {
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 2. Build file name and storage path
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const timestamp = Date.now();
  const sanitizedTitle = reportTitle.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 60);
  const fileName = `${projectNumber}_Media_Report_${dateStr}.pdf`;
  const storagePath = `${projectId}/reports/${timestamp}-${sanitizedTitle}.pdf`;

  // 3. Upload to project-documents bucket (same bucket as DocumentUpload.tsx)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(storagePath, pdfBlob, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw new Error(`Failed to upload report: ${uploadError.message}`);

  // 4. Get publicUrl (same pattern as DocumentUpload.tsx)
  const { data: { publicUrl } } = supabase.storage
    .from('project-documents')
    .getPublicUrl(storagePath);

  // 5. Generate signed URL for email sharing (30 days)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('project-documents')
    .createSignedUrl(storagePath, 2592000); // 30 days

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error('Failed to generate download link');
  }

  // 6. Insert record into project_documents table
  const description = `Media report with ${mediaCount} item${mediaCount !== 1 ? 's' : ''} — generated ${format(new Date(), 'MMM d, yyyy h:mm a')}`;

  const { data: docRecord, error: dbError } = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      document_type: 'report',
      file_name: fileName,
      file_url: publicUrl,
      file_size: pdfBlob.size,
      mime_type: 'application/pdf',
      uploaded_by: user.id,
      description,
    })
    .select('id')
    .single();

  if (dbError) throw new Error(`Failed to save report record: ${dbError.message}`);

  return {
    documentId: docRecord.id,
    fileUrl: publicUrl,
    signedUrl: signedUrlData.signedUrl,
    fileName,
    storagePath,
  };
}
```

**Key design decisions:**
- Uses `project-documents` bucket (NOT `project-media`) — matches the existing `DocumentUpload.tsx` pattern exactly
- Storage path: `{projectId}/reports/{timestamp}-{title}.pdf` — organized under the project, in a `reports/` subfolder
- `document_type: 'report'` — new type we added in Part 1
- `description` includes media count and generation timestamp for context in the timeline
- Returns both `publicUrl` (for DB) and `signedUrl` (for email) since they serve different purposes

---

## Part 3: Modify MediaReportBuilderModal — Both Delivery Paths

### File: `src/components/MediaReportBuilderModal.tsx`

#### Step 1: Add import

```typescript
import { saveReportToProjectDocuments } from '@/utils/reportStorageUtils';
```

#### Step 2: Create a helper to generate PDF blob without downloading

Add this function inside the component (or outside as a module-level helper):

```typescript
const generatePdfBlob = async (htmlString: string): Promise<Blob> => {
  const pdfOptions = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const,
      compress: true,
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break',
      after: '.page-break-after',
      avoid: ['img', '.no-break'],
    },
  };

  // .outputPdf('blob') returns the PDF as a Blob WITHOUT triggering download
  const pdfBlob: Blob = await html2pdf()
    .set(pdfOptions)
    .from(htmlString)
    .outputPdf('blob');

  return pdfBlob;
};
```

**Important:** `html2pdf.js` supports `.outputPdf('blob')` which returns the PDF as a Blob without triggering a download. This is the key difference from the existing `.save()` call.

#### Step 3: Modify the DOWNLOAD delivery path

Find the existing handler that calls `html2pdf().save()`. Replace the save-only flow with: generate blob → save to project documents → trigger browser download.

```typescript
// BEFORE (current code):
await html2pdf().set(options).from(htmlString).save();

// AFTER (new code):

// 1. Generate PDF blob (NOT auto-download)
console.log('📄 Generating PDF...');
const pdfBlob = await generatePdfBlob(htmlString);
console.log(`✅ PDF generated: ${(pdfBlob.size / 1024).toFixed(0)}KB`);

// 2. Save to project documents (Storage + DB record)
console.log('💾 Saving report to project documents...');
const { fileName } = await saveReportToProjectDocuments(
  pdfBlob,
  projectId,
  projectNumber,
  reportTitle || `${projectName} - Media Report`,
  selectedMedia.length
);
console.log('✅ Report saved to project documents');

// 3. Trigger browser download from the blob
const blobUrl = URL.createObjectURL(pdfBlob);
const link = document.createElement('a');
link.href = blobUrl;
link.download = fileName;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(blobUrl);
console.log('✅ PDF downloaded');

toast.success('Report saved & downloaded!', {
  description: `Saved to project documents • ${selectedMedia.length} items`
});
```

#### Step 4: Modify the EMAIL delivery path

Find the email handler. Replace the current flow (which sends project metadata only) with: generate blob → save to project documents → send email with signed URL.

```typescript
// 1. Get HTML from edge function (same as current)
const { data: htmlString, error } = await supabase.functions.invoke('generate-media-report', {
  body: {
    projectId,
    mediaIds,
    reportTitle: reportTitle || `${projectName} - Media Report`,
    format: 'story',
    summary: reportSummary.trim() || undefined,
  },
});

if (error || !htmlString || typeof htmlString !== 'string') {
  throw new Error('Failed to generate report HTML');
}

// 2. Generate PDF blob (NEW)
console.log('📄 Generating PDF for email...');
const pdfBlob = await generatePdfBlob(htmlString);
console.log(`✅ PDF generated: ${(pdfBlob.size / 1024).toFixed(0)}KB`);

// 3. Save to project documents — gets both publicUrl and signedUrl (NEW)
console.log('💾 Saving report to project documents...');
const { signedUrl, fileName } = await saveReportToProjectDocuments(
  pdfBlob,
  projectId,
  projectNumber,
  reportTitle || `${projectName} - Media Report`,
  selectedMedia.length
);
console.log('✅ Report saved to project documents');

// 4. Send email WITH the download URL (MODIFIED)
console.log('📧 Sending email with download link...');
const { error: emailError } = await supabase.functions.invoke('send-media-report-email', {
  body: {
    projectId,
    recipientEmail,
    recipientName,
    reportTitle: reportTitle || `${projectName} - Media Report`,
    pdfDownloadUrl: signedUrl,     // ← SIGNED URL for 30-day access
    mediaCount: selectedMedia.length,
  },
});

if (emailError) throw new Error(`Failed to send email: ${emailError.message}`);

toast.success('Report saved & emailed!', {
  description: `Saved to project documents • Sent to ${recipientEmail}`
});
```

---

## Part 4: Update Email Edge Function — Add Download Button

### File: `supabase/functions/send-media-report-email/index.ts`

**Update the request interface** to accept `pdfDownloadUrl`:

```typescript
interface EmailRequest {
  projectId: string;
  recipientEmail: string;
  recipientName?: string;
  reportTitle?: string;
  pdfDownloadUrl: string;  // ← ADD THIS
  mediaCount?: number;
}
```

**Find and REMOVE** the useless portal message. It will look something like:

```html
<p><em>For the full report with high-resolution images, please use the print/save option in the RCG project portal.</em></p>
```

**Replace with a prominent download button and fallback link:**

```html
<!-- Download Button -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="background-color: ${primaryColor}; border-radius: 8px; padding: 16px 40px;">
            <a href="${pdfDownloadUrl}" 
               style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block;"
               target="_blank">
              📄 Download Full Report (PDF)
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Plain text fallback link -->
<p style="font-size: 13px; color: #666; text-align: center; margin-top: 16px;">
  If the button doesn't work, copy this link:<br>
  <a href="${pdfDownloadUrl}" style="color: ${primaryColor}; word-break: break-all;">
    ${pdfDownloadUrl}
  </a>
</p>

<!-- Expiration notice -->
<p style="font-size: 12px; color: #999; text-align: center; margin-top: 8px;">
  This download link expires in 30 days.
</p>
```

**Remove the old "use the portal" italic text entirely.**

### Deploy the edge function

Use Supabase MCP to deploy. Do NOT use CLI commands like `supabase functions deploy`.

---

## Part 5: Ensure Reports Appear in Documents Timeline

### File: `src/components/ProjectDocumentsTimeline.tsx`

**No changes needed.** This component already queries `project_documents` and creates timeline items for every record:

```typescript
const { data: documents } = await supabase
  .from('project_documents')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

Since we insert with `document_type: 'report'`, it will appear automatically. The realtime subscription on `project_documents` is also already in place, so the timeline updates live.

**However**, verify that the timeline renders `'report'` type items properly. If there's any type-specific rendering (icons, badges), check for `switch` statements or conditional rendering on `document_type` in the timeline component and add a case for `'report'` if needed. Use the 📊 icon and a distinct badge color (e.g., blue or purple) to differentiate reports from other document types.

### File: `src/components/ProjectDocumentsTable.tsx`

This component is used for filtered views (Drawings, Permits, Licenses tabs). Reports don't need their own tab yet, but if the `typeFilter` dropdown exists, ensure `'report'` is included as an option. Check for any hardcoded filter lists.

---

## Part 6: Validation Checklist

### TypeScript
- [ ] `npx tsc --noEmit` passes
- [ ] No new type errors from adding 'report' to DocumentType

### Download Path
- [ ] Open Field Media → select photos → Generate Report → choose Download
- [ ] Progress shows PDF generation AND "Saving to documents" steps
- [ ] PDF downloads to browser
- [ ] Toast says "Report saved & downloaded!"
- [ ] Go to Documents Hub → "All" tab → report appears with 📊 icon and "Report" badge
- [ ] Click the report in the timeline → opens/downloads the PDF
- [ ] Description shows media count and generation timestamp

### Email Path
- [ ] Open Field Media → select photos → Generate Report → choose Email
- [ ] Enter recipient email and name
- [ ] Progress shows PDF generation, saving, AND sending steps
- [ ] Toast says "Report saved & emailed!"
- [ ] Go to Documents Hub → "All" tab → same report appears (one record, not duplicated)
- [ ] Check recipient's inbox:
  - [ ] Email has branded header (same as current — that part works)
  - [ ] Email has project details (name, number, client, media count)
  - [ ] Email has prominent "Download Full Report (PDF)" button
  - [ ] Email has plain text fallback link
  - [ ] Email shows "This download link expires in 30 days"
  - [ ] The old "use the portal" italic text is GONE
  - [ ] Click download button → browser downloads the PDF
  - [ ] PDF matches what Download path produces

### Documents Timeline Integration
- [ ] Report appears in Documents Hub → "All" tab with type "Report"
- [ ] Report shows correct file name: `{projectNumber}_Media_Report_{date}.pdf`
- [ ] Report shows description with media count
- [ ] Realtime: generate a report → timeline updates without page refresh
- [ ] Multiple reports for same project → all appear, sorted by date

### Storage
- [ ] Check Supabase Storage → `project-documents` bucket
- [ ] Reports stored under `{projectId}/reports/` path
- [ ] File sizes are reasonable (not 0 bytes)

---

## What NOT to Change

- `generate-media-report` edge function — it returns HTML, that's correct
- The branded email template styling — it looks great, just swap the dead-end text for the download button
- The Print/Save delivery path (if it exists via browser print dialog) — leave as-is
- `ProjectDocumentsTimeline.tsx` — no changes needed, it already picks up `project_documents` records
- Existing document upload components (`DocumentUpload.tsx`, `QuoteAttachmentUpload.tsx`) — no changes

## Architecture Summary

```
User clicks "Generate Report"
        │
        ▼
 Get HTML from edge function (existing)
        │
        ▼
 html2pdf().outputPdf('blob')  ← NEW: blob instead of .save()
        │
        ▼
 saveReportToProjectDocuments()  ← NEW shared utility
   ├── Upload to project-documents bucket
   ├── Get publicUrl (for DB record)  
   ├── Get signedUrl (for email sharing)
   └── Insert into project_documents table (document_type: 'report')
        │
        ├─── Download Path ──→ Browser download from blob
        │                      (same PDF, no re-download from Storage)
        │
        └─── Email Path ────→ Send email with signedUrl
                               (recipient clicks → downloads PDF)
        
 Result: Report appears in Documents Hub → "All" tab automatically
         via existing ProjectDocumentsTimeline query + realtime subscription
```
