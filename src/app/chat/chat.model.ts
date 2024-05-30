export interface ConversationForm {
  _id: string;
  _rev: string;
  user: string;
  content: string;
  aiProvider: AIProvider;
}

export interface Conversation {
  _id: string;
  _rev: string;
  user: string;
  conversations: Message[];
  title: string;
  createdDate: number;
  updatedDate: number;
}

export interface Message {
  query: string;
  response: string;
}

export type ProviderName = 'openai' | 'perplexity' | 'gemini';

export interface AIProvider {
  name: string;
  model?: string;
}

export interface AIServices {
  openai: boolean;
  perplexity: boolean;
  gemini: boolean;
}
