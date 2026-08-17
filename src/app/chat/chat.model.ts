/** Provider names are supplied by the ChatAPI registry. */
export type ProviderName = string;

export interface AIProvider {
  name: ProviderName;
  /** Display name from the registry; falls back to the raw provider name. */
  label?: string;
  capabilities?: string[];
  fileSearchContentTypes?: string[];
}

export const hasSearchableAttachments = (
  attachments?: Record<string, unknown>,
  supportedContentTypes: string[] = []
): boolean =>
  Object.values(attachments || {}).some((attachment: any) =>
    typeof attachment?.content_type === 'string' &&
    supportedContentTypes.includes(attachment.content_type.split(';', 1)[0].trim().toLowerCase())
  );

export type ChatMode = 'general_chat' | 'course_help' | 'survey_analysis';

export interface ChatContext {
  type?: string;
  data?: string;
  resource?: {
    id?: string;
    attachments?: Record<string, unknown>;
  };
}

export interface Citation {
  title?: string;
  fileId?: string;
}

export interface ResourceIndexCleanupResponse {
  results: Array<{
    resourceId: string;
    removed: boolean;
    deferred?: boolean;
    failed?: boolean;
  }>;
}

export interface ConversationForm {
  _id?: string;
  _rev?: string;
  user: string;
  content: string;
  aiProvider?: AIProvider;
  mode: ChatMode;
  context: ChatContext | '';
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
  mode?: ChatMode;
  /**
   * Legacy course-help documents store context at the document level.
   * The sidebar has always excluded these records from the general-chat history;
   * retain the field so those existing documents still deserialize correctly.
   */
  context?: ChatContext | '';
  shared?: boolean;
}

export interface Message {
  id: string;
  query: string;
  response: string;
  citations?: Citation[];
  hasAttachments?: boolean;
}

export interface ChatStreamMessage {
  type: 'partial' | 'final';
  response?: string;
  completionText?: string;
  citations?: Citation[];
  couchDBResponse?: { id?: string; rev?: string };
}

export interface AIServiceStatus {
  label?: string;
  enabled: boolean;
  capabilities: string[];
  fileSearchContentTypes: string[];
}

export type AIServices = Record<string, AIServiceStatus>;

export interface PromptProfiles {
  general_chat: string;
  course_help: string;
  survey_analysis: string;
}

export interface AIServiceDiscovery {
  providers: AIServices;
  promptDefaults: PromptProfiles;
}

export interface AnalysisSection {
  title: string;
  content: string;
}

export interface SurveyAnalysisPayload {
  exam: {
    name: string;
    description?: string;
    type?: string;
  };
  questions: Array<{
    question: string;
    type?: string;
    choices?: unknown;
    responses: unknown;
  }>;
  aiProvider?: AIProvider;
  locale?: string;
}

export interface SurveyAnalysisResponse {
  status: string;
  provider: ProviderName;
  sections: AnalysisSection[];
}
