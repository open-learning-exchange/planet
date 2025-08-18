import { AIProvider as ProviderName } from '../../../src/shared/ai-providers';

export interface AIProvider {
  name: ProviderName;
  model?: string;
}

type Providers = Partial<Record<ProviderName, string>>;

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

