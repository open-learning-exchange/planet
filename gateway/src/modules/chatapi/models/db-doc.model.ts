import { ChatItem, ChatMode, Citation, ProviderName } from './chat.model';

// Transitional document shape used by the legacy route until the cutover commit.
export interface DbDoc {
  _id: string;
  _rev: string;
  user: unknown;
  title: string;
  createdDate: number;
  aiProvider?: ProviderName;
  conversations: ChatItem[];
}

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
  revpos?: number;
  digest: string;
  length?: number;
  stub?: boolean;
}

export interface ResourceVectorStoreFile {
  fileId: string;
  digest: string;
}

export interface ResourceVectorStore {
  id: string;
  files: Record<string, ResourceVectorStoreFile>;
  pendingCleanupFileIds?: string[];
  updatedDate: number;
  dirty?: boolean;
}
