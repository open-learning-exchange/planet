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

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

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
   * Calculate similarity score between two strings (0-1, higher = more similar)
   */
  private similarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Check if search term fuzzy matches target string
   */
  fuzzyMatch(searchTerm: string, target: string, options?: FuzzySearchOptions): boolean {
    const opts = { ...this.defaultOptions, ...options };
    
    if (!opts.caseSensitive) {
      searchTerm = searchTerm.toLowerCase();
      target = target.toLowerCase();
    }

    // Normalize strings (remove accents)
    searchTerm = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    target = target.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Direct substring match (fastest)
    if (target.includes(searchTerm)) {
      return true;
    }

    // Check if edit distance is within acceptable range
    const distance = this.levenshteinDistance(searchTerm, target);
    if (distance <= opts.maxDistance) {
      return true;
    }

    // Check similarity threshold for longer strings
    const similarity = this.similarity(searchTerm, target);
    return similarity >= opts.threshold;
  }

  /**
   * Check if any word in search matches any word in target with fuzzy logic
   */
  fuzzyWordMatch(searchTerms: string, target: string, options?: FuzzySearchOptions): boolean {
    const searchWords = searchTerms.split(' ').map(word => word.trim()).filter(word => word.length > 0);
    const targetWords = target.split(' ').map(word => word.trim()).filter(word => word.length > 0);

    return searchWords.every(searchWord => {
      // For very short search words, require exact match
      if (searchWord.length <= 2) {
        return targetWords.some(targetWord => 
          !options?.caseSensitive ? 
            targetWord.toLowerCase().includes(searchWord.toLowerCase()) :
            targetWord.includes(searchWord)
        );
      }

      // For longer words, use fuzzy matching
      return targetWords.some(targetWord => this.fuzzyMatch(searchWord, targetWord, options)) ||
             this.fuzzyMatch(searchWord, target, options); // Also check against full target
    });
  }
}
