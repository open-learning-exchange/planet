import { ChatMode, Citation, ProviderName } from './chat.model';

export interface ChatTurn {
  id: string;
  query: string;
  response: string;
  citations?: Citation[];
  hasAttachments?: boolean;
}

export interface ChatDoc {
  _id?: string;
  _rev?: string;
  user: unknown;
  title: string;
  createdDate: number;
  updatedDate?: number;
  aiProvider: ProviderName;
  mode?: ChatMode;
  conversations: ChatTurn[];
  shared?: boolean;
}

export interface Attachment {
  content_type: string;
  digest: string;
  length?: number;
}

export interface ResourceVectorStoreFile {
  fileId: string;
  digest: string;
}

export interface ResourceVectorStore {
  id: string;
  files: Record<string, ResourceVectorStoreFile>;
  dirty?: boolean;
}
