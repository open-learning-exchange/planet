import { ProviderName } from '../providers/registry';
import { ChatItem } from './chat.model';

export type ShareAudience = { type: 'community' } | { type: 'team'; teamId: string };

export interface ChatShare {
  id: string;
  audience: ShareAudience;
  turns?: number;
  sharedDate: number;
}

export interface DbDoc {
  _id: string;
  _rev: string;
  user: any;
  title: string;
  createdDate: number;
  updatedDate?: number;
  aiProvider?: ProviderName;
  conversations: ChatItem[];
  context?: any;
  shares?: ChatShare[];
  assistant?: boolean;
}

export interface Attachment {
  content_type: string;
  revpos: number;
  digest: string;
  length: number;
  stub: boolean;
}
