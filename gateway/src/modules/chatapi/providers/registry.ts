interface ProviderDefinition {
  label: string;
  api: 'responses' | 'chat-completions';
  baseURL?: string;
}

const providerRegistry = {
  'openai': { 'label': 'OpenAI', 'api': 'responses' },
  'perplexity': { 'label': 'Perplexity', 'api': 'chat-completions', 'baseURL': 'https://api.perplexity.ai' },
  'deepseek': { 'label': 'DeepSeek', 'api': 'chat-completions', 'baseURL': 'https://api.deepseek.com' },
  'gemini': { 'label': 'Gemini', 'api': 'chat-completions', 'baseURL': 'https://generativelanguage.googleapis.com/v1beta/openai/' }
} as const;

export type ProviderName = keyof typeof providerRegistry;
export const PROVIDER_REGISTRY: Record<ProviderName, ProviderDefinition> = providerRegistry;
export const PROVIDER_NAMES = Object.keys(PROVIDER_REGISTRY) as ProviderName[];
