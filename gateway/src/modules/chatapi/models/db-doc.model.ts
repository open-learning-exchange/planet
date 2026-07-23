import { ChatMode, Citation, ProviderName } from './chat.model';

export interface ChatTurn {
  id: string;
  query: string;
  response: string;
  citations?: Citation[];
}

export interface ChatDoc {
  _id?: string;
  _rev?: string;
  user: unknown;
  title: string;
  createdDate: number;
  updatedDate?: number;
  aiProvider: ProviderName;
  /** The client hides non-general_chat conversations from the main chat history. Legacy docs carry `context` instead. */
  mode?: ChatMode;
  conversations: ChatTurn[];
  lastResponseId?: string;
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

/** Persisted on a resource doc once its attachments are indexed for file_search. */
export interface ResourceVectorStore {
  id: string;
  files: Record<string, ResourceVectorStoreFile>;
  updatedDate: number;
}
