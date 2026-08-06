import { ProviderChatRequest, ProviderChatResult, ProviderName } from '../models/chat.model';
import { ProviderRuntime } from '../services/config.service';
import { HttpError } from '../utils/http-error';
import { openaiChat } from './openai.provider';
import { compatChat } from './openai-compat.provider';

export type ProviderCapability = 'chat' | 'fileSearch' | 'structuredOutput';

export const providerCapabilities = (name: ProviderName): ProviderCapability[] =>
  name === 'openai' ? [ 'chat', 'fileSearch', 'structuredOutput' ] : [ 'chat' ];

export async function runProviderChat(runtime: ProviderRuntime, request: ProviderChatRequest): Promise<ProviderChatResult> {
  if (!runtime.enabled || !runtime.client) {
    throw new HttpError(503, `AI provider "${runtime.name}" is not configured`);
  }
  if (!request.model) {
    throw new HttpError(400, `No model configured for AI provider "${runtime.name}"`);
  }
  if (runtime.name === 'openai') {
    return openaiChat(runtime.client, request);
  }
  const unsupported = [
    request.vectorStoreIds?.length ? 'file search' : undefined,
    request.jsonSchema ? 'structured output' : undefined
  ].filter(Boolean);
  if (unsupported.length) {
    throw new HttpError(400, `AI provider "${runtime.name}" does not support: ${unsupported.join(', ')}`);
  }
  return compatChat(runtime.client, request);
}
