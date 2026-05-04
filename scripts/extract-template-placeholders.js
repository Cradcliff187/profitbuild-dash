/**
 * Extract placeholders from a Word (.docx) template for review.
 *
 * Usage:
 *   node scripts/extract-template-placeholders.js [path-to-docx]
 *
 * Defaults to docs/subcontractor-project-agreement-template.docx when no arg given.
 * Scans word/document.xml plus any header*.xml / footer*.xml entries.
 * Placeholders are uppercase {{TOKEN}} (letters, digits, underscore).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE = path.join(__dirname, '../docs/subcontractor-project-agreement-template.docx');
const cliArg = process.argv[2];
const templatePath = cliArg ? path.resolve(cliArg) : DEFAULT_TEMPLATE;

async function extractPlaceholders() {
  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(fileBuffer);

  const targetFiles = Object.keys(zip.files).filter(
    (f) => f === 'word/document.xml' || /^word\/(header|footer)\d+\.xml$/.test(f)
  );

  const allPlaceholders = new Set();
  for (const file of targetFiles) {
    const content = await zip.file(file).async('string');
    const matches = content.match(/\{\{[A-Z0-9_]+\}\}/g) || [];
    matches.forEach((m) => allPlaceholders.add(m));
  }

  const sorted = Array.from(allPlaceholders).sort();
  console.log(`\nTemplate: ${templatePath}`);
  console.log(`Scanned files: ${targetFiles.join(', ') || '(none)'}`);
  console.log('\nPlaceholders found:');
  console.log(JSON.stringify(sorted, null, 2));
  console.log(`\nTotal: ${sorted.length} unique placeholders`);
}

extractPlaceholders().catch((err) => {
  console.error(err);
  process.exit(1);
});
