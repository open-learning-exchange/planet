import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

import { configurationDB } from './nano.config';
import { ModelsDocument } from '../models/ai-providers.model';

let gemini: GoogleGenerativeAI;
let openai: OpenAI;
let perplexity: OpenAI;

let models: Record<string, any> = {};
let assistant: Record<string, any> = {};

async function getConfig(): Promise<ModelsDocument | undefined> {
  try {
    const allDocs = await configurationDB.list({ 'include_docs': true });
    if (allDocs.rows.length > 0) {
      const doc = allDocs.rows[0].doc as unknown as ModelsDocument;
      return doc;
    } else {
      throw new Error('No documents found in configurationDB');
    }
  } catch (error: any) {
    throw new Error(`Error fetching models config: ${error.message}`);
  }
}

const initializeProviders = async () => {
  try {
    const doc = await getConfig();
    if (!doc || !doc.keys) {
      throw new Error('API Keys configuration not found');
    }
    openai = new OpenAI({
      'apiKey':  doc.keys.openai || '',
    });
    perplexity = new OpenAI({
      'apiKey': doc.keys.openai || '',
      'baseURL': 'https://api.perplexity.ai',
    });
    gemini = new GoogleGenerativeAI(doc.keys.gemini || '');
  } catch (error: any) {
    throw new Error(`Error initializing providers: ${error.message}`);
  }
};

const getModels = async () => {
  try {
    const doc = await getConfig();
    if (!doc || !doc.models) {
      throw new Error('Models configuration not found');
    }
    models = {
      'openai': { 'ai': openai, 'defaultModel': doc.models.openai || 'gpt-3.5-turbo' },
      'perplexity': { 'ai': perplexity, 'defaultModel': doc.models.perplexity || 'llama-3-sonar-small-32k-online' },
      'gemini': { 'ai': gemini, 'defaultModel': doc.models.gemini || 'gemini-pro' },
    };
  } catch (error: any) {
    throw new Error(`Error getting provider models: ${error.message}`);
  }
};

const getAssistant = async () => {
  try {
    const doc = await getConfig();
    if (!doc || !doc.assistant) {
      throw new Error('Assistant configuration not found');
    }
    assistant = {
      'name': doc.assistant.name,
      'instructions': doc.assistant.instructions,
    };
  } catch (error: any) {
    throw new Error(`Error getting assistant configs: ${error.message}`);
  }
};

(async () => {
  await initializeProviders();
  await getModels();
  await getAssistant();
})();

export { openai, perplexity, gemini, models, assistant };
