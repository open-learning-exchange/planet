import { ChatItem, ProviderName } from './chat.model';

export interface DbDoc {
  _id: string;
  _rev: string;
  user: any;
  title: string;
  createdDate: number;
  aiProvider?: ProviderName;
  conversations: ChatItem[];
}

export interface Attachment {
  content_type: string;
  // Optional CouchDB metadata fields are retained for compatibility with callers
  // that may consume full attachment metadata in the future.
  revpos?: number;
  digest?: string;
  length?: number;
  stub?: boolean;
}
