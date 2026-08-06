/* eslint-disable no-console */
import OpenAI from 'openai';

import { configurationDB } from '../../../config/couch.config';
import { AIConfigDoc, ChatMode, ProviderName, PROVIDER_NAMES } from '../models/chat.model';
import { defaultPromptProfiles } from '../prompts/default-prompts';

export interface ProviderRuntime {
  name: ProviderName;
  enabled: boolean;
  client?: OpenAI;
  defaultModel: string;
}

export interface AIConfig {
  providers: Record<ProviderName, ProviderRuntime>;
  promptProfiles: Record<ChatMode, string>;
  streaming: boolean;
  planetCode?: string;
}

const PROVIDER_BASE_URLS: Record<ProviderName, string | undefined> = {
  'openai': undefined,
  'perplexity': 'https://api.perplexity.ai',
  'deepseek': 'https://api.deepseek.com',
  'gemini': 'https://generativelanguage.googleapis.com/v1beta/openai/'
};

const CONFIG_TTL_MS = Number(process.env.CONFIG_TTL_MS || 30000);

let cache: { expires: number; value: AIConfig } | undefined;

const looksLikeAIConfig = (doc: any): boolean => !!doc && (
  typeof doc.keys === 'object' ||
  typeof doc.models === 'object' ||
  typeof doc.promptProfiles === 'object' ||
  typeof doc.assistant === 'object' ||
  typeof doc.streaming === 'boolean'
);

const loadConfigDoc = async (): Promise<AIConfigDoc> => {
  const allDocs = await configurationDB.list({ 'include_docs': true });
  const row = allDocs.rows.find((r) => looksLikeAIConfig(r.doc)) || allDocs.rows[0];
  if (!row?.doc) {
    console.error('chatapi: no configuration document found in the configurations database');
    return {};
  }
  return row.doc as unknown as AIConfigDoc;
};

const buildProvider = (name: ProviderName, doc: AIConfigDoc): ProviderRuntime => {
  const apiKey = doc.keys?.[name] || '';
  const defaultModel = doc.models?.[name] || '';
  return {
    name,
    // A provider is only usable with both a key and a model; advertising it
    // otherwise lets clients start work (e.g. lazy indexing) that ends in a 503
    'enabled': !!apiKey && !!defaultModel,
    'client': apiKey ? new OpenAI({ apiKey, 'baseURL': PROVIDER_BASE_URLS[name] }) : undefined,
    defaultModel
  };
};

const buildConfig = (doc: AIConfigDoc): AIConfig => ({
  'providers': PROVIDER_NAMES.reduce((providers, name) => {
    providers[name] = buildProvider(name, doc);
    return providers;
  }, {} as Record<ProviderName, ProviderRuntime>),
  'promptProfiles': {
    'general_chat': doc.promptProfiles?.general_chat || doc.assistant?.instructions || defaultPromptProfiles.general_chat,
    'course_help': doc.promptProfiles?.course_help || defaultPromptProfiles.course_help,
    'survey_analysis': doc.promptProfiles?.survey_analysis || defaultPromptProfiles.survey_analysis
  },
  'streaming': !!doc.streaming,
  'planetCode': typeof doc.code === 'string' ? doc.code : undefined
});

/**
 * Reads AI configuration (provider keys/models, prompt profiles) from CouchDB.
 * Cached with a short TTL so manager-dashboard changes apply without a gateway
 * restart, while chat turns don't hit CouchDB for config on every request.
 */
export async function getAIConfig(forceReload = false): Promise<AIConfig> {
  if (!forceReload && cache && cache.expires > Date.now()) {
    return cache.value;
  }
  try {
    const doc = await loadConfigDoc();
    cache = { 'expires': Date.now() + CONFIG_TTL_MS, 'value': buildConfig(doc) };
  } catch (error) {
    console.error(`chatapi: error loading AI configuration: ${error}`);
    if (!cache) {
      cache = { 'expires': Date.now() + CONFIG_TTL_MS, 'value': buildConfig({}) };
    }
  }
  return cache.value;
}

/** Test hook — clears the config cache. */
export function resetAIConfigCache() {
  cache = undefined;
}
