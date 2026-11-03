export interface ConversationForm {
  _id: string;
  _rev: string;
  user: string;
  content: string;
  aiProvider: AIProvider;
  context: string;
}

export interface Conversation {
  _id: string;
  _rev: string;
  user: string;
  conversations: Message[];
  title: string;
  createdDate: number;
  updatedDate: number;
  aiProvider?: ProviderName;
  shared?: boolean;
  context?: any;
}

export interface Message {
  id: string;
  query: string;
  response: string;
}

export type ProviderName = 'openai' | 'perplexity' | 'deepseek' | 'gemini';

export interface AIProvider {
  name: ProviderName;
  model?: string;
}

export interface AIServices {
  openai: boolean;
  perplexity: boolean;
  deepseek: boolean;
  gemini: boolean;
}
