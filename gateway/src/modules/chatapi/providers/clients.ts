import OpenAI from 'openai';

import { getConfiguration, getKeys } from '../../../services/config.service';
import { ProviderStatus } from '../models/chat.model';
import { PROVIDER_NAMES, PROVIDER_REGISTRY, ProviderName } from './registry';

export async function listProviders(): Promise<ProviderStatus[]> {
  const [ keys, { models } ] = await Promise.all([ getKeys(), getConfiguration() ]);
  return PROVIDER_NAMES.map((name) => ({
    name,
    'label': PROVIDER_REGISTRY[name].label,
    'configured': !!keys[name] && !!models[name]
  }));
}

export async function providerClient(name: ProviderName): Promise<{ client: OpenAI; defaultModel: string }> {
  if (!PROVIDER_NAMES.includes(name)) {
    throw new Error('Unsupported AI provider');
  }
  const [ keys, { models } ] = await Promise.all([ getKeys(), getConfiguration() ]);
  if (!keys[name]) {
    throw new Error(`${name} is not configured`);
  }
  return {
    'client': new OpenAI({ 'apiKey': keys[name], 'baseURL': PROVIDER_REGISTRY[name].baseURL }),
    'defaultModel': models[name] || ''
  };
}
