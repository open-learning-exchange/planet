import OpenAI from 'openai';

import { HttpError } from '../../../middleware/errors';
import { getConfiguration } from '../../../services/config.service';
import { getKeys } from '../../../services/keys.service';
import { AIProvider, ProviderStatus } from '../models/chat.model';
import { PROVIDER_NAMES, PROVIDER_REGISTRY, ProviderName } from './registry';

export interface ProviderClient {
  name: ProviderName;
  client: OpenAI;
  model: string;
}

export async function listProviders(): Promise<ProviderStatus[]> {
  const [ keys, { models } ] = await Promise.all([ getKeys('ai'), getConfiguration() ]);
  return PROVIDER_NAMES.map((name) => ({
    name,
    'label': PROVIDER_REGISTRY[name].label,
    'configured': !!keys[name] && !!models[name]
  }));
}

export async function providerClient(aiProvider: AIProvider): Promise<ProviderClient> {
  const name = aiProvider?.name;
  if (!PROVIDER_NAMES.includes(name)) {
    throw new HttpError(400, '"aiProvider.name" must name a supported AI provider');
  }
  const [ keys, { models } ] = await Promise.all([ getKeys('ai'), getConfiguration() ]);
  const model = aiProvider.model ?? models[name];
  if (!keys[name] || !model) {
    throw new HttpError(503, `${PROVIDER_REGISTRY[name].label} is not configured on this planet`);
  }
  return {
    name,
    'client': new OpenAI({ 'apiKey': keys[name], 'baseURL': PROVIDER_REGISTRY[name].baseURL }),
    model
  };
}
