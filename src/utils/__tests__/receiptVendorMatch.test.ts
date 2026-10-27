/**
 * Pins the vendor → payee resolution used by the scan-receipt edge function
 * (supabase/functions/scan-receipt/vendorMatch.ts — a pure module shared with
 * the Deno bundle). The payee names and seed aliases below mirror production
 * rows as of Oct 27 2026 (migration add_receipt_scan_prefill).
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeVendor,
  containsTokenRun,
  jaroWinkler,
  matchVendor,
  type AliasRow,
  type PayeeRow,
} from '../../../supabase/functions/scan-receipt/vendorMatch';

const payees: PayeeRow[] = [
  { id: 'hd', payee_name: 'Home Depot', payee_type: 'material_supplier' },
  { id: 'menards', payee_name: 'Menards', payee_type: 'material_supplier' },
  { id: 'qt', payee_name: 'Quick Trip', payee_type: 'other' },
  { id: 'sw', payee_name: 'sherwin williams', payee_type: 'material_supplier' },
  { id: 'shell', payee_name: 'Shell Gas', payee_type: 'other' },
  { id: 'lowes', payee_name: 'Lowes ', payee_type: 'material_supplier' },
  { id: 'bp', payee_name: 'BP Gas', payee_type: 'material_supplier' },
  { id: 'hf', payee_name: 'Harbor Freight', payee_type: 'material_supplier' },
  { id: 'fishman', payee_name: 'Fishman Flooring Solutions', payee_type: 'material_supplier' },
  { id: 'interior', payee_name: 'Interior Supply', payee_type: 'material_supplier' },
  { id: 'shell-lumber', payee_name: 'Shell Lumber Co', payee_type: 'material_supplier' },
];

let aliasSeq = 0;
const alias = (payee_id: string, text: string, match_mode: 'exact' | 'token' = 'token'): AliasRow => ({
  id: `a${++aliasSeq}`,
  payee_id,
  alias: text,
  match_mode,
});

const seeds: AliasRow[] = [
  alias('hd', 'HOME DEPOT'),
  alias('menards', 'MENARDS'),
  alias('qt', 'QUIKTRIP'),
  alias('qt', 'QUIK TRIP'),
  alias('qt', 'QT'),
  alias('sw', 'SHERWIN WILLIAMS'),
  alias('shell', 'SHELL'),
  alias('shell', 'SHELL OIL'),
  alias('lowes', 'LOWES'),
  alias('bp', 'BP'),
  alias('bp', 'BRITISH PETROLEUM'),
  alias('hf', 'HARBOR FREIGHT TOOLS'),
  alias('hf', 'HARBOR FREIGHT'),
  alias('fishman', 'FISHMAN FLOORING'),
];

describe('normalizeVendor', () => {
  it('strips store numbers, punctuation, THE/INC/LLC and apostrophes', () => {
    expect(normalizeVendor('The Home Depot #3851')).toBe('HOME DEPOT');
    expect(normalizeVendor("Timmy Tom's Shell")).toBe('TIMMY TOMS SHELL');
    expect(normalizeVendor("Lowe's")).toBe('LOWES');
    expect(normalizeVendor('QT 742')).toBe('QT');
    expect(normalizeVendor('SHERWIN-WILLIAMS CO.')).toBe('SHERWIN WILLIAMS');
    expect(normalizeVendor('Harbor Freight Tools, Inc.')).toBe('HARBOR FREIGHT TOOLS');
  });

  it('is empty-safe', () => {
    expect(normalizeVendor(null)).toBe('');
    expect(normalizeVendor('   ')).toBe('');
    expect(normalizeVendor('#1234')).toBe('');
  });
});

describe('containsTokenRun', () => {
  it('matches whole-word contiguous runs only', () => {
    expect(containsTokenRun(['BILLY', 'BOBS', 'BP'], ['BP'])).toBe(true);
    expect(containsTokenRun(['BILLY', 'BOBS', 'BRITISH', 'PETROLEUM'], ['BRITISH', 'PETROLEUM'])).toBe(true);
    expect(containsTokenRun(['BPI', 'SUPPLY'], ['BP'])).toBe(false);
    expect(containsTokenRun(['HARBOR', 'X', 'FREIGHT'], ['HARBOR', 'FREIGHT'])).toBe(false);
    expect(containsTokenRun([], ['BP'])).toBe(false);
  });
});

describe('jaroWinkler', () => {
  it('scores identical high and unrelated low', () => {
    expect(jaroWinkler('MENARDS', 'MENARDS')).toBe(1);
    expect(jaroWinkler('MENARDS', 'MENARD')).toBeGreaterThan(0.9);
    expect(jaroWinkler('MENARDS', 'VALVOLINE')).toBeLessThan(0.6);
  });
});

describe('matchVendor', () => {
  it('exact alias on the printed name wins (store number stripped)', () => {
    const m = matchVendor('THE HOME DEPOT #3851', 'Home Depot', payees, seeds);
    expect(m.tier).toBe('alias_exact');
    expect(m.payee_id).toBe('hd');
    expect(m.alias_id).toBeTruthy();
  });

  it('franchised gas station resolves through the brand field on first visit', () => {
    expect(matchVendor("TIMMY TOM'S SHELL", 'Shell', payees, seeds)).toMatchObject({ tier: 'brand', payee_id: 'shell' });
    expect(matchVendor("BILLY BOB'S BP", 'BP', payees, seeds)).toMatchObject({ tier: 'brand', payee_id: 'bp' });
  });

  it('falls back to a token alias inside the printed name when brand is null', () => {
    expect(matchVendor("BILLY BOB'S BRITISH PETROLEUM", null, payees, seeds)).toMatchObject({
      tier: 'alias_token',
      payee_id: 'bp',
    });
    expect(matchVendor('QT 742 CINCINNATI OH', null, payees, seeds)).toMatchObject({ tier: 'alias_token', payee_id: 'qt' });
    // Store number stripped → the whole name IS the alias → exact beats token.
    expect(matchVendor('QT 742', null, payees, seeds)).toMatchObject({ tier: 'alias_exact', payee_id: 'qt' });
  });

  it('longest contained token alias wins on overlap', () => {
    expect(matchVendor('HARBOR FREIGHT TOOLS 0421', null, payees, seeds).alias_id).toBe(
      seeds.find((a) => a.alias === 'HARBOR FREIGHT TOOLS')!.id,
    );
  });

  it('a learned exact alias beats a token alias (worker correction wins)', () => {
    const learned = [...seeds, alias('shell-lumber', 'SHELL LUMBER', 'exact')];
    expect(matchVendor('Shell Lumber', null, payees, learned)).toMatchObject({
      tier: 'alias_exact',
      payee_id: 'shell-lumber',
    });
    // Before the correction the token alias misfires onto Shell Gas — the
    // documented trade-off that the learning loop repairs.
    expect(matchVendor('Shell Lumber', null, payees, seeds)).toMatchObject({ tier: 'alias_token', payee_id: 'shell' });
  });

  it('matches by payee name when no alias exists', () => {
    expect(matchVendor('Interior Supply Co', null, payees, seeds)).toMatchObject({ tier: 'name', payee_id: 'interior' });
    expect(matchVendor('INTERIOR SUPPLY CINCINNATI', null, payees, seeds)).toMatchObject({
      tier: 'name',
      payee_id: 'interior',
    });
  });

  it('fuzzy-matches a near-miss spelling', () => {
    const m = matchVendor('Menard', null, payees, seeds);
    expect(m.tier).toBe('fuzzy');
    expect(m.payee_id).toBe('menards');
    expect(m.candidates[0].payee_id).toBe('menards');
  });

  it('returns none (with candidates) for an unknown vendor', () => {
    const m = matchVendor("JOE'S CORNER MART", null, payees, seeds);
    expect(m.tier).toBe('none');
    expect(m.payee_id).toBeNull();
  });

  it('never resolves to a payee outside the candidate pool', () => {
    const pool = payees.filter((p) => p.id !== 'shell');
    const m = matchVendor("TIMMY TOM'S SHELL", 'Shell', pool, seeds);
    expect(m.payee_id).not.toBe('shell');
    expect(m.tier).not.toBe('brand');
  });

  it('is empty-safe', () => {
    expect(matchVendor(null, null, payees, seeds)).toMatchObject({ tier: 'none', payee_id: null, candidates: [] });
  });
});
