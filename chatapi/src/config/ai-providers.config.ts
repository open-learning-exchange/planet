/* eslint-disable no-console */
import OpenAI from 'openai';

import { configurationDB } from './nano.config';
import { ModelsDocument } from '../models/chat.model';
import { DEFAULT_AI_PROVIDERS, AIProvider } from '../../../src/shared/ai-providers';

let keys: Record<AIProvider, any> = {} as Record<AIProvider, any>;
let models: Record<AIProvider, any> = {} as Record<AIProvider, any>;
let assistant: Record<string, any> = {};

async function getConfig(): Promise<ModelsDocument | undefined> {
  try {
    const allDocs = await configurationDB.list({ 'include_docs': true });
    if (allDocs.rows.length > 0) {
      const doc = allDocs.rows[0].doc as unknown as ModelsDocument;
      return doc;
    } else {
      console.error('No documents found in configurationDB');
    }
  } catch (error: any) {
    console.error(`Error fetching models config: ${error}`);
  }
}

const initialize = async () => {
  try {
    const doc = await getConfig();
    if (!doc) {
      console.error('Configuration not found');
    }
    const baseURLs: Record<AIProvider, string | undefined> = {
      openai: undefined,
      perplexity: 'https://api.perplexity.ai',
      deepseek: 'https://api.deepseek.com',
      gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    };

    keys = DEFAULT_AI_PROVIDERS.reduce((acc: Record<AIProvider, any>, provider: AIProvider) => {
      acc[provider] = new OpenAI({
        apiKey: doc?.keys[provider] || '',
        ...(baseURLs[provider] ? { baseURL: baseURLs[provider] } : {})
      });
      return acc;
    }, {} as Record<AIProvider, any>);

    models = DEFAULT_AI_PROVIDERS.reduce((acc: Record<AIProvider, any>, provider: AIProvider) => {
      acc[provider] = { ai: keys[provider], defaultModel: doc?.models[provider] || '' };
      return acc;
    }, {} as Record<AIProvider, any>);

    assistant = {
      'name': doc?.assistant?.name || '',
      'instructions': doc?.assistant?.instructions || '',
    };
  } catch (error) {
    console.error(`Error initializing configs: ${error}`);
  }
};

(async () => {
  await initialize();
})();

export { keys, models, assistant };
