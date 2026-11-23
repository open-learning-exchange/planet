import { ProviderChatRequest, ProviderChatResult } from '../models/chat.model';
import { ProviderClient } from './clients';
import { compatChat } from './openai-compat.provider';
import { openaiChat } from './openai.provider';
import { PROVIDER_REGISTRY } from './registry';

export function runProviderChat(provider: ProviderClient, request: ProviderChatRequest): Promise<ProviderChatResult> {
  return PROVIDER_REGISTRY[provider.name].api === 'responses'
    ? openaiChat(provider.client, request)
    : compatChat(provider.client, request);
}
