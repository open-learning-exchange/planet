import { keys } from '../config/ai-providers.config';
import { assistant } from '../config/ai-providers.config';

const TERMINAL_RUN_STATUSES = new Set([ 'completed', 'failed', 'cancelled', 'expired' ]);

export function normalizeAssistantError(error: unknown, operation: string): Error {
  if (error instanceof Error) {
    return new Error(`Assistant API ${operation} failed: ${error.message}`);
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as { message?: string; status?: number; code?: string };
    const details = [
      errorObj.status ? `status=${errorObj.status}` : '',
      errorObj.code ? `code=${errorObj.code}` : '',
      errorObj.message ? `message=${errorObj.message}` : ''
    ].filter(Boolean).join(' ');

    return new Error(`Assistant API ${operation} failed${details ? ` (${details})` : ''}`);
  }

  return new Error(`Assistant API ${operation} failed`);
}

/**
 * Creates an assistant with the specified model
 * @param model - Model to use for assistant
 * @returns Assistant object
 */
export async function createAssistant(model: string) {
  try {
    return await keys.openai.beta.assistants.create({
      'name': assistant?.name,
      'instructions': assistant?.instructions,
      'tools': [ { 'type': 'code_interpreter' } ],
      model,
    });
  } catch (error) {
    throw normalizeAssistantError(error, 'createAssistant');
  }
}

export async function createThread() {
  try {
    return await keys.openai.beta.threads.create();
  } catch (error) {
    throw normalizeAssistantError(error, 'createThread');
  }
}

export async function addToThread(threadId: any, message: string) {
  try {
    return await keys.openai.beta.threads.messages.create(
      threadId,
      {
        'role': 'user',
        'content': message
      }
    );
  } catch (error) {
    throw normalizeAssistantError(error, 'addToThread');
  }
}

export async function createRun(threadID: any, assistantID: any, instructions?: string) {
  try {
    return await keys.openai.beta.threads.runs.create(
      threadID,
      {
        'assistant_id': assistantID,
        instructions
      }
    );
  } catch (error) {
    throw normalizeAssistantError(error, 'createRun');
  }
}

export async function waitForRunCompletion(threadId: any, runId: any) {
  const maxAttempts = 60;
  const pollDelayMs = 1000;
  const timeoutMs = 90_000;
  const startedAt = Date.now();

  let attempts = 0;
  let runStatus: any;
  while (attempts < maxAttempts) {
    attempts += 1;
    try {
      runStatus = await keys.openai.beta.threads.runs.retrieve(threadId, runId);
    } catch (error) {
      throw normalizeAssistantError(error, 'waitForRunCompletion');
    }

    if (TERMINAL_RUN_STATUSES.has(runStatus.status)) {
      if (runStatus.status === 'completed') {
        return runStatus;
      }
      throw new Error(`Assistant run finished with status "${runStatus.status}"`);
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Assistant run timed out after ${timeoutMs}ms`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
  }

  throw new Error(`Assistant run exceeded retry limit (${maxAttempts})`);
}

export async function retrieveResponse(threadId: any): Promise<string> {
  let messages;
  try {
    messages = await keys.openai.beta.threads.messages.list(threadId);
  } catch (error) {
    throw normalizeAssistantError(error, 'retrieveResponse');
  }
  for (const msg of messages.data) {
    if ('text' in msg.content[0] && msg.role === 'assistant') {
      return msg.content[0].text.value;
    }
  }
  throw new Error('Unable to retrieve response from assistant');
}

// Run with streaming enabled
export async function createAndHandleRunWithStreaming(
  threadID: any, assistantID: any, instructions: string, callback?: (response: string) => void
): Promise<string> {
  let completionText = '';

  return new Promise((resolve, reject) => {
    try {
      keys.openai.beta.threads.runs.stream(threadID, {
        'assistant_id': assistantID,
        instructions
      })
        .on('textDelta', (textDelta: { value: string }) => {
          if (textDelta && textDelta.value) {
            completionText += textDelta.value;
            if (callback) {
              callback(textDelta.value);
            }
          }
        })
        .on('toolCallDelta', (toolCallDelta: { type: string; code_interpreter: { input: string; outputs: any[] } }) => {
          if (toolCallDelta.type === 'code_interpreter') {
            if (toolCallDelta && toolCallDelta.code_interpreter && toolCallDelta.code_interpreter.input) {
              completionText += toolCallDelta.code_interpreter.input;
              if (callback) {
                callback(toolCallDelta.code_interpreter.input);
              }
            }
            if (toolCallDelta && toolCallDelta.code_interpreter && toolCallDelta.code_interpreter.outputs) {
              toolCallDelta.code_interpreter.outputs.forEach((output) => {
                if (output.type === 'logs' && output.logs) {
                  completionText += output.logs;
                  if (callback) {
                    callback(output.logs);
                  }
                }
              });
            }
          }
        })
        .on('end', () => resolve(completionText))
        .on('error', (error: unknown) => reject(normalizeAssistantError(error, 'streamRun')));
    } catch (error) {
      reject(normalizeAssistantError(error, 'streamRun'));
    }
  });
}
