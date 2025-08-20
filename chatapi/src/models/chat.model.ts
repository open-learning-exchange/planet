type ProviderName = 'openai' | 'perplexity' | 'deepseek' | 'gemini';

export interface AIProvider {
  name: ProviderName;
  model?: string;
}

interface Providers {
  openai?: string;
  perplexity?: string;
  deepseek?: string;
  gemini?: string;
}

interface Assistant {
  name: string;
  instructions: string;
}

export interface ModelsDocument {
  models: Providers;
  keys: Providers;
  assistant?: Assistant;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatItem {
  id: string;
  query: string;
  response: string;
}

