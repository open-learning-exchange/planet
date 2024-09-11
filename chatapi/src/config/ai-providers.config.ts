import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import dotenv from 'dotenv';

import { configurationDB } from './nano.config';
import { ModelConfigDocument } from '../models/ai-providers.model';

dotenv.config();

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const openai = new OpenAI({
  'apiKey': process.env.OPENAI_API_KEY || '',
});

const perplexity = new OpenAI({
  'apiKey': process.env.PERPLEXITY_API_KEY || '',
  'baseURL': 'https://api.perplexity.ai',
});

async function getModelsConfig() {
  try {
    const allDocs = await configurationDB.list({ 'include_docs': true });
    if (allDocs.rows.length > 0) {
      const doc = allDocs.rows[0].doc;
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
    const doc = await getModelsConfig() as ModelConfigDocument | undefined;
    if (!doc || !doc.modelsConfig) {
      throw new Error('Models configuration not found');
    }
    return {
      'openai': { 'ai': openai, 'defaultModel': doc.modelsConfig.openai || 'gpt-3.5-turbo' },
      'perplexity': { 'ai': perplexity, 'defaultModel': doc.modelsConfig.perplexity || 'llama-3.1-sonar-huge-128k-online	' },
      'gemini': { 'ai': gemini, 'defaultModel': doc.modelsConfig.gemini || 'gemini-pro' },
    };
  } catch (error: any) {
    throw new Error(`Error initializing providers: ${error.message}`);
  }
};

export { openai, perplexity, gemini, getModelsConfig, initializeProviders };
