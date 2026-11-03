import OpenAI from 'openai';

import { getConfiguration, getKeys } from '../../../services/config.service';
import { ProviderName } from '../models/chat.model';

const BASE_URLS: Record<ProviderName, string | undefined> = {
  'openai': undefined,
  'perplexity': 'https://api.perplexity.ai',
  'deepseek': 'https://api.deepseek.com',
  'gemini': 'https://generativelanguage.googleapis.com/v1beta/openai/'
};

const PROVIDER_NAMES = Object.keys(BASE_URLS) as ProviderName[];

export async function configuredProviders(): Promise<Record<ProviderName, boolean>> {
  const keys = await getKeys();
  return PROVIDER_NAMES.reduce((providers, name) => ({ ...providers, [name]: !!keys[name] }), {} as Record<ProviderName, boolean>);
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
    'client': new OpenAI({ 'apiKey': keys[name], 'baseURL': BASE_URLS[name] }),
    'defaultModel': models[name] || ''
  };
}
