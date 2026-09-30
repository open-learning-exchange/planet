const maxDistance = 3;
const charactersPerEdit = 4;
const minFuzzyLength = 4;
const minPrefixLength = 5;

// Latin diacritics and Arabic vowel marks
const ignoredMarks = /[\u0300-\u036f\u064b-\u065f\u0670]/g;
// Marks stay inside words, or vowel signs would split words like "नेपाल".
const wordSeparators = /[^\p{L}\p{M}\p{N}]+/u;
const digit = /\p{N}/u;

export const normalizeSearchString = (value: string): string => (
  value.normalize('NFD').replace(ignoredMarks, '').toLowerCase()
);

// Whitespace only, so a word typed with symbols, like "C#", stays whole.
export const splitSearchWords = (value: string): string[] => (
  normalizeSearchString(value).split(/\s+/).filter(word => word !== '')
);

// Counts a swap of neighbouring characters as one edit.  With prefix, measures against the closest start of the
// value at least as long as the search, so a word still being typed matches.  Returns limit + 1 once every
// candidate is past the limit.
export const editDistance = (search: string, value: string, limit: number = Number.POSITIVE_INFINITY, prefix = false): number => {
  if (prefix ? value.startsWith(search) : search === value) {
    return 0;
  }
  if (search.length - value.length > limit || (!prefix && value.length - search.length > limit)) {
    return limit + 1;
  }
  let twoRowsBack = new Array<number>(value.length + 1);
  let previousRow = Array.from({ length: value.length + 1 }, (_value, index) => index);
  let currentRow = new Array<number>(value.length + 1);
  for (let row = 1; row <= search.length; row++) {
    currentRow[0] = row;
    let rowMinimum = row;
    for (let column = 1; column <= value.length; column++) {
      const substitution = previousRow[column - 1] + (search[row - 1] === value[column - 1] ? 0 : 1);
      let distance = Math.min(currentRow[column - 1] + 1, previousRow[column] + 1, substitution);
      if (row > 1 && column > 1 &&
          search[row - 1] === value[column - 2] && search[row - 2] === value[column - 1]) {
        distance = Math.min(distance, twoRowsBack[column - 2] + 1);
      }
      currentRow[column] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }
    if (rowMinimum > limit) {
      return limit + 1;
    }
    const spareRow = twoRowsBack;
    twoRowsBack = previousRow;
    previousRow = currentRow;
    currentRow = spareRow;
  }
  return prefix ? Math.min(...previousRow.slice(Math.min(search.length, value.length))) : previousRow[value.length];
};

// Both strings must already be normalized.  Short words and words with digits only match as substrings,
// since one edit makes "and" of "land" and 2023 of 2024.  Four letter words only match whole words, since
// the start of a longer word is too easy to hit.
const matchNormalized = (search: string, value: string): boolean => {
  if (value.includes(search)) {
    return true;
  }
  if (search.length < minFuzzyLength || value.length < minFuzzyLength || digit.test(search)) {
    return false;
  }
  const allowance = Math.min(maxDistance, Math.floor(search.length / charactersPerEdit));
  return editDistance(search, value, allowance, search.length >= minPrefixLength) <= allowance;
};

export const fuzzyWordMatch = (searchTerms: string, target: string): boolean => {
  const searchWords = splitSearchWords(searchTerms);
  if (searchWords.length === 0) {
    return true;
  }
  const value = normalizeSearchString(target);
  if (value === '') {
    return false;
  }
  const valueWords = value.split(wordSeparators).filter(word => word !== '');
  return searchWords.every(searchWord => value.includes(searchWord) || (
    !wordSeparators.test(searchWord) && (
      valueWords.some(valueWord => matchNormalized(searchWord, valueWord)) ||
      (valueWords.length > 1 && matchNormalized(searchWord, value))
    )
  ));
};
