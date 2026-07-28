#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const filePaths = process.argv.slice(2);

if (filePaths.length === 0) {
  console.error('Usage: node scripts/i18n-normalize.mjs <path-to-xlf> [path-to-xlf...]');
  process.exit(1);
}

for (const filePath of filePaths) {
  const resolvedPath = resolve(filePath);
  const xlf = readFileSync(resolvedPath, 'utf8');

  const normalized = xlf
    .replace(/\n\s*<context-group purpose="location">[\s\S]*?<\/context-group>/g, '')
    .replace(/[ \t]+$/gmu, '')
    .replace(/\s+$/u, '\n');

  writeFileSync(resolvedPath, normalized);
}
