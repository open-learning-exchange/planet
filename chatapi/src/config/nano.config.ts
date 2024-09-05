import nano from 'nano';
import dotenv from 'dotenv';

import openai from '../config/openai.config';
import perplexity from '../config/perplexity.config';
import gemini from '../config/gemini.config';
import { ModelConfigDocument } from '../models/ai-providers.model';

dotenv.config();

const db = nano(process.env.COUCHDB_HOST || 'http://couchdb:5984');
const chatDB = db.use('chat_history');
const resourceDB = db.use('resources');
const configurationDB = db.use('configurations');

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
      'perplexity': { 'ai': perplexity, 'defaultModel': doc.modelsConfig.perplexity || 'llama-3-sonar-small-32k-online' },
      'gemini': { 'ai': gemini, 'defaultModel': doc.modelsConfig.gemini || 'gemini-pro' },
    };
  } catch (error: any) {
    throw new Error(`Error initializing providers: ${error.message}`);
  }
};

export { chatDB, resourceDB, getModelsConfig, initializeProviders };
