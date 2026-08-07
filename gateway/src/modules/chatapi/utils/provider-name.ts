import { ProviderName, PROVIDER_NAMES } from '../models/chat.model';
import { HttpError } from './http-error';

/** Default an omitted provider, but reject malformed or unsupported explicit values. */
export const resolveProviderName = (provider: unknown): ProviderName => {
  if (provider === undefined) {
    return 'openai';
  }
  const name = provider && typeof provider === 'object' ? (provider as { name?: unknown }).name : undefined;
  if (typeof name !== 'string' || !PROVIDER_NAMES.includes(name as ProviderName)) {
    throw new HttpError(400, '"aiProvider.name" must identify a supported AI provider');
  }
  return name as ProviderName;
};
