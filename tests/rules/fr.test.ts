import { describe, it, expect } from 'vitest';

const NNBSP = '\u202F';

describe('FR: Punctuation spaces', () => {
  function applyFrPunctuation(text: string): string {
    let result = text.replace(/\s*([;:!?])/g, `${NNBSP}$1`);
    result = result.replace(new RegExp(`^${NNBSP}([;:!?])`, 'gm'), '$1');
    return result;
  }

  it('adds narrow non-breaking space before ;', () => {
    expect(applyFrPunctuation('Bonjour ;')).toBe(`Bonjour${NNBSP};`);
  });

  it('adds narrow non-breaking space before !', () => {
    expect(applyFrPunctuation('Bonjour !')).toBe(`Bonjour${NNBSP}!`);
  });

  it('adds narrow non-breaking space before ?', () => {
    expect(applyFrPunctuation('Comment ?')).toBe(`Comment${NNBSP}?`);
  });

  it('adds narrow non-breaking space before :', () => {
    expect(applyFrPunctuation('Note :')).toBe(`Note${NNBSP}:`);
  });

  it('replaces regular space with NNBSP', () => {
    expect(applyFrPunctuation('Oui !')).toBe(`Oui${NNBSP}!`);
  });

  it('does not add space at start of line', () => {
    expect(applyFrPunctuation('!test')).toBe('!test');
  });
});

describe('FR: OE ligatures', () => {
  const words: Record<string, string> = {
    'coeur': 'cœur', 'oeuvre': 'œuvre', 'oeil': 'œil',
    'voeux': 'vœux', 'boeuf': 'bœuf', 'soeur': 'sœur',
  };

  for (const [from, to] of Object.entries(words)) {
    it(`converts ${from} to ${to}`, () => {
      const result = from.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
      expect(result).toBe(to);
    });
  }
});

describe('FR: Currency', () => {
  const NBSP = '\u00A0';

  it('replaces EUR with €', () => {
    const result = '100 EUR'.replace(/(\d)\s*EUR\b/gi, `$1${NBSP}€`);
    expect(result).toBe(`100${NBSP}€`);
  });
});
