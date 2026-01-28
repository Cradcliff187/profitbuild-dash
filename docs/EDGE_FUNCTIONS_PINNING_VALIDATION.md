# Edge Functions – Version Pinning Validation

Per **.cursorrules** (§ Edge Function Dependencies): *"ALWAYS pin exact versions for edge function dependencies"*. Floating versions (`@2`, `@latest`) or bare imports break in Deno/Lovable.

## Validation Result: ✅ All Pinned

All edge functions and shared modules use exact version specifiers. No `@2`, `@latest`, or bare imports found.

## By Package

| Package / source | Required pin | Where used | Status |
|------------------|--------------|------------|--------|
| `@supabase/supabase-js` | `@2.57.4` | 18 functions + `_shared/transactionProcessor.ts` | ✅ `@2.57.4` |
| `deno.land/std` (serve) | `@0.168.0` | ai-report-assistant, quickbooks-*, transcribe-audio, enrich-estimate-items, enhance-caption | ✅ `@0.168.0` |
| `jszip` | exact | generate-contract | ✅ `@3.10.1` |
| `resend` | exact | send-auth-email, send-receipt-notification, send-training-notification | ✅ `@2.0.0` |
| `deno.land/x/croner` | exact | process-scheduled-sms | ✅ `@6.0.3` |
| `deno.land/x/xhr` | exact | transcribe-audio | ✅ `@0.1.0` |

## Functions With No URL Imports

- **check-sms-status**: uses `Deno.serve` only (no deps to pin).
- **_shared/quickbooks.ts**: no HTTP/ESM imports.

## ai-report-assistant/deno.json

`imports` map uses the same pinned URLs as in code:  
`@supabase/supabase-js@2.57.4`, `deno.land/std@0.168.0` → ✅ consistent.

## Rules Reference

From `.cursorrules`:

- **DO:** `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";`
- **DON'T:** `@2`, `@latest`, or `'@supabase/supabase-js'`.

All current imports comply. Re-run this check when adding or changing edge function dependencies.
