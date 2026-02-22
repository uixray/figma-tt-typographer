import { describe, it, expect } from 'vitest';

describe('ZH: CJK-Latin spacing', () => {
  const CJK_RANGE = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff';
  const CJK_REGEX = `[${CJK_RANGE}]`;

  function addCjkLatinSpacing(text: string): string {
    let result = text;
    result = result.replace(new RegExp(`(${CJK_REGEX})([a-zA-Z0-9])`, 'g'), '$1 $2');
    result = result.replace(new RegExp(`([a-zA-Z0-9])(${CJK_REGEX})`, 'g'), '$1 $2');
    return result;
  }

  it('adds space between Chinese and Latin', () => {
    expect(addCjkLatinSpacing('你好world')).toBe('你好 world');
  });

  it('adds space between Latin and Chinese', () => {
    expect(addCjkLatinSpacing('hello你好')).toBe('hello 你好');
  });

  it('adds space between Chinese and digits', () => {
    expect(addCjkLatinSpacing('共5个')).toBe('共 5 个');
  });

  it('preserves existing spaces', () => {
    expect(addCjkLatinSpacing('你好 world')).toBe('你好 world');
  });
});

describe('ZH: Fullwidth punctuation', () => {
  it('converts comma after CJK to fullwidth', () => {
    const CJK = '[\\u4e00-\\u9fff]';
    const result = '你好,世界'.replace(new RegExp(`(${CJK}),`, 'g'), '$1，');
    expect(result).toBe('你好，世界');
  });

  it('converts period after CJK to fullwidth', () => {
    const CJK = '[\\u4e00-\\u9fff]';
    const result = '你好.'.replace(new RegExp(`(${CJK})\\.(?!\\d)`, 'g'), '$1。');
    expect(result).toBe('你好。');
  });

  it('does not convert period before digit', () => {
    const CJK = '[\\u4e00-\\u9fff]';
    const text = '共.5'; // should not be converted since . is before digit
    // This is an edge case — period after CJK but before digit
    const result = text.replace(new RegExp(`(${CJK})\\.(?!\\d)`, 'g'), '$1。');
    expect(result).toBe('共.5'); // preserved because of negative lookahead
  });
});

describe('ZH: Width normalization', () => {
  it('converts fullwidth digits to halfwidth', () => {
    const result = '\uff11\uff12\uff13'.replace(/[\uff10-\uff19]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
    expect(result).toBe('123');
  });

  it('converts fullwidth Latin to halfwidth', () => {
    const result = '\uff21\uff22\uff23'.replace(/[\uff21-\uff3a\uff41-\uff5a]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
    expect(result).toBe('ABC');
  });
});
