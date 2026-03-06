const fs = require('fs');
const path = require('path');

const environmentFiles = [
  'src/environments/environment.ts',
  'src/environments/environment.prod.ts',
  'src/environments/environment.test.ts'
];

const objectKeyRegex = /\n\s*([A-Za-z_$][\w$]*)\s*:/g;

function getEnvironmentKeys(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  let match;

  while ((match = objectKeyRegex.exec(contents)) !== null) {
    keys.push(match[1]);
  }

  return keys;
}

const keyMap = new Map();
for (const file of environmentFiles) {
  keyMap.set(file, new Set(getEnvironmentKeys(path.resolve(file))));
}

const expected = keyMap.get(environmentFiles[0]);
let hasMismatch = false;

for (const file of environmentFiles.slice(1)) {
  const current = keyMap.get(file);
  const missing = [...expected].filter((key) => !current.has(key));
  const extra = [...current].filter((key) => !expected.has(key));

  if (missing.length || extra.length) {
    hasMismatch = true;
    console.error(`\n${file} key mismatch:`);
    if (missing.length) {
      console.error(`  Missing keys: ${missing.join(', ')}`);
    }
    if (extra.length) {
      console.error(`  Extra keys: ${extra.join(', ')}`);
    }
  }
}

if (hasMismatch) {
  process.exit(1);
}

console.log('Environment key parity check passed.');
