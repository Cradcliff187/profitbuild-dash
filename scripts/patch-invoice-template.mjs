/**
 * One-time patch for docs/rcg-invoice-template.docx.
 *
 * Fixes three rendering issues observed in the generated invoice (PR #50):
 *
 *   1. NOTES + TOTAL DUE table column widths (5300/4060) didn't match the
 *      DESCRIPTION + TOTAL PRICE table above (7000/2360). The TOTAL DUE box
 *      extended way left of the TOTAL PRICE column above, looking misaligned.
 *      → Resize NOTES outer table to 7000/2360 and inner TOTAL DUE table from
 *        4060 (1500/2560) to 2360 (900/1460).
 *
 *   2. NOTES section had three "ghost line" paragraphs (bottom-border only,
 *      colored 9CA3AF) mimicking a paper form. On a digital invoice they
 *      either render as random underlines or as empty space, depending on the
 *      viewer. Removed.
 *
 *   3. Footer's "Page X of Y" used Word PAGE/NUMPAGES field codes with all
 *      fldChar markers crammed into single runs, no result text between
 *      separate and end. Browser-based docx previewers (Safari iOS, Google
 *      Drive) can't compute Word fields, so the user saw "Page of" with no
 *      numbers. Replaced with company-name-only footer (single-page invoices
 *      don't need numbering).
 *
 * Run once after editing this script:
 *   node scripts/patch-invoice-template.mjs
 *
 * Then upload to Storage:
 *   npm run upload:invoice-template
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_PATH = resolve(__dirname, '..', 'docs', 'rcg-invoice-template.docx');

function patchDocumentXml(xml) {
  let out = xml;

  // ── Fix 1: align NOTES + TOTAL DUE table widths with DESCRIPTION + TOTAL PRICE
  // Outer NOTES/TOTAL_DUE table: 5300/4060 → 7000/2360 (matches description table)
  // Inner TOTAL_DUE table:        4060 (1500/2560) → 2360 (900/1460) to fit new outer cell
  // 5300 appears 2× (gridCol + left tcW); 4060 appears 3× (outer gridCol, outer right tcW,
  // inner tblW) — all should change. 1500/2560 appear 2× each in the inner table only.
  out = out.replaceAll('w:w="5300"', 'w:w="7000"');
  out = out.replaceAll('w:w="4060"', 'w:w="2360"');
  out = out.replaceAll('w:w="1500"', 'w:w="900"');
  out = out.replaceAll('w:w="2560"', 'w:w="1460"');

  // ── Fix 2: remove the three ghost-line paragraphs under {{INVOICE_NOTES}}
  // Identified by their unique pBdr color (#9CA3AF — appears nowhere else).
  // Each is a `<w:p>...<w:bottom w:val="single" w:color="9CA3AF".../>...</w:p>` block
  // with empty text content. Strip all three with a non-greedy regex.
  const ghostLineRegex =
    /<w:p>(?:(?!<\/w:p>).)*?<w:bottom w:val="single" w:color="9CA3AF"[^/]*\/>(?:(?!<\/w:p>).)*?<\/w:p>/g;
  const before = (out.match(ghostLineRegex) || []).length;
  out = out.replace(ghostLineRegex, '');
  if (before !== 3) {
    throw new Error(
      `Expected to remove 3 ghost-line paragraphs, found ${before}. Aborting to avoid corrupting the template.`
    );
  }

  return out;
}

function patchFooterXml(xml) {
  // ── Fix 3: replace "Page X of Y" with company-name-only footer.
  // The original has tabs + a `Page ` literal + PAGE field + ` of ` literal + NUMPAGES field.
  // All field markers (fldChar begin/separate/end + instrText) are nested inside SINGLE runs
  // with no result placeholder text — malformed per OOXML spec; viewers that don't recompute
  // Word fields render literally as "Page of".
  //
  // Strategy: collapse the whole `<w:p>...</w:p>` paragraph to a clean centered company line.
  const cleanedFooterParagraph =
    '<w:p>' +
    '<w:pPr><w:jc w:val="center"/></w:pPr>' +
    '<w:r>' +
    '<w:rPr><w:color w:val="85969D"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>' +
    '<w:t xml:space="preserve">Radcliff Construction Group, LLC</w:t>' +
    '</w:r>' +
    '</w:p>';

  const replaced = xml.replace(/<w:p>.*?<\/w:p>/s, cleanedFooterParagraph);
  if (replaced === xml) {
    throw new Error('Footer paragraph not found — template may already be patched.');
  }
  return replaced;
}

async function main() {
  const buffer = await readFile(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(buffer);

  const docPath = 'word/document.xml';
  const footerPath = 'word/footer1.xml';

  const docFile = zip.file(docPath);
  const footerFile = zip.file(footerPath);
  if (!docFile) throw new Error(`Missing ${docPath} in template`);
  if (!footerFile) throw new Error(`Missing ${footerPath} in template`);

  const originalDoc = await docFile.async('string');
  const originalFooter = await footerFile.async('string');

  const patchedDoc = patchDocumentXml(originalDoc);
  const patchedFooter = patchFooterXml(originalFooter);

  zip.file(docPath, patchedDoc);
  zip.file(footerPath, patchedFooter);

  const outBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  await writeFile(TEMPLATE_PATH, outBuffer);

  console.log('Template patched:', TEMPLATE_PATH);
  console.log(' - document.xml size:', originalDoc.length, '→', patchedDoc.length);
  console.log(' - footer1.xml  size:', originalFooter.length, '→', patchedFooter.length);
  console.log('');
  console.log('Next: upload via `npm run upload:invoice-template` to push to Storage.');
}

main().catch((err) => {
  console.error('Patch failed:', err.message);
  process.exit(1);
});
