# 07 — Report Delivery Options (Print / Download / Email)

## Priority: Seventh (Feature Addition)
## Risk Level: Medium — adds new UI controls + new edge function parameter
## Estimated Time: 45-60 minutes
## Depends On: 05 (shared branding template), 06 (report edge function rewrite)

---

## Context

The report system currently has one delivery path: edge function generates HTML → html2pdf.js converts it client-side → auto-downloads a PDF file. This approach has known issues on mobile (memory crashes with 30+ photos, CORS problems with signed URLs, fragile page breaks).

Instead of one path, we present three:

| Option | How It Works | Best For |
|--------|-------------|----------|
| **Print / Save PDF** | Render HTML in iframe → `window.print()` | Field workers saving to phone, printing at office |
| **Download PDF** | Existing html2pdf.js flow | Users who want a direct .pdf file without dialog |
| **Email to Client** | Edge function sends branded email via Resend | Sharing progress reports with clients |

The **Print / Save PDF** option leverages the browser's built-in print engine, which:
- Handles page breaks natively via CSS `@media print` and `page-break-*` rules
- Offers "Save as PDF" in every modern browser (Chrome, Safari, Firefox, Edge)
- Uses zero client-side libraries (no html2pdf, no html2canvas, no jsPDF)
- Works reliably on mobile with any number of photos
- Gives users full control over paper size, orientation, margins
- Lets the user physically print if they want a hardcopy for the jobsite

This becomes the **primary recommended option**. The existing html2pdf download stays as a secondary option for users who specifically want a .pdf file without the print dialog.

## Architecture

```
User selects media → Report Builder Modal
  ├── "Print / Save PDF"  → edge function returns HTML
  │    └── render in iframe → iframe.contentWindow.print()
  │         └── user chooses: print to paper OR "Save as PDF"
  │
  ├── "Download PDF"      → edge function returns HTML (unchanged)
  │    └── html2pdf.js → auto-downloads .pdf file
  │
  └── "Email to Client"   → edge function generates + sends via Resend
       └── returns JSON { success: true }
```

## Files to Modify

### File 1: `supabase/functions/generate-media-report/index.ts`

**Add `delivery` and email parameters to the request interface:**

```typescript
interface ReportRequest {
  projectId: string;
  mediaIds: string[];
  reportTitle?: string;
  format?: string;
  summary?: string;
  // NEW: delivery options
  delivery?: 'print' | 'download' | 'email';
  recipientEmail?: string;
  recipientName?: string;
}
```

**Add print-optimized CSS to the report HTML.**

In the `getStoryTimelineCss()` function (created in Phase 06), append print media styles:

```css
/* Print-optimized styles */
@media print {
  body {
    background: white !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .report-container {
    box-shadow: none !important;
    max-width: 100% !important;
  }

  .header {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .story-date-group {
    page-break-inside: avoid;
  }

  .story-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .story-thumbnail img {
    max-height: 120px;
  }

  .footer {
    page-break-inside: avoid;
  }
}

@page {
  margin: 0.75in;
  size: letter portrait;
}
```

These styles are already in the HTML the edge function returns — they just get ignored when the HTML is processed by html2pdf (which uses its own rendering), but they activate when the browser's print engine handles the page.

**Add email delivery branch.**

After the HTML is generated (before the final `return new Response(html, ...)`), add:

```typescript
const delivery = (body as ReportRequest).delivery || 'download';

if (delivery === 'email') {
  const recipientEmail = (body as ReportRequest).recipientEmail;
  const recipientName = (body as ReportRequest).recipientName;

  if (!recipientEmail) {
    return new Response(
      JSON.stringify({ error: 'recipientEmail is required for email delivery' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`📧 Sending report via email to ${recipientEmail}`);

  const resendApiKey = Deno.env.get('ResendAPI');
  if (!resendApiKey) {
    throw new Error('Email service not configured');
  }

  const { Resend } = await import('https://esm.sh/resend@2.0.0');
  const resend = new Resend(resendApiKey);

  // Build email-safe summary (not the full report — emails shouldn't have
  // huge image payloads; the email serves as notification + key details)
  const emailBodyHtml = `
    <h1 style="margin: 0 0 16px; color: ${branding.secondaryColor}; font-size: 24px; font-weight: 600;">
      ${escapeHtml(reportTitle || project.project_name + ' - Media Report')}
    </h1>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      ${recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hello,'}
    </p>
    <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
      Please find the latest project media report for
      <strong>${escapeHtml(project.project_name)}</strong>
      (${escapeHtml(project.project_number)}).
      This report contains ${mediaWithUrls.length} media
      item${mediaWithUrls.length !== 1 ? 's' : ''}.
    </p>

    <!-- Project details card -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="background: ${branding.lightBgColor}; border-radius: 8px; border-left: 4px solid ${branding.primaryColor}; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          ${detailsHtml}
        </td>
      </tr>
    </table>

    ${summary ? `
      <p style="margin: 0 0 8px; color: ${branding.secondaryColor}; font-size: 14px; font-weight: 600;">
        Report Summary
      </p>
      <p style="margin: 0 0 24px; color: #4a5568; font-size: 14px; line-height: 1.6;">
        ${escapeHtml(summary)}
      </p>
    ` : ''}

    <p style="margin: 0 0 8px; color: #4a5568; font-size: 14px; line-height: 1.6;">
      <strong>${mediaWithUrls.length} photos</strong> captured across
      <strong>${new Set(mediaWithUrls.map((m: any) =>
        new Date(m.taken_at || m.created_at).toLocaleDateString()
      )).size} day(s)</strong>.
    </p>

    <p style="margin: 24px 0 0; color: #718096; font-size: 13px; font-style: italic;">
      For the full report with high-resolution images, please use the print/save
      option in the ${escapeHtml(branding.companyAbbreviation)} project portal.
    </p>
  `;

  const emailHtml = buildBrandedEmail(branding, {
    preheaderText: `Media report: ${project.project_name} - ${mediaWithUrls.length} items`,
    bodyHtml: emailBodyHtml,
  });

  const { data: emailResult, error: emailError } = await resend.emails.send({
    from: `${branding.companyName} <noreply@rcgwork.com>`,
    to: [recipientEmail],
    subject: `${project.project_number} - Media Report: ${project.project_name}`,
    html: emailHtml,
  });

  if (emailError) {
    console.error('❌ Email send failed:', emailError);
    throw new Error(`Failed to send email: ${emailError.message}`);
  }

  console.log('✅ Report email sent:', emailResult?.id);

  return new Response(
    JSON.stringify({
      success: true,
      delivery: 'email',
      emailId: emailResult?.id,
      recipientEmail,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// For 'print' and 'download': return HTML
return new Response(html, {
  headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
});
```

Note: Both `print` and `download` delivery types return the same HTML. The difference is how the CLIENT handles it.

### File 2: `src/components/MediaReportBuilderModal.tsx`

#### Step 1: Add state and imports

```typescript
import { Download, Mail, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Inside the component:
const [deliveryMethod, setDeliveryMethod] = useState<'print' | 'download' | 'email'>('print');
const [recipientEmail, setRecipientEmail] = useState('');
const [recipientName, setRecipientName] = useState(clientName || '');
```

#### Step 2: Add the delivery method selector UI

Place after the "Report Summary" textarea section:

```tsx
{/* Delivery Method */}
<div className="space-y-3">
  <Label className={cn(isMobile ? "text-xs" : "text-sm")}>
    Delivery Method
  </Label>
  <div className="flex gap-2">
    <Button
      variant={deliveryMethod === 'print' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setDeliveryMethod('print')}
      className="flex-1"
    >
      <Printer className="h-4 w-4 mr-1" />
      Print / Save PDF
    </Button>
    <Button
      variant={deliveryMethod === 'download' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setDeliveryMethod('download')}
      className="flex-1"
    >
      <Download className="h-4 w-4 mr-1" />
      Download
    </Button>
    <Button
      variant={deliveryMethod === 'email' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setDeliveryMethod('email')}
      className="flex-1"
    >
      <Mail className="h-4 w-4 mr-1" />
      Email
    </Button>
  </div>

  {deliveryMethod === 'print' && (
    <p className="text-xs text-muted-foreground">
      Opens your device's print dialog. Choose "Save as PDF" to save a copy,
      or print directly.
    </p>
  )}

  {deliveryMethod === 'email' && (
    <div className="space-y-2 pt-2">
      <div>
        <Label className="text-xs">Recipient Email *</Label>
        <Input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="client@example.com"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Recipient Name</Label>
        <Input
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Client name"
          className="mt-1"
        />
      </div>
    </div>
  )}
</div>
```

#### Step 3: Add the print-via-iframe helper function

Add this utility function inside the component (or as a module-level function):

```typescript
/**
 * Render HTML in a hidden iframe and trigger the browser's print dialog.
 * The user can then print to paper or choose "Save as PDF".
 */
const printHtmlReport = (html: string) => {
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    toast.error('Could not open print preview');
    document.body.removeChild(iframe);
    return;
  }

  // Write the report HTML into the iframe
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for images to load before printing
  const images = iframeDoc.querySelectorAll('img');
  const imagePromises = Array.from(images).map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Don't block print on failed images
        }
      })
  );

  Promise.all(imagePromises).then(() => {
    // Small delay to ensure rendering is complete
    setTimeout(() => {
      iframe.contentWindow?.print();

      // Clean up iframe after print dialog closes
      // The onafterprint event fires when the dialog closes (print or cancel)
      iframe.contentWindow?.addEventListener('afterprint', () => {
        document.body.removeChild(iframe);
      });

      // Fallback cleanup if afterprint doesn't fire (some mobile browsers)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 60000); // 60 second fallback
    }, 500);
  });
};
```

#### Step 4: Update the generate handler

Replace `handleGenerateHTMLReport` with a version that branches on delivery method:

```typescript
const handleGenerateHTMLReport = async () => {
  setIsGenerating(true);
  setGenerationProgress(0);

  try {
    const mediaIds = selectedMedia.map((m) => m.id);
    const projectId = selectedMedia[0]?.project_id;

    if (!projectId) {
      toast.error('Project ID not found');
      return;
    }

    if (deliveryMethod === 'email' && !recipientEmail) {
      toast.error('Please enter a recipient email address');
      return;
    }

    // Build request
    const requestBody: Record<string, unknown> = {
      projectId,
      mediaIds,
      reportTitle: reportTitle || `${projectName} - Media Report`,
      format: 'story',
      summary: reportSummary.trim() || undefined,
      delivery: deliveryMethod,
    };

    if (deliveryMethod === 'email') {
      requestBody.recipientEmail = recipientEmail;
      requestBody.recipientName = recipientName || undefined;
    }

    setGenerationProgress(selectedMedia.length * 0.3);

    const { data, error } = await supabase.functions.invoke(
      'generate-media-report',
      { body: requestBody }
    );

    if (error) {
      throw new Error(error.message || 'Failed to generate report');
    }

    setGenerationProgress(selectedMedia.length * 0.7);

    // ── Handle each delivery method ──────────────────────

    if (deliveryMethod === 'email') {
      // Email path: response is JSON
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.success) {
        toast.success('Report emailed successfully!', {
          description: `Sent to ${recipientEmail}`,
        });
      } else {
        throw new Error(result.error || 'Email delivery failed');
      }
    } else if (deliveryMethod === 'print') {
      // Print path: render HTML in iframe → window.print()
      if (!data || typeof data !== 'string') {
        throw new Error('Invalid HTML response from server');
      }

      printHtmlReport(data);

      toast.success('Print dialog opened', {
        description: 'Choose "Save as PDF" to save a copy, or print directly.',
      });
    } else {
      // Download path: existing html2pdf.js flow
      if (!data || typeof data !== 'string') {
        throw new Error('Invalid HTML response from server');
      }

      const fileName = `${projectNumber}_Professional_Report_${format(
        new Date(),
        'yyyy-MM-dd'
      )}.pdf`;

      const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: fileName,
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

      await html2pdf().set(options).from(data).save();

      toast.success('PDF downloaded!', {
        description: `${selectedMedia.length} items • ${fileName}`,
      });
    }

    onComplete();
    onOpenChange(false);
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    toast.error('Failed to generate report', {
      description: (error as Error).message,
    });
  } finally {
    setIsGenerating(false);
    setGenerationProgress(0);
  }
};
```

#### Step 5: Update the generate button

```tsx
<Button
  onClick={handleGenerateHTMLReport}
  disabled={
    isGenerating ||
    selectedMedia.length === 0 ||
    (deliveryMethod === 'email' && !recipientEmail)
  }
  size={isMobile ? 'sm' : 'default'}
>
  {isGenerating
    ? 'Generating...'
    : deliveryMethod === 'print'
      ? `Print Report (${selectedMedia.length})`
      : deliveryMethod === 'email'
        ? `Email Report (${selectedMedia.length})`
        : `Download PDF (${selectedMedia.length})`}
</Button>
```

## Why Print-First Is Better

| Concern | html2pdf.js (Download) | Browser Print (Print/Save) |
|---------|----------------------|---------------------------|
| Page breaks | Fragile CSS heuristics | Native browser engine |
| 30+ photos on mobile | Memory crash risk | Handled natively by OS |
| CORS with signed URLs | Requires useCORS workaround | Browser loads images normally |
| File size | Large (images re-rasterized) | Optimized by print engine |
| Text searchable | No (images of text) | Yes (native PDF text) |
| User control | None (auto-downloads) | Full (paper size, orientation, copies) |
| Dependencies | html2pdf + html2canvas + jsPDF | Zero |
| Save as PDF | Not available | Built into every modern browser |
| Physical print | Not available | Available |

The Download option remains for backward compatibility and for automated workflows where the print dialog would be disruptive.

## Validation Checklist

### Print / Save PDF
- [ ] Select photos → choose "Print / Save PDF" → Generate
- [ ] Print dialog opens with the report rendered
- [ ] Report shows branded header, project details, story timeline with photos
- [ ] Page breaks land between story items (not cutting photos in half)
- [ ] Choose "Save as PDF" → PDF saves to device
- [ ] Choose "Cancel" → dialog closes, no errors, iframe cleaned up
- [ ] Test on mobile (iOS Safari, Android Chrome): dialog opens correctly
- [ ] Test with 30+ photos: no crashes, all photos render

### Download PDF (existing behavior)
- [ ] Select photos → choose "Download" → Generate → PDF downloads
- [ ] PDF content unchanged from before this phase

### Email
- [ ] Select photos → choose "Email" → email field appears
- [ ] Empty email shows validation error
- [ ] Enter valid email → Generate → success toast
- [ ] Check inbox: branded email with project details and media count
- [ ] Email renders in Gmail, Outlook

### General
- [ ] Switching between delivery modes updates UI correctly
- [ ] Helper text appears for Print mode
- [ ] Email fields only show for Email mode
- [ ] Button label changes per mode
- [ ] Generate button disabled when email mode selected but no email entered

## What NOT to Change

- The existing html2pdf.js download flow stays as the "Download" option — unchanged
- Other edge functions are not touched
- MediaCommentsList is not touched
- The report HTML structure from Phase 06 is not modified (we only append print CSS)
