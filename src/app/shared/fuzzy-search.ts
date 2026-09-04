export interface FuzzySearchOptions {
  // Minimum similarity, from 0 to 1, for two strings to match.  Higher is stricter.
  threshold?: number;
  // Upper bound on the edit distance between two strings.  A term also gets no more than one edit per three
  // characters, so a typo in a long word is forgiven without turning short words into wildcards.
  maxDistance?: number;
  caseSensitive?: boolean;
  // Search terms shorter than this only match as substrings, since one edit rewrites most of a short word.
  minFuzzyLength?: number;
}

type ResolvedOptions = Required<FuzzySearchOptions>;

const defaultOptions: ResolvedOptions = {
  threshold: 0.75,
  maxDistance: 3,
  caseSensitive: false,
  minFuzzyLength: 4
};

const charactersPerEdit = 3;

const combiningMarks = /[\u0300-\u036f]/g;
// Anything that is neither a letter nor a number separates words, so "my_photo.png" searches as three words.
const wordSeparators = /[^\p{L}\p{N}]+/u;

// Strips diacritics so "café" and "cafe" are interchangeable, and lower cases unless told otherwise.
export const normalizeSearchString = (value: string, caseSensitive = false): string => {
  const normalized = value.normalize('NFD').replace(combiningMarks, '');
  return caseSensitive ? normalized : normalized.toLowerCase();
};

export const splitSearchWords = (value: string, caseSensitive = false): string[] => (
  normalizeSearchString(value, caseSensitive).split(wordSeparators).filter(word => word !== '')
);

// Damerau-Levenshtein distance, counting a swap of two neighbouring characters as one edit since that is
// one of the most common typos.  Uses three rolling rows instead of a full matrix, and gives up early once
// every candidate in a row is past the limit, returning limit + 1 rather than the true distance.
export const editDistance = (first: string, second: string, limit: number = Number.POSITIVE_INFINITY): number => {
  if (first === second) {
    return 0;
  }
  if (first.length === 0 || second.length === 0) {
    return Math.max(first.length, second.length);
  }
  if (Math.abs(first.length - second.length) > limit) {
    return limit + 1;
  }
  let twoRowsBack = new Array<number>(second.length + 1);
  let previousRow = Array.from({ length: second.length + 1 }, (_value, index) => index);
  let currentRow = new Array<number>(second.length + 1);
  for (let row = 1; row <= first.length; row++) {
    currentRow[0] = row;
    let rowMinimum = row;
    for (let column = 1; column <= second.length; column++) {
      const substitution = previousRow[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1);
      let distance = Math.min(currentRow[column - 1] + 1, previousRow[column] + 1, substitution);
      if (row > 1 && column > 1 &&
          first[row - 1] === second[column - 2] && first[row - 2] === second[column - 1]) {
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
  return previousRow[second.length];
};

// Both strings must already be normalized.  A match is a substring hit, or an edit distance within the
// allowance, or a similarity ratio at or above the threshold, whichever is most generous.
const matchNormalized = (search: string, value: string, opts: ResolvedOptions): boolean => {
  if (search === '') {
    return true;
  }
  if (value === '') {
    return false;
  }
  if (value.includes(search)) {
    return true;
  }
  if (search.length < opts.minFuzzyLength) {
    return false;
  }
  const longest = Math.max(search.length, value.length);
  // Similarity is 1 - distance / longest, so the threshold is unreachable for a search term that is
  // much shorter than the value it is compared against.
  const similarityAllowance = search.length >= opts.threshold * longest ? Math.floor((1 - opts.threshold) * longest) : 0;
  const distanceAllowance = Math.min(opts.maxDistance, Math.floor(search.length / charactersPerEdit));
  const allowance = Math.max(distanceAllowance, similarityAllowance);
  if (allowance < 1) {
    return false;
  }
  return editDistance(search, value, allowance) <= allowance;
};

// True when the search term matches the target as a substring or within the configured fuzziness.
export const fuzzyMatch = (searchTerm: string, target: string, options?: FuzzySearchOptions): boolean => {
  const opts = { ...defaultOptions, ...options };
  return matchNormalized(
    normalizeSearchString(searchTerm, opts.caseSensitive), normalizeSearchString(target, opts.caseSensitive), opts
  );
};

// True when every word of the search matches the target, either against one of its words or against the
// whole of it, so word order and extra words in the target do not matter.
export const fuzzyWordMatch = (searchTerms: string, target: string, options?: FuzzySearchOptions): boolean => {
  const opts = { ...defaultOptions, ...options };
  const searchWords = splitSearchWords(searchTerms, opts.caseSensitive);
  if (searchWords.length === 0) {
    return true;
  }
  const value = normalizeSearchString(target, opts.caseSensitive);
  if (value === '') {
    return false;
  }
  const valueWords = value.split(wordSeparators).filter(word => word !== '');
  return searchWords.every(searchWord => (
    value.includes(searchWord) ||
    valueWords.some(valueWord => matchNormalized(searchWord, valueWord, opts)) ||
    (valueWords.length > 1 && matchNormalized(searchWord, value, opts))
  ));
};
