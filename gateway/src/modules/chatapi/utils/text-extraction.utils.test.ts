import { readdir } from 'fs/promises';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { tmpdir } from 'os';
import nano from 'nano';
import { afterEach, describe, expect, it } from 'vitest';

import { extractTextFromDocument } from './text-extraction.utils';

const tempDirs = async () => (await readdir(tmpdir())).filter((name) => name.startsWith('chatapi-'));

describe('extractTextFromDocument', () => {
  let server: Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it('gives up on a download that stalls after the headers, removing its temp file', async () => {
    server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Length': '100000' });
      res.write('%PDF-1.4 partial');
      setTimeout(() => res.socket?.destroy(), 20);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    const resources = nano(`http://127.0.0.1:${port}`).use('resources');
    const before = await tempDirs();

    const extraction = extractTextFromDocument(() => resources.attachment.getAsStream('resource-1', 'guide.pdf'), 'application/pdf', 300);

    await expect(extraction).rejects.toThrow();
    expect(await tempDirs()).toEqual(before);
  });
});
