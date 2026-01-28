/**
 * Extract placeholders from Word template for review
 */
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const templatePath = path.join(__dirname, '../docs/subcontractor-project-agreement-template.docx');

async function extractPlaceholders() {
  const fileBuffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(fileBuffer);
  
  const files = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml', 'word/footer2.xml'];
  const allPlaceholders = new Set();
  
  for (const file of files) {
    const entry = zip.file(file);
    if (entry) {
      const content = await entry.async('string');
      const matches = content.match(/\{\{[A-Z_]+\}\}/g) || [];
      matches.forEach(m => allPlaceholders.add(m));
    }
  }
  
  const sorted = Array.from(allPlaceholders).sort();
  console.log('\nPlaceholders found in template:');
  console.log(JSON.stringify(sorted, null, 2));
  console.log(`\nTotal: ${sorted.length} unique placeholders`);
}

extractPlaceholders().catch(console.error);
