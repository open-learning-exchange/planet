import { createWriteStream } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import textract, { URLConfig } from 'textract';

const EXTRACTION_TIMEOUT_MS = 60000;

export async function extractTextFromDocument(
  openSource: () => NodeJS.ReadableStream,
  mimetype: string,
  timeoutMs = EXTRACTION_TIMEOUT_MS
): Promise<string> {
  // textract's buffer API leaves its temp copy behind, so extract from a file we remove ourselves.
  // Its typings declare typeOverride for URLs only, but fromFileWithPath honours it too.
  const options: URLConfig = { 'typeOverride': mimetype };
  const directory = await mkdtemp(join(tmpdir(), 'chatapi-'));
  const filePath = join(directory, 'document');
  // nano's stream never ends if CouchDB drops mid-transfer
  const deadline = AbortSignal.timeout(timeoutMs);
  try {
    await pipeline(openSource(), createWriteStream(filePath), { 'signal': deadline });
    return await new Promise((resolve, reject) => {
      deadline.addEventListener('abort', () => reject(deadline.reason), { 'once': true });
      textract.fromFileWithPath(filePath, options, (error, text) => {
        if (error) {
          reject(error);
        } else {
          resolve(text);
        }
      });
    });
  } finally {
    await rm(directory, { 'recursive': true, 'force': true });
  }
}
