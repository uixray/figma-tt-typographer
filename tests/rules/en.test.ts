import { describe, it, expect } from 'vitest';

describe('EN: Curly quotes', () => {
  function applyCurlyQuotes(text: string): string {
    let result = text;
    result = result.replace(/[\u201c\u201d]/g, '"');
    result = result.replace(/(^|[\s(\[{])"(?=\S)/gm, '$1\u201c');
    result = result.replace(/"(?=[\s)\]},;:!?.]|$)/gm, '\u201d');
    result = result.replace(/(^|[\s(\[{])"/gm, '$1\u201c');
    result = result.replace(/"/g, '\u201d');
    result = result.replace(/(\w)'(\w)/g, '$1\u2019$2');
    return result;
  }

  it('converts straight double quotes to curly', () => {
    expect(applyCurlyQuotes('He said "hello"')).toBe('He said \u201chello\u201d');
  });

  it('converts apostrophes in contractions', () => {
    expect(applyCurlyQuotes("don't")).toBe('don\u2019t');
  });

  it('handles quotes at start of text', () => {
    expect(applyCurlyQuotes('"Hello" he said')).toBe('\u201cHello\u201d he said');
  });
});

describe('EN: Dashes', () => {
  it('converts -- to em-dash', () => {
    expect('hello -- world'.replace(/---?/g, '\u2014')).toBe('hello \u2014 world');
  });

  it('converts --- to em-dash', () => {
    expect('hello --- world'.replace(/---?/g, '\u2014')).toBe('hello \u2014 world');
  });

  it('converts number ranges to en-dash', () => {
    expect('pages 1-5'.replace(/(\d+)\s*-\s*(\d+)/g, '$1\u2013$2')).toBe('pages 1\u20135');
  });
});

describe('EN: Percentage', () => {
  it('removes space before %', () => {
    expect('10 %'.replace(/(\d)\s+%/g, '$1%')).toBe('10%');
  });

  it('preserves 10%', () => {
    expect('10%'.replace(/(\d)\s+%/g, '$1%')).toBe('10%');
  });
});

describe('EN: Short words', () => {
  const NBSP = '\u00A0';

  it('adds non-breaking space after article "the"', () => {
    const words = 'a|an|the';
    const regex = new RegExp(`(^|\\s)(${words})\\s`, 'gi');
    const result = 'the book'.replace(regex, `$1$2${NBSP}`);
    expect(result).toBe(`the${NBSP}book`);
  });
});
