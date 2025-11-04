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

export type AssistantResponseFormat = string | {
  type: string;
  [key: string]: any;
};

export interface AssistantToolConfig {
  type: string;
  [key: string]: any;
}

interface Assistant {
  name: string;
  instructions: string;
  response_format?: AssistantResponseFormat;
  parallel_tool_calls?: boolean;
  tools?: AssistantToolConfig[];
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

