/* eslint-disable quote-props, @typescript-eslint/naming-convention */
import assert from 'assert';

import { aiChat } from '../utils/chat.utils';
import { assistant as assistantConfig, models } from '../config/ai-providers.config';
import * as assistantUtils from '../utils/chat-assistant.utils';

function createFakeProvider() {
  return {
    ai: {
      chat: {
        completions: {
          create: async () => ({ choices: [ { message: { content: 'provider response' } } ] })
        }
      }
    },
    defaultModel: 'gpt-4o-mini'
  };
}

async function testAssistantNonStreamingPath() {
  const originalModel = models.openai;
  const originalAssistantEnabled = assistantConfig.enabled;
  const originalCreateAssistant = assistantUtils.createAssistant;
  const originalCreateThread = assistantUtils.createThread;
  const originalAddToThread = assistantUtils.addToThread;
  const originalCreateRun = assistantUtils.createRun;
  const originalWaitForRunCompletion = assistantUtils.waitForRunCompletion;
  const originalRetrieveResponse = assistantUtils.retrieveResponse;

  let runCreated = false;

  try {
    models.openai = createFakeProvider();
    assistantConfig.enabled = true;

    (assistantUtils as any).createAssistant = (async () => ({ id: 'asst_1' })) as typeof assistantUtils.createAssistant;
    (assistantUtils as any).createThread = (async () => ({ id: 'thread_1' })) as typeof assistantUtils.createThread;
    (assistantUtils as any).addToThread = (async () => ({})) as typeof assistantUtils.addToThread;
    (assistantUtils as any).createRun = (async () => {
      runCreated = true;
      return { id: 'run_1' };
    }) as typeof assistantUtils.createRun;
    (assistantUtils as any).waitForRunCompletion = (async () => ({ status: 'completed' })) as typeof assistantUtils.waitForRunCompletion;
    (assistantUtils as any).retrieveResponse = (async () => 'assistant non-stream response') as typeof assistantUtils.retrieveResponse;

    const response = await aiChat(
      [ { role: 'user', content: 'hello' } ],
      { name: 'openai', model: 'gpt-4o-mini' },
      true,
      { data: 'context' },
      false
    );

    assert.strictEqual(response, 'assistant non-stream response');
    assert.strictEqual(runCreated, true);
  } finally {
    models.openai = originalModel;
    assistantConfig.enabled = originalAssistantEnabled;
    (assistantUtils as any).createAssistant = originalCreateAssistant;
    (assistantUtils as any).createThread = originalCreateThread;
    (assistantUtils as any).addToThread = originalAddToThread;
    (assistantUtils as any).createRun = originalCreateRun;
    (assistantUtils as any).waitForRunCompletion = originalWaitForRunCompletion;
    (assistantUtils as any).retrieveResponse = originalRetrieveResponse;
  }
}

async function testAssistantStreamingPath() {
  const originalModel = models.openai;
  const originalAssistantEnabled = assistantConfig.enabled;
  const originalCreateAssistant = assistantUtils.createAssistant;
  const originalCreateThread = assistantUtils.createThread;
  const originalAddToThread = assistantUtils.addToThread;
  const originalCreateAndHandleRunWithStreaming = assistantUtils.createAndHandleRunWithStreaming;

  const streamedChunks: string[] = [];

  try {
    models.openai = createFakeProvider();
    assistantConfig.enabled = true;

    (assistantUtils as any).createAssistant = (async () => ({ id: 'asst_2' })) as typeof assistantUtils.createAssistant;
    (assistantUtils as any).createThread = (async () => ({ id: 'thread_2' })) as typeof assistantUtils.createThread;
    (assistantUtils as any).addToThread = (async () => ({})) as typeof assistantUtils.addToThread;
    (assistantUtils as any).createAndHandleRunWithStreaming = (
      (async (_threadID: string, _assistantID: string, _instructions: string, callback?: (response: string) => void) => {
        callback?.('hello');
        callback?.(' world');
        return 'hello world';
      }) as typeof assistantUtils.createAndHandleRunWithStreaming
    );

    const response = await aiChat(
      [ { role: 'user', content: 'hello' } ],
      { name: 'openai', model: 'gpt-4o-mini' },
      true,
      { data: 'context' },
      true,
      (chunk: string) => streamedChunks.push(chunk)
    );

    assert.strictEqual(response, 'hello world');
    assert.deepStrictEqual(streamedChunks, [ 'hello', ' world' ]);
  } finally {
    models.openai = originalModel;
    assistantConfig.enabled = originalAssistantEnabled;
    (assistantUtils as any).createAssistant = originalCreateAssistant;
    (assistantUtils as any).createThread = originalCreateThread;
    (assistantUtils as any).addToThread = originalAddToThread;
    (assistantUtils as any).createAndHandleRunWithStreaming = originalCreateAndHandleRunWithStreaming;
  }
}

async function testAssistantProviderValidation() {
  const originalModel = models.perplexity;
  const originalAssistantEnabled = assistantConfig.enabled;
  try {
    models.perplexity = createFakeProvider();
    assistantConfig.enabled = true;

    await assert.rejects(
      aiChat(
        [ { role: 'user', content: 'hello' } ],
        { name: 'perplexity', model: 'sonar' },
        true,
        { data: 'context' },
        false
      ),
      /only compatible with openai provider/
    );
  } finally {
    models.perplexity = originalModel;
    assistantConfig.enabled = originalAssistantEnabled;
  }
}

(async () => {
  await testAssistantNonStreamingPath();
  await testAssistantStreamingPath();
  await testAssistantProviderValidation();
  // eslint-disable-next-line no-console
  console.log('assistant integration tests passed');
})();
