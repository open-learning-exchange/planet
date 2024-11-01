export function diacriticInsensitiveMatch(value: string, filter: string): boolean {
    const normalizedValue = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normalizedFilter = filter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalizedValue.includes(normalizedFilter);
  }
