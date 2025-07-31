import { Injectable } from '@angular/core';

export interface FuzzySearchOptions {
  threshold?: number; // 0-1, lower = more strict
  maxDistance?: number; // Maximum edit distance
  caseSensitive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FuzzySearchService {

  private defaultOptions: FuzzySearchOptions = {
    threshold: 0.6,
    maxDistance: 3,
    caseSensitive: false
  };

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) { matrix[0][i] = i; }
    for (let j = 0; j <= str2.length; j++) { matrix[j][0] = j; }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if search term fuzzy matches target string
   */
  fuzzyMatch(searchTerm: string, target: string, options?: FuzzySearchOptions): boolean {
    const opts = { ...this.defaultOptions, ...options };

    // Normalize strings
    const normalizeStr = (str: string) => opts.caseSensitive ? str : str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedSearch = normalizeStr(searchTerm);
    const normalizedTarget = normalizeStr(target);

    // Direct substring match (fastest) or check distance/similarity
    return normalizedTarget.includes(normalizedSearch) ||
           this.levenshteinDistance(normalizedSearch, normalizedTarget) <= opts.maxDistance ||
           (target.length > 0 ? (target.length - this.levenshteinDistance(normalizedSearch, normalizedTarget))
            / target.length : 1) >= opts.threshold;
  }

  /**
   * Check if any word in search matches any word in target with fuzzy logic
   */
  fuzzyWordMatch(searchTerms: string, target: string, options?: FuzzySearchOptions): boolean {
    const searchWords = searchTerms.split(' ').filter(word => word.trim());
    const targetWords = target.split(' ').filter(word => word.trim());

    return searchWords.every(searchWord => {
      // For very short search words, require exact substring match
      if (searchWord.length <= 2) {
        const searchLower = options?.caseSensitive ? searchWord : searchWord.toLowerCase();
        return targetWords.some(targetWord =>
          (options?.caseSensitive ? targetWord : targetWord.toLowerCase()).includes(searchLower)
        );
      }

      // For longer words, use fuzzy matching against words or full target
      return targetWords.some(targetWord => this.fuzzyMatch(searchWord, targetWord, options)) ||
             this.fuzzyMatch(searchWord, target, options);
    });
  }
}
