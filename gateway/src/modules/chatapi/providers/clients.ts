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

async function providerSettings() {
  const [ keys, { models } ] = await Promise.all([ getKeys('ai'), getConfiguration() ]);
  return { keys, models, 'configured': (name: ProviderName) => !!keys[name] && !!models[name] };
}

export async function listProviders(): Promise<ProviderStatus[]> {
  const { configured } = await providerSettings();
  return PROVIDER_NAMES.map((name) => ({ name, 'label': PROVIDER_REGISTRY[name].label, 'configured': configured(name) }));
}

export async function providerClient(aiProvider?: AIProvider): Promise<ProviderClient> {
  if (aiProvider && !PROVIDER_NAMES.includes(aiProvider.name)) {
    throw new HttpError(400, '"aiProvider.name" must name a supported AI provider');
  }
  const { keys, models, configured } = await providerSettings();
  const name = aiProvider?.name ?? PROVIDER_NAMES.find(configured);
  if (!name) {
    throw new HttpError(503, 'No AI provider is configured on this planet');
  }
  if (!configured(name)) {
    throw new HttpError(503, `${PROVIDER_REGISTRY[name].label} is not configured on this planet`);
  }
  return {
    name,
    'client': new OpenAI({ 'apiKey': keys[name], 'baseURL': PROVIDER_REGISTRY[name].baseURL }),
    'model': models[name]
  };
}
