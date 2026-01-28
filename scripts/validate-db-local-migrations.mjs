#!/usr/bin/env node
/**
 * Validates that every migration in supabase_migrations.schema_migrations
 * has a matching local file in supabase/migrations/ with exact name:
 * {version}_{name}.sql or {version}_migration.sql when name is empty.
 *
 * Usage:
 *   1. Get DB list: run in Supabase SQL editor or MCP execute_sql:
 *      SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
 *   2. Save the JSON array to supabase/db-migrations.json
 *   3. Run: node scripts/validate-db-local-migrations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dbPath = path.join(root, 'supabase', 'db-migrations.json');
const migrationsDir = path.join(root, 'supabase', 'migrations');

let dbList;
try {
  const raw = fs.readFileSync(dbPath, 'utf8');
  dbList = JSON.parse(raw);
} catch (e) {
  console.error('Failed to read supabase/db-migrations.json. Create it with the result of:');
  console.error('  SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;');
  console.error('(as JSON array)');
  process.exit(1);
}

const expectedFiles = new Set(
  dbList.map((m) => (m.name ? `${m.version}_${m.name}.sql` : `${m.version}_migration.sql`))
);

const localFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
const localSet = new Set(localFiles);

const missing = [...expectedFiles].filter((f) => !localSet.has(f)).sort();
const extra = localFiles.filter((f) => !expectedFiles.has(f)).sort();

console.log('DB migrations:', dbList.length);
console.log('Expected files:', expectedFiles.size);
console.log('Local files:', localFiles.length);
console.log('');

if (missing.length) {
  console.error('Missing local files (in DB but not in repo):');
  missing.forEach((f) => console.error('  -', f));
  console.error('');
}
if (extra.length) {
  console.log('Extra local files (in repo but not in DB):');
  extra.forEach((f) => console.log('  ', f));
  console.log('');
}

if (missing.length) {
  console.error('Validation FAILED: create placeholder files for the missing entries above.');
  process.exit(1);
}
console.log('Validation OK: every DB migration has a matching local file.');
process.exit(0);
