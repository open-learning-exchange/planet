interface ProviderDefinition {
  label: string;
  baseURL?: string;
}

const providerRegistry = {
  'openai': { 'label': 'OpenAI' },
  'perplexity': { 'label': 'Perplexity', 'baseURL': 'https://api.perplexity.ai' },
  'deepseek': { 'label': 'DeepSeek', 'baseURL': 'https://api.deepseek.com' },
  'gemini': { 'label': 'Gemini', 'baseURL': 'https://generativelanguage.googleapis.com/v1beta/openai/' }
} as const;

export type ProviderName = keyof typeof providerRegistry;
export const PROVIDER_REGISTRY: Record<ProviderName, ProviderDefinition> = providerRegistry;
export const PROVIDER_NAMES = Object.keys(PROVIDER_REGISTRY) as ProviderName[];
