type ProviderName = 'openai' | 'perplexity' | 'gemini';

export interface AIProvider {
  name: ProviderName;
  model?: string;
}

interface Assistant {
  name: string;
  instructions: string;
}

interface Providers {
  openai?: string;
  perplexity?: string;
  deepseek?: string;
  gemini?: string;
}

export interface ModelsDocument {
  models: Providers;
  keys: Providers;
  assistant?: Assistant;
}
