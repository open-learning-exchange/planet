import {MaybeDocument} from 'nano';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatItem {
  query: string;
  response: string;
}

export interface ChatDocumentModel extends MaybeDocument {
  conversations: ChatItem[];
}
