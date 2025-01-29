/* eslint-disable no-console */
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

import { configurationDB } from './nano.config';
import { ModelsDocument } from '../models/ai-providers.model';

let keys: Record<string, any> = {};
let models: Record<string, any> = {};
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

    keys = {
      'openai': new OpenAI({
        'apiKey': doc?.keys.openai || '',
      }),
      'perplexity': new OpenAI({
        'apiKey': doc?.keys.perplexity || '',
        'baseURL': 'https://api.perplexity.ai',
      }),
      'deepseek': new OpenAI({
        'apiKey': doc?.keys.deepseek || '',
        'baseURL': 'https://api.deepseek.com',
      }),
      'gemini': new GoogleGenerativeAI(doc?.keys.gemini || '')
    };

    models = {
      'openai': { 'ai': keys.openai, 'defaultModel': doc?.models.openai || '' },
      'perplexity': { 'ai': keys.perplexity, 'defaultModel': doc?.models.perplexity || '' },
      'deepseek': { 'ai': keys.deepseek, 'defaultModel': doc?.models.deepseek || '' },
      'gemini': { 'ai': keys.gemini, 'defaultModel': doc?.models.gemini || '' },
    };

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
