import openai from '../config/openai.config';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates an assistant with the specified model
 * @param model - Model to use for assistant
 * @returns Assistant object
 */
export async function createAssistant(model: string) {
  return await openai.beta.assistants.create({
    'name': process.env.ASSISTANT_NAME,
    'instructions': process.env.ASSISTANT_INSTRUCTIONS,
    'tools': [{ 'type': 'code_interpreter' }],
    model,
  });
}

export async function createThread() {
  return await openai.beta.threads.create();
}

export async function addToThread(threadId: any, message: string) {
  return await openai.beta.threads.messages.create(
    threadId,
    {
      'role': 'user',
      'content': message
    }
  );
}

export async function createRun(threadID: any, assistantID: any, instructions?: string) {
  return await openai.beta.threads.runs.create(
    threadID,
    {
      'assistant_id': assistantID,
      instructions
    }
  );
}

export async function waitForRunCompletion(threadId: any, runId: any) {
  let runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
  while (runStatus.status !== 'completed') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
  }
  return runStatus;
}

export async function retrieveResponse(threadId: any): Promise<string> {
  const messages = await openai.beta.threads.messages.list(threadId);
  for (const msg of messages.data) {
    if ('text' in msg.content[0] && msg.role === 'assistant') {
      return msg.content[0].text.value;
    }
  }
  throw new Error('Unable to retrieve response from assistant');
}

// Run with streaming enabled
export async function createAndHandleRunWithStreaming(
  threadID: any, assistantID: any, callback?: (response: string) => void
): Promise<string> {
  let completionText = '';

  return new Promise((resolve, reject) => {
    openai.beta.threads.runs.stream(threadID, {
      'assistant_id': assistantID
    })
      .on('textDelta', (textDelta) => {
        if (textDelta && textDelta.value) {
          completionText += textDelta.value;
          if (callback) {
            callback(textDelta.value);
          }
        }
      })
      .on('toolCallDelta', (toolCallDelta) => {
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
      .on('error', reject);
  });
}
