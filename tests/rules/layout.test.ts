import { describe, it, expect } from 'vitest';
import { nbspOrphan } from '../../src/rules/common/orphan';
import type { RuleContext } from '../../src/core/rule';

const ctx: RuleContext = { locale: 'common', protectedRanges: [] };
const NBSP = '\u00A0';

describe('common/layout/orphan — Anti-orphan NBSP', () => {
  it('glues last 2 words with NBSP', () => {
    const result = nbspOrphan.apply('Это простой тест для проверки', ctx);
    expect(result).toBe(`Это простой тест для${NBSP}проверки`);
  });

  it('skips lines with fewer than 3 words', () => {
    expect(nbspOrphan.apply('Два слова', ctx)).toBe('Два слова');
    expect(nbspOrphan.apply('Одно', ctx)).toBe('Одно');
  });

  it('handles exactly 3 words', () => {
    const result = nbspOrphan.apply('Три коротких слова', ctx);
    expect(result).toBe(`Три коротких${NBSP}слова`);
  });

  it('handles multiline text (each line independently)', () => {
    const input = 'Первая строка с текстом\nВторая строка с длинным текстом';
    const result = nbspOrphan.apply(input, ctx);
    expect(result).toBe(
      `Первая строка с${NBSP}текстом\nВторая строка с длинным${NBSP}текстом`
    );
  });

  it('preserves trailing whitespace', () => {
    const result = nbspOrphan.apply('Текст с пробелами на конце   ', ctx);
    expect(result).toBe(`Текст с пробелами на${NBSP}конце   `);
  });

  it('does not modify already-NBSP text in middle', () => {
    // Existing NBSP between words should be preserved
    const input = `Какой-то${NBSP}текст с пробелами`;
    const result = nbspOrphan.apply(input, ctx);
    // Split on regular spaces, so "Какой-то\u00A0текст" stays as one token
    expect(result).toBe(`Какой-то${NBSP}текст с${NBSP}пробелами`);
  });

  it('handles English text', () => {
    const result = nbspOrphan.apply('This is a simple test', ctx);
    expect(result).toBe(`This is a simple${NBSP}test`);
  });

  it('handles empty string', () => {
    expect(nbspOrphan.apply('', ctx)).toBe('');
  });

  it('has correct metadata', () => {
    expect(nbspOrphan.id).toBe('common/layout/orphan');
    expect(nbspOrphan.group).toBe('layout');
    expect(nbspOrphan.locale).toBe('common');
    expect(nbspOrphan.enabled).toBe(false); // off by default
    expect(nbspOrphan.priority).toBe(900); // runs last
  });
});
