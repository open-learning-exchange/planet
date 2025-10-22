/* eslint-disable no-console */
import OpenAI from 'openai';

import { configurationDB } from './nano.config';
import { AssistantResponseFormat, AssistantToolConfig, ModelsDocument } from '../models/chat.model';

let keys: Record<string, any> = {};
let models: Record<string, any> = {};
let assistant: Record<string, any> = {};

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if ([ 'true', '1', 'yes', 'y' ].includes(normalized)) {
    return true;
  }
  if ([ 'false', '0', 'no', 'n' ].includes(normalized)) {
    return false;
  }
  return undefined;
};

const parseJSON = <T>(value: string | undefined): T | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Failed to parse JSON value from environment: ${error}`); // eslint-disable-line no-console
    return undefined;
  }
};

const parseResponseFormat = (value: string | undefined): AssistantResponseFormat | undefined => {
  if (!value) {
    return undefined;
  }

  if (value.trim().startsWith('{')) {
    return parseJSON<AssistantResponseFormat>(value);
  }

  return value;
};

const parseTools = (value: string | undefined): AssistantToolConfig[] | undefined => {
  const parsed = parseJSON<AssistantToolConfig[]>(value);

  if (!parsed) {
    return undefined;
  }

  return Array.isArray(parsed) ? parsed : undefined;
};

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
      'gemini': new OpenAI({
        'apiKey': doc?.keys.gemini || '',
        'baseURL': 'https://generativelanguage.googleapis.com/v1beta/openai/',
      })
    };

    models = {
      'openai': { 'ai': keys.openai, 'defaultModel': doc?.models.openai || '' },
      'perplexity': { 'ai': keys.perplexity, 'defaultModel': doc?.models.perplexity || '' },
      'deepseek': { 'ai': keys.deepseek, 'defaultModel': doc?.models.deepseek || '' },
      'gemini': { 'ai': keys.gemini, 'defaultModel': doc?.models.gemini || '' },
    };

    const envAssistantName = process.env.OPENAI_ASSISTANT_NAME;
    const envAssistantInstructions = process.env.OPENAI_ASSISTANT_INSTRUCTIONS;
    const envResponseFormat = parseResponseFormat(process.env.OPENAI_RESPONSE_FORMAT);
    const envParallelToolCalls = parseBoolean(process.env.OPENAI_PARALLEL_TOOL_CALLS);
    const envTools = parseTools(process.env.OPENAI_ASSISTANT_TOOLS);

    const computedTools = Array.isArray(doc?.assistant?.tools)
      ? doc?.assistant?.tools
      : envTools ?? [ { 'type': 'code_interpreter' } ];

    assistant = {
      'name': doc?.assistant?.name || envAssistantName || '',
      'instructions': doc?.assistant?.instructions || envAssistantInstructions || '',
      'tools': computedTools,
    };

    const resolvedResponseFormat = doc?.assistant?.response_format ?? envResponseFormat;
    if (resolvedResponseFormat !== undefined) {
      assistant.response_format = resolvedResponseFormat;
    }

    const resolvedParallelToolCalls = doc?.assistant?.parallel_tool_calls ?? envParallelToolCalls;
    if (resolvedParallelToolCalls !== undefined) {
      assistant.parallel_tool_calls = resolvedParallelToolCalls;
    }
  } catch (error) {
    console.error(`Error initializing configs: ${error}`);
  }
};

(async () => {
  await initialize();
})();

export { keys, models, assistant };
