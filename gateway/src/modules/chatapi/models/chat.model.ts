export const PROVIDER_NAMES = [ 'openai', 'perplexity', 'deepseek', 'gemini' ] as const;

export type ProviderName = typeof PROVIDER_NAMES[number];

export interface AIProvider {
  name: ProviderName;
}

export const CHAT_MODES = [ 'general_chat', 'course_help', 'survey_analysis' ] as const;

export type ChatMode = typeof CHAT_MODES[number];

export interface Citation {
  title?: string;
  fileId: string;
}

export interface ChatContext {
  type?: string;
  data?: string;
  resource?: {
    id?: string;
  };
}

export interface ChatRequestPayload {
  content: string;
  aiProvider?: AIProvider;
  mode?: ChatMode;
  context?: ChatContext | string;
  locale?: string;
  user?: unknown;
  _id?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Request handed to a provider adapter. */
export interface ProviderChatRequest {
  model: string;
  messages: ChatMessage[];
  instructions?: string;
  onDelta?: (delta: string) => void;
  vectorStoreIds?: string[];
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
  signal?: AbortSignal;
}

export interface ProviderChatResult {
  text: string;
  citations: Citation[];
}

export interface PromptProfiles {
  general_chat?: string;
  course_help?: string;
  survey_analysis?: string;
}

/** Shape of the AI fields on the CouchDB configurations document. */
export interface AIConfigDoc {
  _id?: string;
  code?: string;
  planetType?: string;
  keys?: Partial<Record<ProviderName, string>>;
  models?: Partial<Record<ProviderName, string>>;
  promptProfiles?: PromptProfiles;
}
