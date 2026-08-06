export type ProviderName = 'openai' | 'perplexity' | 'deepseek' | 'gemini';

export interface AIProvider {
  name: ProviderName;
  model?: string;
}

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
  title: string;
  fileId?: string;
}

export interface ConversationForm {
  _id?: string;
  _rev?: string;
  user: string;
  content: string;
  aiProvider: AIProvider;
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
  /** Legacy docs from the old chatapi stored the raw context; kept only to filter them out of the main history. */
  context?: ChatContext | '';
  shared?: boolean;
}

export interface Message {
  id: string;
  query: string;
  response: string;
  citations?: Citation[];
}

export interface AIServiceStatus {
  enabled: boolean;
  capabilities: string[];
}

export type AIServices = Record<ProviderName, AIServiceStatus>;

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
}

export interface SurveyAnalysisResponse {
  status: string;
  provider: ProviderName;
  sections: AnalysisSection[];
}
