export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: any[];
}
