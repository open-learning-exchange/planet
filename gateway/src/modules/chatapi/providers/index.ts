import { ProviderChatRequest, ProviderChatResult } from '../models/chat.model';
import { ProviderRuntime } from '../services/config.service';
import { HttpError } from '../utils/http-error';
import { compatChat } from './openai-compat.provider';
import { openaiChat } from './openai.provider';
import { providerSupports } from './registry';

export { providerCapabilities, providerSupports } from './registry';

export async function runProviderChat(runtime: ProviderRuntime, request: ProviderChatRequest): Promise<ProviderChatResult> {
  if (!runtime.enabled || !runtime.client) {
    throw new HttpError(503, `AI provider "${runtime.name}" is not configured`);
  }
  if (!request.model) {
    throw new HttpError(400, `No model configured for AI provider "${runtime.name}"`);
  }
  const unsupported = [
    request.vectorStoreIds?.length && !providerSupports(runtime.name, 'fileSearch') ? 'file search' : undefined,
    request.jsonSchema && !providerSupports(runtime.name, 'structuredOutput') ? 'structured output' : undefined
  ].filter(Boolean);
  if (unsupported.length) {
    throw new HttpError(400, `AI provider "${runtime.name}" does not support: ${unsupported.join(', ')}`);
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
