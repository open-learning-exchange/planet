export const DEFAULT_AI_PROVIDERS = ['openai', 'perplexity', 'deepseek', 'gemini'] as const;
export type AIProvider = typeof DEFAULT_AI_PROVIDERS[number];

export function createEmptyProviderMap<T>(defaultValue: T) {
  return DEFAULT_AI_PROVIDERS.reduce((acc, provider) => {
    acc[provider] = defaultValue;
    return acc;
  }, {} as Record<AIProvider, T>);
}
