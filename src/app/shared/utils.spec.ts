import { stringToHex, hexToString } from './utils';

describe('shared utils', () => {
  describe('stringToHex / hexToString', () => {
    it('should round-trip encoded text back to the original string', () => {
      const value = 'org.couchdb.user:alice@planet';
      const encoded = stringToHex(value);

      expect(hexToString(encoded)).toBe(value);
    });

    it('should return an empty string for malformed hex input', () => {
      expect(hexToString('abc')).toBe('');
      expect(hexToString('zz')).toBe('');
    });
  });
});
