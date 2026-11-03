export type ProviderName = 'openai' | 'perplexity' | 'deepseek' | 'gemini';

export interface AIProvider {
  name: ProviderName;
  model?: string;
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

export interface Citation {
  title?: string;
  fileId: string;
}

/** Request handed to a provider adapter. */
export interface ProviderChatRequest {
  model: string;
  messages: ChatMessage[];
  instructions?: string;
  onDelta?: (delta: string) => void;
  vectorStoreIds?: string[];
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
  signal?: AbortSignal;
}

export interface ProviderChatResult {
  text: string;
  citations: Citation[];
}

