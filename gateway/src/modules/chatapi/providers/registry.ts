import { HttpError } from '../utils/http-error';

export type ProviderCapability =
  | 'chat'
  // Requires compatibility with OpenAI's vector-store, file, and file-search APIs.
  | 'fileSearch'
  | 'structuredOutput';

interface ProviderDefinition {
  label: string;
  baseURL?: string;
  capabilities: readonly ProviderCapability[];
}

const providerRegistry = {
  'openai': {
    'label': 'OpenAI',
    'capabilities': [ 'chat', 'fileSearch', 'structuredOutput' ]
  },
  'perplexity': {
    'label': 'Perplexity',
    'baseURL': 'https://api.perplexity.ai',
    'capabilities': [ 'chat' ]
  },
  'deepseek': {
    'label': 'DeepSeek',
    'baseURL': 'https://api.deepseek.com',
    'capabilities': [ 'chat' ]
  },
  'gemini': {
    'label': 'Gemini',
    'baseURL': 'https://generativelanguage.googleapis.com/v1beta/openai/',
    'capabilities': [ 'chat' ]
  },
  'anthropic': {
    'label': 'Anthropic (Claude)',
    'baseURL': 'https://api.anthropic.com/v1/',
    'capabilities': [ 'chat' ]
  }
} as const;

export type ProviderName = keyof typeof providerRegistry;
export const PROVIDER_REGISTRY: Record<ProviderName, ProviderDefinition> = providerRegistry;
export const PROVIDER_NAMES = Object.keys(PROVIDER_REGISTRY) as ProviderName[];

export const providerDefinition = (name: ProviderName) => PROVIDER_REGISTRY[name];

export const providerCapabilities = (name: string): ProviderCapability[] => {
  if (!Object.prototype.hasOwnProperty.call(PROVIDER_REGISTRY, name)) {
    throw new HttpError(400, `Unsupported AI provider "${name}"`);
  }
  return [ ...PROVIDER_REGISTRY[name as ProviderName].capabilities ];
};

// Goes through the guarded lookup so an unregistered name is a 400, not a prototype-chain TypeError.
export const providerSupports = (name: ProviderName, capability: ProviderCapability): boolean =>
  providerCapabilities(name).includes(capability);
