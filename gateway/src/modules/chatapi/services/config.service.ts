/* eslint-disable no-console */
import OpenAI from 'openai';

import { configurationDB } from '../../../config/couch.config';
import { AIConfigDoc, ChatMode } from '../models/chat.model';
import { defaultPromptProfiles } from '../prompts/default-prompts';
import { ProviderName, PROVIDER_NAMES, providerDefinition } from '../providers/registry';
import { getAIRequestTimeoutMs, getResourceIndexTimeoutMs } from '../utils/timeout.utils';

export interface ProviderRuntime {
  name: ProviderName;
  enabled: boolean;
  client?: OpenAI;
  fileSearchClient?: OpenAI;
  defaultModel: string;
  requestTimeoutMs: number;
}

export interface AIConfig {
  providers: Record<ProviderName, ProviderRuntime>;
  promptProfiles: Record<ChatMode, string>;
  planetCode: string;
}

const CONFIG_CACHE_TTL_MS = 30000;
const CONFIG_ERROR_RETRY_TTL_MS = 5000;

let cache: { expires: number; value: AIConfig } | undefined;
let refreshInFlight: Promise<AIConfig> | undefined;
let refreshInFlightIsForced = false;

const isRecord = (value: any): boolean => typeof value === 'object' && value !== null;

const looksLikePlanetConfig = (doc: any): boolean => isRecord(doc) &&
  typeof doc.planetType === 'string' && typeof doc.code === 'string';

const loadConfigDoc = async (): Promise<AIConfigDoc> => {
  const allDocs = await configurationDB.list({ 'include_docs': true });
  const documents = allDocs.rows.map((item) => item.doc).filter(isRecord);
  const doc = documents.find(looksLikePlanetConfig) || documents[0];
  if (!doc) {
    throw new Error('No configuration document found in the configurations database');
  }
  return doc as unknown as AIConfigDoc;
};

const buildProvider = (name: ProviderName, doc: AIConfigDoc): ProviderRuntime => {
  const apiKey = doc.keys?.[name] || '';
  const defaultModel = doc.models?.[name] || '';
  const requestTimeoutMs = getAIRequestTimeoutMs();
  const definition = providerDefinition(name);
  const client = apiKey ? new OpenAI({
    apiKey,
    'baseURL': definition.baseURL,
    'timeout': requestTimeoutMs,
    'maxRetries': 0
  }) : undefined;
  const fileSearchClient = apiKey && definition.capabilities.includes('fileSearch') ? new OpenAI({
    apiKey,
    'baseURL': definition.baseURL,
    'timeout': getResourceIndexTimeoutMs(),
    'maxRetries': 0
  }) : undefined;
  return {
    name,
    'enabled': !!apiKey && !!defaultModel,
    // Retain a key-only client so resource-index cleanup works even without a configured chat model.
    client,
    fileSearchClient,
    defaultModel,
    requestTimeoutMs
  };
};

const promptProfileOr = (value: string | undefined, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const buildPromptProfiles = (doc: AIConfigDoc): Record<ChatMode, string> => ({
  'general_chat': promptProfileOr(doc.promptProfiles?.general_chat, defaultPromptProfiles.general_chat),
  'course_help': promptProfileOr(doc.promptProfiles?.course_help, defaultPromptProfiles.course_help),
  'survey_analysis': promptProfileOr(doc.promptProfiles?.survey_analysis, defaultPromptProfiles.survey_analysis)
});

const buildConfig = (doc: AIConfigDoc): AIConfig => ({
  'providers': PROVIDER_NAMES.reduce((providers, name) => {
    providers[name] = buildProvider(name, doc);
    return providers;
  }, {} as Record<ProviderName, ProviderRuntime>),
  'promptProfiles': buildPromptProfiles(doc),
  'planetCode': doc.code || ''
});

const refreshAIConfig = async (): Promise<AIConfig> => {
  try {
    const doc = await loadConfigDoc();
    cache = { 'expires': Date.now() + CONFIG_CACHE_TTL_MS, 'value': buildConfig(doc) };
  } catch (error) {
    console.error(`chatapi: error loading AI configuration: ${error}`);
    cache = {
      'expires': Date.now() + CONFIG_ERROR_RETRY_TTL_MS,
      'value': cache?.value || buildConfig({})
    };
  }
  return cache.value;
};

/** Read and briefly cache AI provider and prompt-profile configuration from CouchDB. */
export async function getAIConfig(forceReload = false): Promise<AIConfig> {
  // Discovery after login must read after any earlier unauthenticated refresh.
  if (forceReload && refreshInFlight) {
    if (refreshInFlightIsForced) {
      return refreshInFlight;
    }
    await refreshInFlight;
    return getAIConfig(true);
  }
  if (!forceReload && cache && cache.expires > Date.now()) {
    return cache.value;
  }
  if (!forceReload && refreshInFlight) {
    return refreshInFlight;
  }
  const refresh = refreshAIConfig();
  refreshInFlight = refresh;
  refreshInFlightIsForced = forceReload;
  try {
    return await refresh;
  } finally {
    if (refreshInFlight === refresh) {
      refreshInFlight = undefined;
      refreshInFlightIsForced = false;
    }
  }
}

/** Clear cached configuration between tests or explicit configuration reloads. */
export function resetAIConfigCache() {
  cache = undefined;
  refreshInFlight = undefined;
  refreshInFlightIsForced = false;
}
