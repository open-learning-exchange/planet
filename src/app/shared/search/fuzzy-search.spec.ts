import { editDistance, fuzzyWordMatch } from './fuzzy-search';

describe('editDistance', () => {
  it('counts insertions, deletions, substitutions and swaps', () => {
    expect(editDistance('corse', 'course')).toBe(1);
    expect(editDistance('coursse', 'course')).toBe(1);
    expect(editDistance('coarse', 'course')).toBe(1);
    expect(editDistance('musci', 'music')).toBe(1);
  });

  it('ignores the rest of a longer value with prefix', () => {
    expect(editDistance('courc', 'course')).toBe(2);
    expect(editDistance('courc', 'course', Number.POSITIVE_INFINITY, true)).toBe(1);
    expect(editDistance('cours', 'coursework', Number.POSITIVE_INFINITY, true)).toBe(0);
  });

  it('returns limit + 1 once past the limit', () => {
    expect(editDistance('abc', 'xyz', 1)).toBe(2);
    expect(editDistance('beekeeping', 'bee', 2)).toBe(3);
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

  it('ignores case and accents', () => {
    expect(fuzzyWordMatch('educacion', 'Educación Básica')).toBe(true);
    expect(fuzzyWordMatch('كتاب', 'كِتَاب')).toBe(true);
  });

  it('forgives a typo in one of the words', () => {
    expect(fuzzyWordMatch('musci', 'Introduction to Music')).toBe(true);
    expect(fuzzyWordMatch('introducton musci', 'Introduction to Music')).toBe(true);
  });

  it('matches a word still being typed, typo and all', () => {
    expect(fuzzyWordMatch('courc', 'Course basics')).toBe(true);
    expect(fuzzyWordMatch('educasi', 'Educación Básica')).toBe(true);
  });

  it('does not match unrelated words of a similar length', () => {
    expect(fuzzyWordMatch('javascript', 'typescript')).toBe(false);
    expect(fuzzyWordMatch('course', 'Horse Care')).toBe(false);
  });

  it('keeps words under four letters exact', () => {
    expect(fuzzyWordMatch('te', 'the')).toBe(false);
    expect(fuzzyWordMatch('to', 'Introduction to Music')).toBe(true);
    expect(fuzzyWordMatch('land', 'Sun and Moon')).toBe(false);
  });

  it('forgives a typo in a four letter word against whole words only', () => {
    expect(fuzzyWordMatch('teem', 'Team building')).toBe(true);
    expect(fuzzyWordMatch('open', 'Odenbrecht prize')).toBe(false);
  });

  it('matches a word of a file name, typo and all', () => {
    expect(fuzzyWordMatch('phoot', 'my_photo.png')).toBe(true);
  });

  it('matches words with vowel signs whole', () => {
    expect(fuzzyWordMatch('नपाली', 'नेपाली भाषा')).toBe(true);
    expect(fuzzyWordMatch('नेपाल', 'लेखन पुस्तक')).toBe(false);
  });

  it('matches words with digits exactly', () => {
    expect(fuzzyWordMatch('2024', 'Community Survey 2024')).toBe(true);
    expect(fuzzyWordMatch('2024', 'Community Survey 2023')).toBe(false);
    expect(fuzzyWordMatch('bio101', 'BIO102')).toBe(false);
  });

  it('matches words with symbols only as typed', () => {
    expect(fuzzyWordMatch('C#', 'C# Basics')).toBe(true);
    expect(fuzzyWordMatch('C#', 'Cooking Basics')).toBe(false);
    expect(fuzzyWordMatch('#', 'Cooking Basics')).toBe(false);
  });

  it('matches everything for a blank search', () => {
    expect(fuzzyWordMatch('  ', 'Introduction to Music')).toBe(true);
  });
});
