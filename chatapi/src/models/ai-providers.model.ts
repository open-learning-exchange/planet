type ProviderName = 'openai' | 'perplexity' | 'gemini';

export interface AIProvider {
  name: ProviderName;
  model?: string;
}

interface ModelsConfig {
  openai?: string;
  perplexity?: string;
  gemini?: string;
}

export interface ModelConfigDocument {
  modelsConfig: ModelsConfig;
}
