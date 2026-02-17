import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { app } from './index';
import { assistant, keys, models } from './config/ai-providers.config';

async function waitForConfigurationInitialization() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

function setupStandardProviderResponse(responseText: string) {
  models.openai = {
    'defaultModel': 'gpt-test',
    'ai': {
      'chat': {
        'completions': {
          'create': async () => ({
            'choices': [ { 'message': { 'content': responseText } } ]
          })
        }
      }
    }
  };
}

test('assistant=false returns standard completion response', async () => {
  await waitForConfigurationInitialization();
  setupStandardProviderResponse('standard completion');
  assistant.name = 'Test Assistant';
  assistant.instructions = 'Provide helpful responses';

  const response = await request(app)
    .post('/')
    .send({
      'save': false,
      'data': {
        'content': 'Hello',
        'aiProvider': { 'name': 'openai' },
        'assistant': false,
        'context': {}
      }
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'Success');
  assert.equal(response.body.chat, 'standard completion');
});

test('assistant=true uses assistant thread/run flow', async () => {
  await waitForConfigurationInitialization();

  let createAssistantCalls = 0;
  let createThreadCalls = 0;
  let createRunCalls = 0;

  setupStandardProviderResponse('unused');
  assistant.name = 'Test Assistant';
  assistant.instructions = 'Provide helpful responses';

  keys.openai = {
    'beta': {
      'assistants': {
        'create': async () => {
          createAssistantCalls += 1;
          return { 'id': 'asst_123' };
        }
      },
      'threads': {
        'create': async () => {
          createThreadCalls += 1;
          return { 'id': 'thread_123' };
        },
        'messages': {
          'create': async () => ({ 'id': 'msg_123' }),
          'list': async () => ({
            'data': [
              {
                'role': 'assistant',
                'content': [ { 'text': { 'value': 'assistant flow response' } } ]
              }
            ]
          })
        },
        'runs': {
          'create': async () => {
            createRunCalls += 1;
            return { 'id': 'run_123' };
          },
          'retrieve': async () => ({ 'status': 'completed' })
        }
      }
    }
  };

  const response = await request(app)
    .post('/')
    .send({
      'save': false,
      'data': {
        'content': 'Hello assistant',
        'aiProvider': { 'name': 'openai' },
        'assistant': true,
        'context': { 'data': 'Additional context' }
      }
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.chat, 'assistant flow response');
  assert.equal(createAssistantCalls, 1);
  assert.equal(createThreadCalls, 1);
  assert.equal(createRunCalls, 1);
});

test('assistant=true returns clear error when assistant config is missing', async () => {
  await waitForConfigurationInitialization();
  setupStandardProviderResponse('unused');
  assistant.name = '';
  assistant.instructions = '';

  const response = await request(app)
    .post('/')
    .send({
      'save': false,
      'data': {
        'content': 'Hello assistant',
        'aiProvider': { 'name': 'openai' },
        'assistant': true,
        'context': { 'data': 'Additional context' }
      }
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Bad Request');
  assert.equal(response.body.message, 'Assistant mode requires assistant configuration with both "name" and "instructions"');
});
