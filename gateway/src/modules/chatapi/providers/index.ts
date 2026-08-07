import { ProviderChatRequest, ProviderChatResult, ProviderName } from '../models/chat.model';
import { ProviderRuntime } from '../services/config.service';
import { HttpError } from '../utils/http-error';
import { compatChat } from './openai-compat.provider';
import { openaiChat } from './openai.provider';

export type ProviderCapability = 'chat' | 'fileSearch' | 'structuredOutput';

const CAPABILITIES: Record<ProviderName, readonly ProviderCapability[]> = {
  'openai': [ 'chat', 'fileSearch', 'structuredOutput' ],
  'perplexity': [ 'chat' ],
  'deepseek': [ 'chat' ],
  'gemini': [ 'chat' ]
};

export const providerCapabilities = (name: string): ProviderCapability[] => {
  if (!Object.prototype.hasOwnProperty.call(CAPABILITIES, name)) {
    throw new HttpError(400, `Unsupported AI provider "${name}"`);
  }
  return [ ...CAPABILITIES[name as ProviderName] ];
};

export async function runProviderChat(runtime: ProviderRuntime, request: ProviderChatRequest): Promise<ProviderChatResult> {
  if (!runtime.enabled || !runtime.client) {
    throw new HttpError(503, `AI provider "${runtime.name}" is not configured`);
  }
  if (!request.model) {
    throw new HttpError(400, `No model configured for AI provider "${runtime.name}"`);
  }
  if (runtime.name !== 'openai') {
    const unsupported = [
      request.vectorStoreIds?.length ? 'file search' : undefined,
      request.jsonSchema ? 'structured output' : undefined
    ].filter(Boolean);
    if (unsupported.length) {
      throw new HttpError(400, `AI provider "${runtime.name}" does not support: ${unsupported.join(', ')}`);
    }
  }
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(request.signal?.reason);
  if (request.signal?.aborted) {
    abortFromCaller();
  } else {
    request.signal?.addEventListener('abort', abortFromCaller, { 'once': true });
  }
  let timeout: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((resolve, reject) => {
    void resolve;
    timeout = setTimeout(() => {
      reject(new HttpError(504, 'AI provider request timed out'));
      controller.abort();
    }, runtime.requestTimeoutMs);
  });
  const providerRequest = { ...request, 'signal': controller.signal };
  const providerCall = runtime.name === 'openai'
    ? openaiChat(runtime.client, providerRequest)
    : compatChat(runtime.client, providerRequest);
  try {
    return await Promise.race([ providerCall, deadline ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    request.signal?.removeEventListener('abort', abortFromCaller);
  }
}
