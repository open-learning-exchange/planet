import { localizedGender } from './reports.utils';

describe('reports utils', () => {

  describe('localizedGender', () => {

    it('translates the genders profiles offer', () => {
      expect(localizedGender('male')).toBe('Male');
      expect(localizedGender('female')).toBe('Female');
    });

    it('capitalizes anything else a profile stores', () => {
      expect(localizedGender('nonbinary')).toBe('Nonbinary');
    });

    it('falls back when there is no gender', () => {
      expect(localizedGender(undefined)).toBe('');
      expect(localizedGender('')).toBe('');
      expect(localizedGender(undefined, 'N/A')).toBe('N/A');
    });

    it('falls back for values synced in as something other than a string', () => {
      expect(localizedGender(1)).toBe('');
      expect(localizedGender({}, 'N/A')).toBe('N/A');
    });

  });

});
