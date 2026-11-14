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

export type ConversationChange = { title: string } | { shared: true };

export interface Message {
  id: string;
  query: string;
  response: string;
}

export type ProviderName = string;

export interface AIProvider {
  name: ProviderName;
  label?: string;
}

export interface AIServiceStatus {
  name: ProviderName;
  label: string;
  configured: boolean;
}
