import { execFile } from 'child_process';
import { createWriteStream } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';

const EXTRACTION_TIMEOUT_MS = 60000;
// Reaches the 60,000-character cap even on slides with little text a page
const LAST_PAGE = 100;
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

const execFileAsync = promisify(execFile);

export async function extractPdfText(
  openSource: () => NodeJS.ReadableStream,
  timeoutMs = EXTRACTION_TIMEOUT_MS
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'chatapi-'));
  const filePath = join(directory, 'document');
  // nano's stream never ends if CouchDB drops mid-transfer
  const deadline = AbortSignal.timeout(timeoutMs);
  try {
    await pipeline(openSource(), createWriteStream(filePath), { 'signal': deadline });
    const { stdout } = await execFileAsync(
      'pdftotext',
      [ '-q', '-raw', '-enc', 'UTF-8', '-l', String(LAST_PAGE), filePath, '-' ],
      // pdftotext parses uploaded files, so it doesn't inherit the CouchDB credentials
      { 'signal': deadline, 'maxBuffer': MAX_OUTPUT_BYTES, 'env': { 'PATH': process.env.PATH } }
    );
    // Google Docs exports pad words with zero-width spaces, which \s doesn't match
    return stdout.replace(/[\s\u200B]+/g, ' ').trim();
  } finally {
    await rm(directory, { 'recursive': true, 'force': true });
  }
}
