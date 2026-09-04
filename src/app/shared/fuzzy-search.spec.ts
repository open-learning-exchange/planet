import { editDistance, fuzzyMatch, fuzzyWordMatch, normalizeSearchString, splitSearchWords } from './fuzzy-search';

describe('normalizeSearchString', () => {
  it('lower cases and strips diacritics', () => {
    expect(normalizeSearchString('Café Ñandú')).toBe('cafe nandu');
  });

  it('keeps case when asked to', () => {
    expect(normalizeSearchString('Café', true)).toBe('Cafe');
  });
});

describe('splitSearchWords', () => {
  it('splits on any run of whitespace and drops empty words', () => {
    expect(splitSearchWords('  Intro   to \t Music ')).toEqual([ 'intro', 'to', 'music' ]);
  });

  it('splits on punctuation as well', () => {
    expect(splitSearchWords('my_photo.png')).toEqual([ 'my', 'photo', 'png' ]);
    expect(splitSearchWords('e-learning (2024)')).toEqual([ 'e', 'learning', '2024' ]);
  });

  it('returns no words for a blank search', () => {
    expect(splitSearchWords('   ')).toEqual([]);
  });
});

describe('editDistance', () => {
  it('counts insertions, deletions, substitutions and swaps', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('musci', 'music')).toBe(1);
    expect(editDistance('course', 'course')).toBe(0);
    expect(editDistance('', 'course')).toBe(6);
    expect(editDistance('course', '')).toBe(6);
  });

  it('gives up once past the limit instead of finishing the matrix', () => {
    expect(editDistance('abc', 'xyz', 1)).toBe(2);
    expect(editDistance('bee', 'beekeeping', 2)).toBe(3);
  });

  it('still returns the true distance within the limit', () => {
    expect(editDistance('beekeping', 'beekeeping', 3)).toBe(1);
  });
});

describe('fuzzyMatch', () => {
  it('matches substrings regardless of case and diacritics', () => {
    expect(fuzzyMatch('bee', 'Beekeeping')).toBe(true);
    expect(fuzzyMatch('nandu', 'Ñandú farming')).toBe(true);
  });

  it('forgives a typo in a long word', () => {
    expect(fuzzyMatch('beekeping', 'beekeeping')).toBe(true);
    expect(fuzzyMatch('agriculutre', 'agriculture')).toBe(true);
  });

  it('does not fuzzy match terms shorter than the minimum length', () => {
    expect(fuzzyMatch('the', 'she')).toBe(false);
    expect(fuzzyMatch('cat', 'cot')).toBe(false);
  });

  it('does not match unrelated words of a similar length', () => {
    expect(fuzzyMatch('javascript', 'typescript')).toBe(false);
    expect(fuzzyMatch('biology', 'geometry')).toBe(false);
  });

  it('never matches an empty target', () => {
    expect(fuzzyMatch('course', '')).toBe(false);
  });

  it('matches everything for an empty search term', () => {
    expect(fuzzyMatch('', 'Beekeeping')).toBe(true);
  });

  it('honours the options passed in', () => {
    expect(fuzzyMatch('cot', 'cat', { minFuzzyLength: 3 })).toBe(true);
    expect(fuzzyMatch('beekeping', 'beekeeping', { maxDistance: 0, threshold: 1 })).toBe(false);
    expect(fuzzyMatch('BEE', 'beekeeping', { caseSensitive: true })).toBe(false);
  });
});

describe('fuzzyWordMatch', () => {
  it('matches every search word against any word of the target, in any order', () => {
    expect(fuzzyWordMatch('intro music', 'Introduction to Music')).toBe(true);
    expect(fuzzyWordMatch('music intro', 'Introduction to Music')).toBe(true);
  });

  it('requires all search words to match', () => {
    expect(fuzzyWordMatch('intro biology', 'Introduction to Music')).toBe(false);
  });

  it('forgives a typo in one of the words', () => {
    expect(fuzzyWordMatch('musci', 'Introduction to Music')).toBe(true);
    expect(fuzzyWordMatch('introducton musci', 'Introduction to Music')).toBe(true);
  });

  it('matches a multi word phrase', () => {
    expect(fuzzyWordMatch('introduction to', 'Introduction to Music')).toBe(true);
  });

  it('keeps short words exact', () => {
    expect(fuzzyWordMatch('te', 'the')).toBe(false);
    expect(fuzzyWordMatch('to', 'Introduction to Music')).toBe(true);
  });

  it('matches a word of a file name or code, typo and all', () => {
    expect(fuzzyWordMatch('phoot', 'my_photo.png')).toBe(true);
    expect(fuzzyWordMatch('nation', 'earth-nation')).toBe(true);
  });

  it('never matches an empty target', () => {
    expect(fuzzyWordMatch('music', '')).toBe(false);
  });

  it('matches everything for a blank search', () => {
    expect(fuzzyWordMatch('  ', 'Introduction to Music')).toBe(true);
  });
});
