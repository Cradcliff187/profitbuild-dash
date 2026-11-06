import { describe, expect, it } from 'vitest';
import {
  formatProjectCounter,
  formatProjectSequence,
  parseProjectSequenceInput,
  validateNextSequence,
} from '../projectNumbering';

describe('project numbering helpers (Rule 43)', () => {
  it('formats sequences and counters the way the DB does, without wrapping at 999', () => {
    expect(formatProjectSequence(5)).toBe('225-005');
    expect(formatProjectSequence(205)).toBe('225-205');
    expect(formatProjectSequence(1000)).toBe('225-1000');
    expect(formatProjectCounter(225205)).toBe('225-205');
    expect(formatProjectCounter(225176)).toBe('225-176');
  });

  it('parses the ways an admin types a number', () => {
    expect(parseProjectSequenceInput('225-210')).toBe(210);
    expect(parseProjectSequenceInput(' 225 210 ')).toBe(210);
    expect(parseProjectSequenceInput('210')).toBe(210);
    expect(parseProjectSequenceInput('225210')).toBe(210);
    expect(parseProjectSequenceInput('225-1000')).toBe(1000);
  });

  it('rejects things that are not a project number', () => {
    expect(parseProjectSequenceInput('')).toBeNull();
    expect(parseProjectSequenceInput('abc')).toBeNull();
    expect(parseProjectSequenceInput('125-210')).toBeNull();
    expect(parseProjectSequenceInput('225-')).toBeNull();
    expect(parseProjectSequenceInput('2252100000')).toBeNull();
  });

  it('only lets the sequence move forward past the highest number in use', () => {
    expect(validateNextSequence(206, 205)).toBeNull();
    expect(validateNextSequence(300, 205)).toBeNull(); // skipping ahead is allowed
    expect(validateNextSequence(205, 205)).toMatch(/already in use/);
    expect(validateNextSequence(176, 205)).toMatch(/already in use/);
    expect(validateNextSequence(null, 205)).toMatch(/225-206/);
    expect(validateNextSequence(0, 205)).toMatch(/225-001/);
  });
});
