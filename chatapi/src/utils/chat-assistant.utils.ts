import fs from 'fs';
import path from 'path';
import { keys } from '../config/ai-providers.config';
import { assistant } from '../config/ai-providers.config';
import { fetchFileFromCouchDB } from './db.utils';

export async function createAssistant(model: string, tools: any[] = [ { 'type': 'code_interpreter' } ]) {
  return await keys.openai.beta.assistants.create({
    'name': assistant?.name,
    'instructions': assistant?.instructions,
    tools,
    model,
  });
}

export async function createThread() {
  return await keys.openai.beta.threads.create();
}

export async function addToThread(threadId: any, message: string, attachments?: any) {
  return await keys.openai.beta.threads.messages.create(
    threadId,
    {
      'role': 'user',
      'content': message,
      attachments
    }
  );
}

export async function createRun(threadID: any, assistantID: any, instructions?: string) {
  return await keys.openai.beta.threads.runs.create(
    threadID,
    {
      'assistant_id': assistantID,
      instructions
    }
  );
}

export async function waitForRunCompletion(threadId: any, runId: any) {
  let runStatus = await keys.openai.beta.threads.runs.retrieve(threadId, runId);
  while (runStatus.status !== 'completed') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    runStatus = await keys.openai.beta.threads.runs.retrieve(threadId, runId);
  }
  return runStatus;
}

export async function retrieveResponse(threadId: any): Promise<string> {
  const messages = await keys.openai.beta.threads.messages.list(threadId);
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
    keys.openai.beta.threads.runs.stream(threadID, {
      'assistant_id': assistantID
    })
      .on('textDelta', (textDelta: { value: string }) => {
        if (textDelta && textDelta.value) {
          completionText += textDelta.value;
          if (callback) {
            callback(textDelta.value);
          }
        }
      })
      .on('toolCallDelta', (toolCallDelta: { type: string; code_interpreter: { input: string; outputs: any[] } } ) => {
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

async function uploadFileToOpenAI(fileBuffer: Buffer, filename: string): Promise<any> {
  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const tempPath = path.join(tempDir, filename);
  fs.writeFileSync(tempPath, fileBuffer);
  return await keys.openai.files.create({
    'file': fs.createReadStream(tempPath),
    'purpose': 'assistants'
  });
}

export async function processAttachments(context: any, assistantId: string): Promise<any[]> {
  if (!context.resource || !context.resource.attachments) return [];

  let vectorStore;
  const asst = await keys.openai.beta.assistants.retrieve(assistantId);
  if (asst.tool_resources?.file_search?.vector_store_ids?.length > 0) {
    vectorStore = asst.tool_resources.file_search.vector_store_ids[0];
  } else {
    vectorStore = await keys.openai.vectorStores.create({ 'name': assistantId });
  }

  const fileIds: string[] = [];
  const attachments: any[] = [];

  for (const attachmentName of Object.keys(context.resource.attachments)) {
    try {
      const couchFile = await fetchFileFromCouchDB(context.resource.id, attachmentName);
      if (Buffer.isBuffer(couchFile)) {
        const uploadedFile = await uploadFileToOpenAI(couchFile, attachmentName);
        fileIds.push(uploadedFile.id);

        attachments.push({
          'file_id': uploadedFile.id,
          'tools': [ { 'type': 'file_search' } ],
        });
      } else {
        throw new Error(`Failed to fetch file for attachment ${attachmentName}: ${couchFile.error}`);
      }
    } catch (err) {
      throw new Error(`Error processing attachment ${attachmentName}: ${err}`);
    }
  }

  if (fileIds.length > 0) {
    try {
      await keys.openai.vectorStores.fileBatches.createAndPoll(
        vectorStore.id,
        { 'file_ids': fileIds }
      );
      await keys.openai.beta.assistants.update(assistantId, {
        'tool_resources': { 'file_search': { 'vector_store_ids': [ vectorStore.id ] } },
      });
    } catch (error) {
      throw new Error(`Error setting up vector store: ${error}`);
    }
  }

  return attachments;
}

