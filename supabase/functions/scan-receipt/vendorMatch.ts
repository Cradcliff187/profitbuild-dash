/**
 * Vendor → payee resolution for scan-receipt.
 *
 * Pure module: no Deno / Supabase imports, so the same file is unit-tested from
 * the app's vitest suite (src/utils/__tests__/receiptVendorMatch.test.ts) and
 * bundled into the edge function unchanged.
 *
 * Tiers (docs/RECEIPT_SCAN_PLAN.md, "Vendor matching"):
 *   alias_exact  — exact alias equals the normalized printed vendor name
 *   brand        — alias (exact or token) matches the model's `brand` field
 *   alias_token  — a token-mode alias appears as a whole-word token run inside
 *                  the normalized printed name ("TIMMY TOMS SHELL" ⊃ "SHELL")
 *   name         — normalized payee_name equals / contains / is contained by the
 *                  printed name (min 4 chars)
 *   fuzzy        — Jaro-Winkler ≥ FUZZY_THRESHOLD against payee names
 *   none         — nothing usable; UI shows the raw text as a hint
 */

export type MatchTier = 'alias_exact' | 'brand' | 'alias_token' | 'name' | 'fuzzy' | 'none';

export interface PayeeRow {
  id: string;
  payee_name: string;
  payee_type: string | null;
}

export interface AliasRow {
  id: string;
  payee_id: string;
  alias: string;
  match_mode: 'exact' | 'token';
}

export interface VendorCandidate {
  payee_id: string;
  payee_name: string;
  score: number;
}

export interface VendorMatch {
  payee_id: string | null;
  payee_name: string | null;
  tier: MatchTier;
  score: number;
  /** Alias row that produced the hit (for hit_count bumps). */
  alias_id: string | null;
  /** Top fuzzy candidates for the UI when no confident hit exists. */
  candidates: VendorCandidate[];
}

export const FUZZY_THRESHOLD = 0.85;
const CANDIDATE_FLOOR = 0.6;
const MIN_CONTAINS_LENGTH = 4;

/** Tokens that carry no identity and only hurt matching. */
const NOISE_TOKENS = new Set(['THE', 'INC', 'LLC', 'CO', 'CORP', 'LTD', 'STORE', 'STR', 'NO', 'NUM']);

/**
 * Normalize a printed vendor string so receipts, aliases, and payee names all
 * compare on the same footing. MUST stay in lockstep with the seed rows in
 * migration add_receipt_scan_prefill (they are stored pre-normalized).
 *
 *   "The Home Depot #3851"  → "HOME DEPOT"
 *   "Timmy Tom's Shell"     → "TIMMY TOMS SHELL"
 *   "QT 742"                → "QT"
 *   "Lowe's"                → "LOWES"
 */
export function normalizeVendor(input: string | null | undefined): string {
  if (!input) return '';
  const tokens = input
    .toUpperCase()
    .replace(/['’`]/g, '')            // Tom's → TOMS, Lowe's → LOWES
    .replace(/[^A-Z0-9]+/g, ' ')      // punctuation / # / & → space
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !NOISE_TOKENS.has(t))
    .filter((t) => !/^\d+$/.test(t))  // store numbers, register numbers
    .filter((t) => !/^#?\d+[A-Z]?$/.test(t));
  return tokens.join(' ');
}

function tokensOf(normalized: string): string[] {
  return normalized ? normalized.split(' ') : [];
}

/** True when `needle` tokens appear as a contiguous whole-word run inside `haystack`. */
export function containsTokenRun(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

/** Jaro-Winkler similarity in [0, 1]. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aFlags = new Array<boolean>(a.length).fill(false);
  const bFlags = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - window);
    const hi = Math.min(b.length - 1, i + window);
    for (let j = lo; j <= hi; j++) {
      if (!bFlags[j] && a[i] === b[j]) {
        aFlags[i] = true;
        bFlags[j] = true;
        matches++;
        break;
      }
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aFlags[i]) continue;
    while (!bFlags[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function none(candidates: VendorCandidate[]): VendorMatch {
  return { payee_id: null, payee_name: null, tier: 'none', score: 0, alias_id: null, candidates };
}

function hit(
  tier: MatchTier,
  score: number,
  payee: PayeeRow,
  alias_id: string | null,
  candidates: VendorCandidate[] = [],
): VendorMatch {
  return { payee_id: payee.id, payee_name: payee.payee_name, tier, score, alias_id, candidates };
}

/** Longest token alias (most tokens, then most chars) wins when several are contained. */
function bestTokenAlias(haystack: string[], aliases: AliasRow[]): AliasRow | null {
  let best: AliasRow | null = null;
  for (const a of aliases) {
    if (a.match_mode !== 'token') continue;
    const needle = tokensOf(a.alias);
    if (!containsTokenRun(haystack, needle)) continue;
    if (
      !best ||
      needle.length > tokensOf(best.alias).length ||
      (needle.length === tokensOf(best.alias).length && a.alias.length > best.alias.length)
    ) {
      best = a;
    }
  }
  return best;
}

export function matchVendor(
  vendorName: string | null | undefined,
  brand: string | null | undefined,
  payees: PayeeRow[],
  aliases: AliasRow[],
): VendorMatch {
  const payeeById = new Map(payees.map((p) => [p.id, p]));
  // Aliases pointing at a payee that is not in the candidate pool (inactive,
  // wrong type for this surface) must not resolve.
  const usable = aliases.filter((a) => payeeById.has(a.payee_id));
  const aliasByText = new Map(usable.map((a) => [a.alias, a]));

  const nv = normalizeVendor(vendorName);
  const nb = normalizeVendor(brand);
  const nvTokens = tokensOf(nv);
  const nbTokens = tokensOf(nb);

  // Tier: alias_exact
  if (nv) {
    const a = aliasByText.get(nv);
    if (a) return hit('alias_exact', 1, payeeById.get(a.payee_id)!, a.id);
  }

  // Tier: brand (exact or token alias against the model's brand field)
  if (nb) {
    const exact = aliasByText.get(nb);
    if (exact) return hit('brand', 0.97, payeeById.get(exact.payee_id)!, exact.id);
    const tok = bestTokenAlias(nbTokens, usable);
    if (tok) return hit('brand', 0.97, payeeById.get(tok.payee_id)!, tok.id);
  }

  // Tier: alias_token inside the printed name
  if (nvTokens.length) {
    const tok = bestTokenAlias(nvTokens, usable);
    if (tok) return hit('alias_token', 0.95, payeeById.get(tok.payee_id)!, tok.id);
  }

  // Tier: name (normalized payee_name equal / contains)
  const normalizedPayees = payees
    .map((p) => ({ p, n: normalizeVendor(p.payee_name) }))
    .filter((x) => x.n.length > 0);

  if (nv) {
    const equal = normalizedPayees.find((x) => x.n === nv);
    if (equal) return hit('name', 0.9, equal.p, null);

    const contains = normalizedPayees
      .filter(
        (x) =>
          x.n.length >= MIN_CONTAINS_LENGTH &&
          nv.length >= MIN_CONTAINS_LENGTH &&
          (containsTokenRun(nvTokens, tokensOf(x.n)) || containsTokenRun(tokensOf(x.n), nvTokens)),
      )
      .sort((a, b) => b.n.length - a.n.length)[0];
    if (contains) return hit('name', 0.88, contains.p, null);
  }

  // Tier: fuzzy, and candidate list for the UI either way
  const probe = nv || nb;
  if (!probe) return none([]);

  const scored = normalizedPayees
    .map((x) => ({ payee_id: x.p.id, payee_name: x.p.payee_name, score: jaroWinkler(probe, x.n) }))
    .filter((c) => c.score >= CANDIDATE_FLOOR)
    .sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, 3).map((c) => ({ ...c, score: Math.round(c.score * 1000) / 1000 }));

  if (scored[0] && scored[0].score >= FUZZY_THRESHOLD) {
    return hit('fuzzy', candidates[0].score, payeeById.get(scored[0].payee_id)!, null, candidates);
  }
  return none(candidates);
}
