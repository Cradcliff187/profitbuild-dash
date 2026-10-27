/**
 * scan-receipt — pre-fill amount / vendor / date from a receipt photo.
 *
 * Contract: docs/RECEIPT_SCAN_PLAN.md. The scan is a PRE-FILL, never a gate:
 * every non-2xx or `status: 'failed'` outcome leaves the Add Receipt form
 * exactly as it is today. Nothing here writes to the database except a
 * best-effort hit_count bump on the alias that matched.
 *
 * Request  (POST, user JWT required — verify_jwt is on AND we resolve the user):
 *   { imageBase64: string, mimeType?: 'image/jpeg'|'image/png'|'image/webp',
 *     allowedPayeeTypes?: string[] }
 *
 * Response (200):
 *   { status: 'success'|'partial'|'no_receipt'|'failed',
 *     extraction: {...} | null, vendorMatch: {...} | null,
 *     normalized: { vendor, brand }, meta: { model, latency_ms }, error? }
 *
 * The isolate never decodes image bytes (Gotcha #75 — WORKER_LIMIT): the phone
 * resizes to ~1600px JPEG and we forward the base64 untouched.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { matchVendor, normalizeVendor, type AliasRow, type PayeeRow } from './vendorMatch.ts';

// Pinned in ONE place. Change only after re-running the benchmark in the plan doc.
const OPENAI_MODEL = 'gpt-4o';
const OPENAI_TIMEOUT_MS = 20_000;
const MAX_IMAGE_BASE64_LENGTH = 2_000_000; // ≈1.5 MB of JPEG
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_PAYEE_TYPES = ['material_supplier', 'equipment_rental', 'management', 'permit_authority', 'other'];
const MAX_TOTAL = 50_000;
const DATE_WINDOW_DAYS = 120;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Extraction {
  is_receipt: boolean;
  vendor_name: string | null;
  brand: string | null;
  total: number | null;
  subtotal: number | null;
  tax: number | null;
  date: string | null;
  confidence: { vendor_name: number; total: number; date: number };
}

const EXTRACTION_SCHEMA = {
  name: 'receipt_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['is_receipt', 'vendor_name', 'brand', 'total', 'subtotal', 'tax', 'date', 'confidence'],
    properties: {
      is_receipt: { type: 'boolean', description: 'true only for a purchase receipt or invoice' },
      vendor_name: { type: ['string', 'null'], description: 'Merchant name as printed at the top, not the address or slogan' },
      brand: {
        type: ['string', 'null'],
        description:
          'The chain or fuel brand when this is a franchised/branded location whose printed name differs (e.g. "Shell", "BP", "Marathon"). null when the vendor_name already IS the brand or no brand is visible.',
      },
      total: { type: ['number', 'null'], description: 'Final amount paid after tax and discounts. Not amount tendered, not change.' },
      subtotal: { type: ['number', 'null'] },
      tax: { type: ['number', 'null'] },
      date: { type: ['string', 'null'], description: 'Transaction date as printed, YYYY-MM-DD' },
      confidence: {
        type: 'object',
        additionalProperties: false,
        required: ['vendor_name', 'total', 'date'],
        properties: {
          vendor_name: { type: 'number' },
          total: { type: 'number' },
          date: { type: 'number' },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `You read photos of purchase receipts for a construction company and extract a few fields.
Rules:
- vendor_name is the merchant name printed at the top of the receipt. Never the street address, phone number, slogan, or cashier name.
- brand is the chain or fuel brand ONLY when the location is a franchised or branded store whose printed name is the operator's name (e.g. printed "Timmy Tom's Shell" → brand "Shell"; printed "Billy Bob's BP" → brand "BP"). If the printed name already is the brand, or there is no visible brand, brand is null.
- total is the final amount the customer paid: the line labelled TOTAL, AMOUNT DUE, or the card charge. Not SUBTOTAL, not CASH/TENDERED, not CHANGE.
- date is the transaction date printed on the receipt, formatted YYYY-MM-DD. If only a partial date is visible, return null.
- If a value is not clearly visible, return null for it and a confidence of 0. Never guess.
- is_receipt is false for anything that is not a purchase receipt or invoice (a photo of a job site, a document, a screen).
- confidence values are 0 to 1 and reflect how clearly each field is legible.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Server-side sanity pass. Returns the cleaned extraction plus flags for the status. */
function sanitize(raw: Extraction, now: Date): { extraction: Extraction; dropped: string[] } {
  const dropped: string[] = [];
  const e: Extraction = {
    is_receipt: !!raw.is_receipt,
    vendor_name: typeof raw.vendor_name === 'string' && raw.vendor_name.trim() ? raw.vendor_name.trim() : null,
    brand: typeof raw.brand === 'string' && raw.brand.trim() ? raw.brand.trim() : null,
    total: typeof raw.total === 'number' && isFinite(raw.total) ? round2(raw.total) : null,
    subtotal: typeof raw.subtotal === 'number' && isFinite(raw.subtotal) ? round2(raw.subtotal) : null,
    tax: typeof raw.tax === 'number' && isFinite(raw.tax) ? round2(raw.tax) : null,
    date: typeof raw.date === 'string' ? raw.date.trim() : null,
    confidence: {
      vendor_name: clamp01(raw.confidence?.vendor_name),
      total: clamp01(raw.confidence?.total),
      date: clamp01(raw.confidence?.date),
    },
  };

  // Amount: bounds, then subtotal + tax cross-check.
  if (e.total !== null && (e.total <= 0 || e.total > MAX_TOTAL)) {
    dropped.push(`total_out_of_bounds:${e.total}`);
    e.total = null;
    e.confidence.total = 0;
  }
  if (e.total !== null && e.subtotal !== null && e.tax !== null) {
    const diff = Math.abs(e.subtotal + e.tax - e.total);
    if (diff <= 0.02) {
      e.confidence.total = Math.max(e.confidence.total, 0.95);
    } else {
      e.confidence.total = Math.min(e.confidence.total, 0.5);
      dropped.push(`total_mismatch:${e.subtotal}+${e.tax}!=${e.total}`);
    }
  }

  // Date: must parse and sit inside [now - 120d, now + 1d].
  if (e.date !== null) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date);
    const parsed = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
    const ok =
      parsed &&
      !isNaN(parsed.getTime()) &&
      parsed.getTime() <= now.getTime() + 86_400_000 &&
      parsed.getTime() >= now.getTime() - DATE_WINDOW_DAYS * 86_400_000;
    if (!ok) {
      dropped.push(`date_out_of_window:${e.date}`);
      e.date = null;
      e.confidence.date = 0;
    }
  }

  return { extraction: e, dropped };
}

function clamp01(n: unknown): number {
  return typeof n === 'number' && isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

async function callOpenAI(apiKey: string, imageBase64: string, mimeType: string): Promise<Extraction> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_schema', json_schema: EXTRACTION_SCHEMA },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the fields from this receipt photo.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('OpenAI returned no content');
    return JSON.parse(content) as Extraction;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const started = Date.now();
  try {
    // --- Auth: a real user, not just a valid anon JWT at the gateway. ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Unauthorized' }, 401);

    // --- Input ---
    const body = (await req.json().catch(() => null)) as
      | { imageBase64?: string; mimeType?: string; allowedPayeeTypes?: string[] }
      | null;
    const imageBase64 = body?.imageBase64;
    const mimeType = body?.mimeType ?? 'image/jpeg';
    if (!imageBase64 || typeof imageBase64 !== 'string') return json({ error: 'imageBase64 is required' }, 400);
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return json({ error: `Image too large (${imageBase64.length} chars base64; max ${MAX_IMAGE_BASE64_LENGTH})` }, 413);
    }
    if (!ALLOWED_MIME.has(mimeType)) return json({ error: `Unsupported mimeType ${mimeType}` }, 400);
    const allowedTypes =
      Array.isArray(body?.allowedPayeeTypes) && body!.allowedPayeeTypes!.length > 0
        ? body!.allowedPayeeTypes!.filter((t) => typeof t === 'string')
        : DEFAULT_PAYEE_TYPES;

    // --- Candidate pool + aliases (service role; the pool is filtered to what
    //     the modal's PayeeSelector can actually display). Fired in parallel
    //     with the model call — they don't depend on each other. ---
    const admin = createClient(supabaseUrl, serviceKey);
    const poolPromise = Promise.all([
      admin
        .from('payees')
        .select('id, payee_name, payee_type')
        .eq('is_active', true)
        .eq('is_internal', false)
        .in('payee_type', allowedTypes)
        .range(0, 1999),
      admin.from('payee_aliases').select('id, payee_id, alias, match_mode').range(0, 4999),
    ]);

    // --- Model ---
    let raw: Extraction;
    try {
      raw = await callOpenAI(openaiKey, imageBase64, mimeType);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[scan-receipt] model error', { user: userData.user.id, message });
      return json({
        status: 'failed',
        extraction: null,
        vendorMatch: null,
        normalized: { vendor: '', brand: '' },
        meta: { model: OPENAI_MODEL, latency_ms: Date.now() - started },
        error: message.includes('abort') ? 'Model timed out' : 'Model call failed',
      });
    }

    const { extraction, dropped } = sanitize(raw, new Date());

    if (!extraction.is_receipt) {
      console.log('[scan-receipt] no_receipt', { user: userData.user.id, latency_ms: Date.now() - started });
      return json({
        status: 'no_receipt',
        extraction,
        vendorMatch: null,
        normalized: { vendor: normalizeVendor(extraction.vendor_name), brand: normalizeVendor(extraction.brand) },
        meta: { model: OPENAI_MODEL, latency_ms: Date.now() - started, dropped },
      });
    }

    // --- Vendor match ---
    const [payeesRes, aliasesRes] = await poolPromise;
    if (payeesRes.error) throw payeesRes.error;
    if (aliasesRes.error) throw aliasesRes.error;
    const payees = (payeesRes.data ?? []) as PayeeRow[];
    const aliases = (aliasesRes.data ?? []) as AliasRow[];

    const vendorMatch = matchVendor(extraction.vendor_name, extraction.brand, payees, aliases);

    // Best-effort usage counter on the alias that fired. Awaited (one tiny
    // UPDATE) because the isolate may be torn down right after the response
    // is sent; a failure here never fails the scan.
    if (vendorMatch.alias_id) {
      try {
        const { error: bumpError } = await admin.rpc('increment_payee_alias_hit', { p_alias_id: vendorMatch.alias_id });
        if (bumpError) console.warn('[scan-receipt] hit_count bump failed', bumpError.message);
      } catch (bumpErr) {
        console.warn('[scan-receipt] hit_count bump failed', bumpErr);
      }
    }

    const hasAmount = extraction.total !== null;
    const hasVendor = vendorMatch.payee_id !== null;
    const status = hasAmount && hasVendor ? 'success' : hasAmount || hasVendor || extraction.vendor_name ? 'partial' : 'failed';

    const latency_ms = Date.now() - started;
    console.log('[scan-receipt] done', {
      user: userData.user.id,
      status,
      tier: vendorMatch.tier,
      total: extraction.total,
      total_conf: extraction.confidence.total,
      dropped,
      latency_ms,
    });

    return json({
      status,
      extraction,
      vendorMatch,
      normalized: { vendor: normalizeVendor(extraction.vendor_name), brand: normalizeVendor(extraction.brand) },
      meta: { model: OPENAI_MODEL, latency_ms, dropped },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[scan-receipt] error', message);
    return json({ error: message }, 500);
  }
});
