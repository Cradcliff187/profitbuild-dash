# Receipt Scan: pre-fill amount, vendor, and date from the photo

**Status:** shipped Oct 27 2026 behind `receipt_scan` (ON for Tom Finn only). Summary in CLAUDE.md Rule 41.
**Owner:** Chris
**Scope:** `AddReceiptModal` only (the field capture path). Edit gets a Rescan button later, not in v1.

---

## What "foolproof" means here

The scan is a **pre-fill, never a gate**. Every rule below follows from that:

1. The form works exactly as it does today if the scan is slow, wrong, offline, or dead. Save never waits on it.
2. Nothing is auto-saved. The worker still taps Save, and the three values show a visible "from scan" mark until they are touched.
3. A scanned value goes through the **same validation** as a typed one. No bypass.
4. The vendor is never auto-created. A no-match leaves the vendor empty with the raw text as a hint and a one-tap "Add as new vendor" that opens the existing quick-add.
5. The system **learns the vendors it gets wrong**: when a worker corrects the vendor, that correction becomes an alias and the next receipt from the same store matches exactly.
6. Accuracy is **measured on your own receipts before anyone sees it**, and measured again in production from stored scan results.

## Why this will work on this data

Production, last 180 days:

| Metric | Value |
|---|---|
| Receipts | 293 (577 all-time) |
| Workers logging receipts | 7 |
| Distinct vendors | 55 |
| Top vendor (Home Depot) | 37.5% |
| Top 12 vendors | ~80% of receipts |
| Median amount | $55 |
| Receipts with notes | 29% |

Twelve stores cover four of every five receipts, and they are all big-box or gas chains with clean thermal receipts. Vendor matching is a short alias list plus a learning loop, not an open-world problem. Amount is one number on one line. Date is optional sugar.

## What the worker sees

1. Tap Add Receipt, take the photo (unchanged).
2. The photo appears immediately. A slim chip under it reads **Reading receipt…** for 2 to 6 seconds.
3. Chip flips to **Found: Home Depot · $84.12 · Oct 24** and the Amount, Vendor, and Date fields fill in with a subtle highlight. Save is enabled.
4. Worker glances, fixes anything wrong, taps Save. Fixing a field clears its highlight.
5. If the scan finds nothing usable the chip reads **Couldn't read it, enter by hand** and the form is exactly today's form.
6. If the scan is still running when the worker taps Save, Save proceeds with whatever is typed and the scan result is discarded.

Partial results are normal: amount found but vendor not matched means amount fills and vendor shows the hint "Receipt says: THE HOME DEPOT #3851" above the empty picker.

## Architecture

```
AddReceiptModal
  └─ useReceiptScan(file)                       client hook
       ├─ compressImage(maxWidth 1600, q 0.8)    reuse src/utils/imageCompression.ts
       ├─ POST scan-receipt { imageBase64 }      supabase.functions.invoke, 12s timeout
       └─ apply result → prefill state

scan-receipt (edge function, verify_jwt = true)
  ├─ OpenAI vision, structured output (strict JSON schema, temperature 0)
  ├─ match vendor → payee_id   (alias table → normalized name → fuzzy)
  └─ return { extraction, vendorMatch, meta }

On Save (client)
  ├─ receipts.insert(..., ocr_data, ocr_status)      what the scan said + what the user kept
  └─ learn alias if user's vendor ≠ scan's vendor      payee_aliases upsert
```

**Why the client compresses and the server never decodes the image.** Gotcha #75: the media-report function died with 546 WORKER_LIMIT by touching image bytes in the isolate. Here the phone resizes to ~1600px JPEG (200 to 500 KB), sends base64, and the function forwards it to OpenAI untouched. Payload cap 1.5 MB base64, rejected with a clear error above that.

**Why OpenAI vision and not Textract, Document AI, or on-device OCR.** `OPENAI_API_KEY` is already configured and three functions already use it, so there is zero new vendor, credential, or billing setup. Structured outputs give a guaranteed JSON shape. At ~50 receipts a month the cost is under a dollar. On-device Tesseract was rejected: poor on crumpled thermal paper, 2 MB of wasm on a PWA, and it gives you text, not fields. Textract `AnalyzeExpense` is the fallback if the benchmark below fails; the function's response contract stays the same so swapping providers is internal to one file.

## Phase 0: data (half a day)

One migration, applied via MCP, placeholder file committed per the migration rules.

```sql
-- 1. Scan results live on the receipt so accuracy can be measured later.
ALTER TABLE receipts
  ADD COLUMN ocr_status text
    CHECK (ocr_status IN ('not_run','success','partial','no_receipt','failed','timeout','skipped')),
  ADD COLUMN ocr_data jsonb;
-- ocr_data shape: { vendor_name, total, subtotal, tax, date, is_receipt, confidence:{...},
--                   match:{payee_id, tier, score}, model, latency_ms, user_kept:{amount,payee_id,date} }

-- 2. Vendor aliases: what receipts print → which payee it is.
CREATE TABLE payee_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_id uuid NOT NULL REFERENCES payees(id) ON DELETE CASCADE,
  alias text NOT NULL,                      -- normalized (see normalizeVendor)
  match_mode text NOT NULL DEFAULT 'exact' CHECK (match_mode IN ('exact','token')),
    -- exact: the whole printed name equals the alias
    -- token: the alias appears as a whole-word token sequence inside the printed name
    --        (chains/brands: "TIMMY TOMS SHELL" ⊃ "SHELL")
  source text NOT NULL DEFAULT 'learned' CHECK (source IN ('seed','learned','manual')),
  hit_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payee_aliases_alias_unique ON payee_aliases (alias);
CREATE INDEX payee_aliases_payee_idx ON payee_aliases (payee_id);
-- RLS: SELECT for any authenticated user; INSERT for any authenticated user (learning);
--      UPDATE/DELETE admin/manager only. The edge function reads with service role anyway.

-- 3. Feature flag with per-user overrides (existing infra).
INSERT INTO feature_flags (flag_name, enabled, description)
VALUES ('receipt_scan', false, 'AI pre-fill of amount/vendor/date on Add Receipt');
```

**Seed aliases** for the top vendors. Normalization: uppercase, strip punctuation, strip `#1234` store numbers and trailing digits, strip `THE`, `INC`, `LLC`, collapse spaces.

| Printed on receipt (normalized) | Mode | Payee |
|---|---|---|
| `HOME DEPOT` | token | Home Depot |
| `MENARDS` | token | Menards |
| `QUIKTRIP`, `QUIK TRIP`, `QT` | token | Quick Trip |
| `SHERWIN WILLIAMS` | token | sherwin williams |
| `ACE HARDWARE` | token | Ace Hardware |
| `SHELL`, `SHELL OIL` | token | Shell Gas |
| `LOWES` | token | Lowes |
| `WALMART`, `WAL MART` | token | Walmart |
| `BP`, `BRITISH PETROLEUM` | token | BP Gas |
| `INTERIOR SUPPLY` | token | Interior Supply |
| `HARBOR FREIGHT TOOLS`, `HARBOR FREIGHT` | token | Harbor Freight |
| `SPEEDWAY` | token | Speedway Gas |
| `MARATHON` | token | Marathon Gas |
| `FISHMAN FLOORING` | token | Fishman Flooring Solutions |
| `VALVOLINE` | token | Valvoline |

**Franchised gas stations are the case that forced `token` mode.** The receipt header is the
operator's name, not the chain: `TIMMY TOMS SHELL`, `BILLY BOBS BP`, `BILLY BOBS BRITISH
PETROLEUM`. The payee on file is just Shell Gas or BP Gas. An exact-alias scheme misses every
new station once. With token mode, `BILLY BOBS BP` contains the whole-word token `BP` and
resolves to BP Gas on the first visit. Whole-word matching (token boundaries, not substring)
keeps `BP` from firing inside an unrelated word. Gas is roughly 15% of receipts, so this is
mainline, not an edge case.

Learned aliases (from worker corrections) are always `exact`. Only seeds and admin-added
entries get `token`, because a bad token alias misfires on every receipt that contains the word.

That is the list that already covers 83% of receipts. Everything else is learned on first correction.

Side cleanup worth doing in the same pass: `Lowes ` has a trailing space and `sherwin williams` is lowercase in `payees.payee_name`. Cosmetic, but it shows up in the chip text.

## Phase 1: `scan-receipt` edge function (one day)

`supabase/functions/scan-receipt/index.ts`, `verify_jwt: true`, pinned imports (`@supabase/supabase-js@2.57.4`).

**Request**
```json
{ "imageBase64": "<jpeg base64, no data: prefix>", "mimeType": "image/jpeg" }
```

**Model call.** One vision call, `response_format: { type: "json_schema", strict: true }`, `temperature: 0`, `detail: "high"`. Model name pinned in one constant at the top of the file (`gpt-4o` is the known-good baseline; change only after re-running the Phase 1 benchmark). Prompt asks for exactly:

```
is_receipt        boolean   false for anything that isn't a purchase receipt/invoice
vendor_name       string|null   merchant name as printed, top of receipt, not the address
brand             string|null   the chain or fuel brand when this is a franchised/branded
                                location (Shell, BP, Marathon, Ace Hardware); null if the
                                vendor_name IS the brand or there is no visible brand
total             number|null   the final amount paid (after tax, after discounts)
subtotal          number|null
tax               number|null
date              string|null   YYYY-MM-DD as printed
confidence        { vendor_name, total, date } each 0..1
```

`brand` exists for gas stations: branded receipts print the logo text (Shell, bp) prominently
while the header line is the operator's name. Asking for it separately is cheaper and more
reliable than hoping the printed name contains the chain.

No line items. Not needed, and every field you ask for is a field the model can get wrong.

**Server-side checks after the model returns** (this is where most of the reliability comes from):

| Check | Effect |
|---|---|
| `is_receipt = false` | return `no_receipt`, prefill nothing |
| `subtotal + tax` within $0.02 of `total` | total confidence floors at 0.95 |
| subtotal and tax present but don't sum to total | total confidence capped at 0.5, chip shows amber "check amount" |
| `total <= 0` or `> 50,000` | drop total |
| `date` in the future or older than 120 days | first try the printed month/day under this year or last year (vision models misread "10/19/2026" as 2023 — seen on the first live scan); if that lands in the window keep it at confidence ≤0.6 and log `date_year_repaired`, else drop the date (worker's today stays) |

**Vendor matching**, in order, first hit wins:

| Tier (`vendorMatch.tier`) | Method | Score |
|---|---|---|
| `alias_exact` | `exact` alias = `normalize(vendor_name)` | 1.0 |
| `brand` | `exact` or `token` alias = `normalize(brand)` (when the model returned a brand) | 0.97 |
| `alias_token` | `token` alias appears as a whole-word token sequence inside `normalize(vendor_name)`; longest alias wins on a tie | 0.95 |
| `name` | `normalize(payee_name) = normalize(vendor_name)` or one contains the other (min 4 chars) | 0.9 / 0.88 |
| `fuzzy` | Jaro-Winkler on normalized strings against the candidate pool, ≥ 0.85 | score |
| `none` | no match | return raw `vendor_name` (and `brand`) only |

Worked examples against the payees on file today:

| Printed | Brand from model | Resolves via | Payee |
|---|---|---|---|
| `THE HOME DEPOT #3851` | Home Depot | 1 (exact `HOME DEPOT` after normalize) | Home Depot |
| `TIMMY TOM'S SHELL` | Shell | 1b (`SHELL`) | Shell Gas |
| `BILLY BOB'S BP` | BP | 1b (`BP`) | BP Gas |
| `BILLY BOB'S BRITISH PETROLEUM` | BP | 1b, or 2 on `BRITISH PETROLEUM` if brand is null | BP Gas |
| `QT 742` | QuikTrip | 1b, or 2 on `QT` | Quick Trip |
| `JOES CORNER MART` (unbranded) | null | 5, worker picks, alias learned | — |

Candidates are active, non-internal payees (the same filter `PayeeSelector` applies in the modal). Tier 4 also returns the top 3 candidates so the UI can offer them.

**Response**
```json
{
  "status": "success" | "partial" | "no_receipt" | "failed",
  "extraction": { "vendor_name": "THE HOME DEPOT #3851", "brand": null, "total": 84.12, "subtotal": 78.62, "tax": 5.50, "date": "2026-10-24", "confidence": { "vendor_name": 0.98, "total": 0.97, "date": 0.9 } },
  "vendorMatch": { "payee_id": "…", "payee_name": "Home Depot", "tier": 1, "score": 1.0, "candidates": [] },
  "meta": { "model": "…", "latency_ms": 3100 }
}
```

**Benchmark before any UI ships.** The 577 existing receipts are a labeled test set: the image is in `time-tracker-documents` and the worker already typed the amount and picked the vendor. A one-off script (`scripts/benchmark-receipt-scan.ts`, service role, runs locally) pulls the most recent 100, calls the function, and reports:

| Gate | Target to ship |
|---|---|
| Total exact match (±$0.01) | ≥ 90% |
| Total wrong but confidence < 0.7 (i.e. flagged amber) | counts as pass |
| Vendor tier 1–4 correct | ≥ 85% |
| Vendor wrong match (worse than no match) | ≤ 3% |
| p90 latency | ≤ 8s |
| `no_receipt` on real receipts | ≤ 2% |

If totals miss 90%, try `detail: "high"` and a tighter prompt first; if still short, swap the provider inside the function (Textract AnalyzeExpense) and re-run. The UI is not touched by that decision. The script's output table goes in this doc.

Deploy via CLI (`npx supabase functions deploy scan-receipt --project-ref clsjdxwbsjbhjibvlqbz`), add the function to the CLAUDE.md edge-function table with its pinned version.

## Phase 2: client (one day)

**`src/hooks/useReceiptScan.ts`**
- `scan(file): Promise<ScanResult | null>`, plus `status: 'idle'|'scanning'|'done'|'failed'|'timeout'|'skipped'`.
- Compress with `compressImage({ maxWidth: 1600, quality: 0.8 })`, strip the data-URL prefix, invoke the function.
- `AbortController` with a 12s timeout → `timeout`. `navigator.onLine === false` → `skipped` without calling.
- Reads the flag via `useDbFeatureFlag('receipt_scan')`; flag off → `scan()` is a no-op returning null. Flag off is byte-identical to today's modal.
- No realtime, no `auth.getUser()`, plain invoke (house rules, Gotchas #53/#63).

**`AddReceiptModal` changes**
- Add a **Date** field (defaults to today, same `captured_at` semantics the Edit dialog already uses). This is the one new field; it exists so the scan has somewhere to put the receipt date, and it fixes "photographed three days later" receipts.
- Fire `scan()` in `handleFileInputChange` right after the preview renders. Keep a `scanRequestId` ref so a retake discards an in-flight result.
- Prefill rules:
  - **Amount**: set when `total` present and confidence ≥ 0.7. Below 0.7, still set but show amber "check this". Null → leave empty.
  - **Vendor**: tier 1 through 3 → set `selectedPayeeId`, green check. Tier 4 → set, but chip says "Looks like {name}, tap to change". Tier 5 → leave empty, render the hint line `Receipt says: {raw}` with an **Add as new vendor** button that opens PayeeSelector's existing quick-add with the name pre-typed (type left to the worker; gas stations are `other`, not `material_supplier`).
  - **Date**: set when present and passed the server sanity window.
  - Never overwrite a field the worker has already typed into (track `touched` per field).
- `ScanStatusChip` under the photo: scanning / found summary / couldn't read / timed out. Small, one line, no modal, no toast for the normal path. The only toast is on a hard failure, and it is informational.
- Save is enabled on the same conditions as today. It never checks scan state. On Save, write `ocr_status` and `ocr_data` (extraction + match + `user_kept`).

**Alias learning on Save.** If the scan returned a `vendor_name` and the saved `payee_id` differs from `vendorMatch.payee_id` (or there was no match), upsert `payee_aliases(alias = normalize(vendor_name), payee_id = saved, source = 'learned', created_by = user)`. On a tier-1 hit, bump `hit_count`. Best-effort, wrapped in try/catch, never blocks the save (same pattern as the last-project localStorage write).

Guard against learning garbage: skip if the normalized alias is shorter than 3 characters, or if the worker saved with the scan's own suggestion (nothing to learn).

## Phase 3: rollout and measurement (one week, mostly waiting)

1. Flag `receipt_scan` ON for Chris only via `/settings/feature-flags` overrides. One week of real receipts.
2. Accuracy query, run weekly at first:

```sql
SELECT
  count(*) FILTER (WHERE ocr_status IN ('success','partial'))                                   AS scanned,
  count(*) FILTER (WHERE (ocr_data->'extraction'->>'total')::numeric = amount)                   AS total_right,
  count(*) FILTER (WHERE (ocr_data->'vendorMatch'->>'payee_id')::uuid = payee_id)                AS vendor_right,
  count(*) FILTER (WHERE ocr_data->'vendorMatch'->>'tier' = 'none')                              AS vendor_unmatched,
  count(*) FILTER (WHERE ocr_status IN ('failed','timeout'))                                     AS failed,
  round(avg((ocr_data->'meta'->>'latency_ms')::int))                                             AS avg_ms
FROM receipts
WHERE created_at > now() - interval '7 days' AND ocr_status IS NOT NULL;
```

3. If totals ≥ 90% and vendor ≥ 85% in production, flip the flag globally. Field workers get it with no training beyond "the amount fills in now, check it".
4. Add a "Learned vendor aliases" list to the Payees admin page later if it ever needs pruning. Not in v1.

## Failure modes, each with its answer

| Failure | What happens |
|---|---|
| OpenAI down / key revoked | function returns `failed`, chip says enter by hand, form is today's form |
| Slow network | 12s timeout, same as above; if the worker already saved, result is discarded |
| Offline | scan skipped before calling; `backgroundSync` behavior for the upload is unchanged |
| Blurry photo | model returns low confidence or null; amber or empty, never a confident wrong number |
| Photo of something that isn't a receipt | `is_receipt=false`, nothing prefilled |
| Long receipt, total cut off | total null, amount stays empty; chip hint "include the total in the photo" |
| Store number variants (`HOME DEPOT #3851`) | normalization strips them before alias lookup |
| Franchised gas station (`TIMMY TOMS SHELL`, `BILLY BOBS BP`) | model's `brand` field + whole-word token aliases resolve the chain on the first visit |
| Token alias misfires on an odd vendor (`SHELL LUMBER`) | worker's correction is an `exact` alias and wins at tier 1 from then on |
| New store the system has never seen | tier 4, worker picks or adds vendor, alias learned, matches next time |
| Model picks subtotal instead of total | subtotal+tax cross-check caps confidence → amber "check amount" |
| Worker edits a scanned value | touched-field tracking; scan never overwrites it |
| Two workers correct the same store to different payees | unique alias index; first write wins, admin can fix in SQL (UI later) |
| Function CPU/memory limit (Gotcha #75) | server never decodes image bytes; client resizes; 1.5 MB cap |

## Explicitly not building

- Line-item extraction. Receipts are documentation only (Rule 7); nothing downstream reads line items.
- Auto-save or auto-submit. The tap on Save is the human check.
- Auto-creating payees. A wrong vendor record pollutes 357 payees and QuickBooks sync.
- On-device OCR. See above.
- Rescan on the Edit dialog. Cheap to add after v1 proves out, but it is a second surface to verify.
- Category or project inference. Project stays the sticky last-used pick; it is already right most of the time (only 6 of 293 recent receipts landed unassigned).

## Privacy note

Receipt images go to OpenAI's API, as site photos already do for caption enhancement. API traffic is not used for training under OpenAI's API terms. Receipts can carry the last four digits of a card; the extraction schema does not ask for them and nothing stores them.

## Effort

| Phase | Time |
|---|---|
| 0 Data | 0.5 day |
| 1 Function + benchmark on 100 real receipts | 1 day |
| 2 Client | 1 day |
| 3 Rollout | 1 week elapsed, ~1 hour of work |

Three working days to a benchmarked, flag-gated feature. The benchmark is the step that makes "will it work" a number instead of a hope.
