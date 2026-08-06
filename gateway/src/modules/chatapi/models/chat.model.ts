export type ProviderName = 'openai' | 'perplexity' | 'deepseek' | 'gemini';

export const PROVIDER_NAMES: ProviderName[] = [ 'openai', 'perplexity', 'deepseek', 'gemini' ];

export interface AIProvider {
  name: ProviderName;
  model?: string;
}

export type ChatMode = 'general_chat' | 'course_help' | 'survey_analysis';

export const CHAT_MODES: ChatMode[] = [ 'general_chat', 'course_help', 'survey_analysis' ];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Citation {
  title: string;
  fileId?: string;
}

export interface ChatContext {
  type?: string;
  data?: string;
  resource?: {
    id?: string;
    attachments?: Record<string, unknown>;
  };
}

/** Payload accepted by POST / and the WebSocket. */
export interface ChatRequestPayload {
  content: string;
  aiProvider?: AIProvider;
  mode?: ChatMode;
  context?: ChatContext | string;
  user?: unknown;
  _id?: string;
  _rev?: string;
  /** @deprecated older clients sent this; it is accepted and ignored. Use `mode`. */
  assistant?: boolean;
}

/** Request handed to a provider adapter. */
export interface ProviderChatRequest {
  model: string;
  messages: ChatMessage[];
  instructions?: string;
  vectorStoreIds?: string[];
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
  onDelta?: (delta: string) => void;
}

export interface ProviderChatResult {
  text: string;
  responseId?: string;
  citations: Citation[];
}

export interface PromptProfiles {
  general_chat?: string;
  course_help?: string;
  survey_analysis?: string;
}

/** Shape of the AI fields on the CouchDB configurations document. */
export interface AIConfigDoc {
  /** The local planet's code — the config doc doubles as the planet configuration. */
  code?: string;
  keys?: Partial<Record<ProviderName, string>>;
  models?: Partial<Record<ProviderName, string>>;
  promptProfiles?: PromptProfiles;
  /** @deprecated legacy assistant config; `instructions` is used as the general_chat fallback. */
  assistant?: {
    name?: string;
    instructions?: string;
  };
  streaming?: boolean;
}
