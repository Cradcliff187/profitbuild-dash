import { describe, expect, it } from 'vitest';
import { resolveFeatureFlag } from '@/hooks/useDbFeatureFlag';

/**
 * Pins the override-wins resolution rule documented in CLAUDE.md
 * ("Per-user overrides"): override row wins, else global `enabled`,
 * NULL/missing ⇒ off.
 */
describe('resolveFeatureFlag', () => {
  it('uses the global value when the user has no override', () => {
    expect(resolveFeatureFlag(null, { enabled: true })).toBe(true);
    expect(resolveFeatureFlag(undefined, { enabled: false })).toBe(false);
  });

  it('treats a NULL global column or a missing flag row as off', () => {
    expect(resolveFeatureFlag(null, { enabled: null })).toBe(false);
    expect(resolveFeatureFlag(null, null)).toBe(false);
    expect(resolveFeatureFlag(null, undefined)).toBe(false);
  });

  it('lets an ON override win over a global OFF', () => {
    expect(resolveFeatureFlag({ enabled: true }, { enabled: false })).toBe(true);
    expect(resolveFeatureFlag({ enabled: true }, null)).toBe(true);
  });

  it('lets a force-OFF override win over a global ON', () => {
    expect(resolveFeatureFlag({ enabled: false }, { enabled: true })).toBe(false);
  });
});
