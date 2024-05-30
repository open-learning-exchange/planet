export type ProviderName = 'openai' | 'perplexity' | 'gemini';

export interface AIProvider {
  name: ProviderName;
  model?: string;
}
