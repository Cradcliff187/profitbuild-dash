/**
 * Upload contract template to Supabase storage (contract-templates bucket).
 * Run from project root: npm run upload:template
 *
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env or environment
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load .env from project root when run via npm script
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://clsjdxwbsjbhjibvlqbz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Set it in .env or run: SUPABASE_SERVICE_ROLE_KEY=your_key npm run upload:template');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEMPLATE_FILENAME = 'subcontractor-project-agreement-template.docx';
const SOURCE_PATH = join(process.cwd(), 'docs', TEMPLATE_FILENAME);

async function uploadTemplate() {
  if (!existsSync(SOURCE_PATH)) {
    console.error(`❌ Template file not found: ${SOURCE_PATH}`);
    console.log('Ensure docs/subcontractor-project-agreement-template.docx exists (copy from subcontractor-agreement-template-FINAL.docx if needed).');
    process.exit(1);
  }

  const fileBuffer = readFileSync(SOURCE_PATH);

  const { data, error } = await supabase.storage
    .from('contract-templates')
    .upload(TEMPLATE_FILENAME, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });

  if (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }

  console.log('✓ Template uploaded successfully:', data.path);
}

uploadTemplate();
