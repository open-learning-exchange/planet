import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import textract, { URLConfig } from 'textract';

export async function extractTextFromDocument(data: Buffer, mimetype: string): Promise<string> {
  // textract's buffer API leaves its temp copy behind, so extract from a file we remove ourselves.
  // Its typings declare typeOverride for URLs only, but fromFileWithPath honours it too.
  const options: URLConfig = { 'typeOverride': mimetype };
  const directory = await mkdtemp(join(tmpdir(), 'chatapi-'));
  const filePath = join(directory, 'document');
  try {
    await writeFile(filePath, new Uint8Array(data));
    return await new Promise((resolve, reject) => {
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
