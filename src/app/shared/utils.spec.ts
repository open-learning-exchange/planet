import { normalizeDiacritics } from './utils';

describe('normalizeDiacritics', () => {
  it('should remove accents', () => {
    expect(normalizeDiacritics('Crème Brûlée')).toBe('Creme Brulee');
  });

  it('should handle empty string', () => {
    expect(normalizeDiacritics('')).toBe('');
  });

  it('should handle strings without accents', () => {
    expect(normalizeDiacritics('Hello World')).toBe('Hello World');
  });

  it('should handle other diacritics', () => {
    expect(normalizeDiacritics('Ångström')).toBe('Angstrom');
    expect(normalizeDiacritics('ñ')).toBe('n');
  });
});
