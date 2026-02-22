import { describe, it, expect } from 'vitest';
import { detectLocale } from '../src/core/detector';

describe('Language detection', () => {
  it('detects Russian text', () => {
    expect(detectLocale('Привет, как дела?')).toBe('ru');
  });

  it('detects English text', () => {
    expect(detectLocale('Hello, how are you?')).toBe('en');
  });

  it('detects French text by diacritics', () => {
    expect(detectLocale('Bonjour, comment ça va ? Très bien, merci !')).toBe('fr');
  });

  it('detects Chinese text', () => {
    expect(detectLocale('你好世界，这是一个测试')).toBe('zh');
  });

  it('detects Japanese text with hiragana', () => {
    expect(detectLocale('こんにちは世界、テストです')).toBe('ja');
  });

  it('detects Japanese with kanji + hiragana', () => {
    expect(detectLocale('東京は大きな都市です')).toBe('ja');
  });

  it('defaults to English for empty text', () => {
    expect(detectLocale('')).toBe('en');
  });

  it('defaults to English for numbers only', () => {
    expect(detectLocale('12345')).toBe('en');
  });

  it('detects mixed Russian-English as Russian if Cyrillic dominates', () => {
    expect(detectLocale('Привет world, как дела today?')).toBe('ru');
  });

  it('detects pure Latin as English', () => {
    expect(detectLocale('The quick brown fox jumps over the lazy dog')).toBe('en');
  });
});
