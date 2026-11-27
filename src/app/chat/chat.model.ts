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
  shares?: ChatShare[];
  context?: any;
}

export interface ConversationChange {
  title: string;
}

export type ShareAudience = { type: 'community' } | { type: 'team', teamId: string };

export interface ChatShare {
  id: string;
  audience: ShareAudience;
  // None on an up-to-date share
  turns?: number;
  sharedDate: number;
}

export interface SharedChat {
  title: string;
  turns: Pick<Message, 'query' | 'response'>[];
  totalTurns: number;
  live: boolean;
  sharedDate: number;
}

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

export type ProviderDiscovery =
  { state: 'loading' } | { state: 'loaded', providers: AIServiceStatus[] } | { state: 'failed' };
