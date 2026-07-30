import {
  createGenderCounts,
  getGenderIcon,
  getGenderLabel,
  normalizeGender,
  reportGenderOptions
} from './gender.constants';

describe('gender constants', () => {

  describe('normalizeGender', () => {

    it.each([
      [ 'male', 'male' ],
      [ 'female', 'female' ],
      [ 'other', 'other' ],
      [ ' Male ', 'male' ],
      [ 'FEMALE', 'female' ]
    ])('normalizes %s to %s', (gender, expected) => {
      expect(normalizeGender(gender)).toBe(expected);
    });

    it.each([ undefined, null, '', '   ', 'unknown' ])('maps %s to didNotSpecify', (gender) => {
      expect(normalizeGender(gender)).toBe('didNotSpecify');
    });

  });

  describe('getGenderIcon', () => {

    it('returns the normalized icon name for supported genders', () => {
      expect(getGenderIcon(' Other ')).toBe('other');
    });

    it('returns null when gender is omitted or unsupported', () => {
      expect(getGenderIcon()).toBeNull();
      expect(getGenderIcon('unknown')).toBeNull();
    });

  });

  describe('getGenderLabel', () => {

    it('returns localized labels for supported and unspecified values', () => {
      expect(getGenderLabel('female')).toBe('Female');
      expect(getGenderLabel('unknown')).toBe('Did not specify');
    });

    it('uses the provided fallback when gender is omitted or blank', () => {
      expect(getGenderLabel(undefined, { fallback: 'Not available' })).toBe('Not available');
      expect(getGenderLabel('   ', { fallback: 'Not available' })).toBe('Not available');
    });

    it('uses the localized default fallback when gender is omitted', () => {
      expect(getGenderLabel()).toBe('N/A');
    });

  });

  it('creates zeroed counts for every report gender option', () => {
    expect(createGenderCounts()).toEqual(
      Object.fromEntries(reportGenderOptions.map(({ value }) => [ value, 0 ]))
    );
  });

});
