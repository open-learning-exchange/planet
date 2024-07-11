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


export async function createRun(threadID: any, assistantID: any) {
  return await openai.beta.threads.runs.create(
    threadID,
    { 'assistant_id': assistantID }
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
