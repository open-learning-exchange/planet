#!/usr/bin/env node

/*
 * Rejects files that mix LF and CRLF line endings.
 *
 * A file may be entirely LF or entirely CRLF - that choice is left to
 * .editorconfig and to each contributor's git configuration. What this check
 * refuses is a single file carrying both, because that is what turns a small
 * edit into a whole-file diff.
 *
 * Only files touched by the current branch are inspected, so the mixed files
 * already in the repository stay as they are until someone edits them.
 *
 * Usage:
 *   node scripts/check-line-endings.mjs                # changed files vs. master
 *   node scripts/check-line-endings.mjs --base <ref>   # changed files vs. <ref>
 *   node scripts/check-line-endings.mjs --all          # every tracked file
 *   node scripts/check-line-endings.mjs <file> [...]   # only these files
 *
 * The base ref can also come from the EOL_BASE_REF environment variable.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const USAGE = `Usage: node scripts/check-line-endings.mjs [--all] [--base <ref>] [file...]

  --all           check every tracked file instead of the changed ones
  --base <ref>    compare against <ref> (default: origin/master, then master)
  -h, --help      show this message`;

const DEFAULT_BASES = [ 'origin/master', 'master' ];
const CHUNK_SIZE = 500;
const MAX_BUFFER = 64 * 1024 * 1024;

const git = (args, allowFailure = false) => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
      stdio: [ 'ignore', 'pipe', allowFailure ? 'ignore' : 'inherit' ]
    });
  } catch (error) {
    if (allowFailure) {
      return null;
    }
    throw error;
  }
};

const gitBuffer = (args) => {
  try {
    return execFileSync('git', args, { maxBuffer: MAX_BUFFER, stdio: [ 'ignore', 'pipe', 'ignore' ] });
  } catch {
    return null;
  }
};

const splitNul = (output) => (output || '').split('\0').filter((entry) => entry !== '');

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const parseArgs = (argv) => {
  const options = { all: false, base: process.env.EOL_BASE_REF || '', files: [] };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--base') {
      options.base = argv[++index] || '';
    } else if (arg.startsWith('--base=')) {
      options.base = arg.slice('--base='.length);
    } else if (arg === '-h' || arg === '--help') {
      console.log(USAGE);
      process.exit(0);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}\n\n${USAGE}`);
      process.exit(2);
    } else {
      options.files.push(arg);
    }
  }
  return options;
};

const commitFor = (ref) => {
  const output = git([ 'rev-parse', '--verify', '--quiet', `${ref}^{commit}` ], true);
  return output ? output.trim() : null;
};

// The commit this branch forked from, so only its own changes get inspected.
// A null commit means there is no branch to compare - on the base branch itself
// only uncommitted work is left to check.
const resolveBase = (base) => {
  const head = commitFor('HEAD');
  for (const candidate of base ? [ base ] : DEFAULT_BASES) {
    if (!commitFor(candidate)) {
      continue;
    }
    const output = git([ 'merge-base', candidate, 'HEAD' ], true);
    const mergeBase = output ? output.trim() : null;
    if (!mergeBase) {
      continue;
    }
    return mergeBase === head ? { ref: candidate, commit: null } : { ref: candidate, commit: mergeBase };
  }
  console.error(base
    ? `Could not resolve base ref "${base}".`
    : `Could not resolve a base ref (tried ${DEFAULT_BASES.join(', ')}). Pass --base <ref> or set EOL_BASE_REF.`);
  process.exit(2);
};

const changedFiles = (baseCommit) => {
  const files = new Set();
  const collect = (args) => splitNul(git(args, true)).forEach((file) => files.add(file));
  if (baseCommit) {
    collect([ 'diff', '--name-only', '--diff-filter=ACMR', '-z', baseCommit, 'HEAD' ]);
  }
  // Uncommitted work counts too, so the check is useful before committing.
  collect([ 'diff', '--name-only', '--diff-filter=ACMR', '-z', 'HEAD' ]);
  collect([ 'ls-files', '--others', '--exclude-standard', '-z' ]);
  return [ ...files ].sort();
};

// git reports the end-of-line style of the index and working tree copy of every
// tracked file: lf, crlf, mixed, none, or -text for binaries.
const trackedEolInfo = (files) => {
  const info = new Map();
  for (const batch of chunk(files, CHUNK_SIZE)) {
    for (const entry of splitNul(git([ 'ls-files', '--eol', '-z', '--', ...batch ], true))) {
      const separator = entry.indexOf('\t');
      if (separator === -1) {
        continue;
      }
      const fields = entry.slice(0, separator).trim().split(/\s+/);
      info.set(entry.slice(separator + 1), {
        index: (fields[0] || '').slice('i/'.length),
        worktree: (fields[1] || '').slice('w/'.length)
      });
    }
  }
  return info;
};

const countEndings = (buffer) => {
  let crlf = 0;
  let lf = 0;
  for (let index = 0; index < buffer.length; index++) {
    if (buffer[index] !== 0x0a) {
      continue;
    }
    if (index > 0 && buffer[index - 1] === 0x0d) {
      crlf++;
    } else {
      lf++;
    }
  }
  return { crlf, lf };
};

const contentOf = (file) => {
  const staged = gitBuffer([ 'cat-file', 'blob', `:${file}` ]);
  if (staged) {
    return staged;
  }
  try {
    return statSync(file).isFile() ? readFileSync(file) : null;
  } catch {
    return null;
  }
};

// Untracked files are not covered by `git ls-files --eol`, so read them directly.
const untrackedEol = (file) => {
  const content = contentOf(file);
  if (!content || content.includes(0)) {
    return null;
  }
  const { crlf, lf } = countEndings(content);
  return crlf > 0 && lf > 0 ? 'mixed' : 'consistent';
};

const options = parseArgs(process.argv.slice(2));

// git reports paths from the repository root, so work from there as well.
const repoRoot = (git([ 'rev-parse', '--show-toplevel' ], true) || '').trim();
if (!repoRoot) {
  console.error('Not inside a git repository.');
  process.exit(2);
}
const givenFiles = options.files.map((file) => relative(repoRoot, resolve(file)));
process.chdir(repoRoot);

let files;
let scope;
if (givenFiles.length > 0) {
  files = givenFiles;
  scope = `${files.length} file(s) given on the command line`;
} else if (options.all) {
  files = splitNul(git([ 'ls-files', '-z' ]));
  scope = `${files.length} tracked file(s)`;
} else {
  const base = resolveBase(options.base);
  files = changedFiles(base.commit);
  scope = base.commit
    ? `${files.length} file(s) changed since ${base.ref}`
    : `${files.length} uncommitted file(s)`;
}

if (files.length === 0) {
  console.log('Line endings: nothing to check.');
  process.exit(0);
}

const tracked = trackedEolInfo(files);
const offenders = files.filter((file) => {
  const info = tracked.get(file);
  if (!info) {
    return untrackedEol(file) === 'mixed';
  }
  // Submodules and symlinks report no end-of-line style at all.
  if (info.index === '' && info.worktree === '') {
    return false;
  }
  return info.index === 'mixed' || info.worktree === 'mixed';
});

if (offenders.length === 0) {
  console.log(`Line endings: ${scope} checked, none mixed.`);
  process.exit(0);
}

console.error(`Mixed line endings in ${offenders.length} file(s):\n`);
for (const file of offenders) {
  const content = contentOf(file);
  const counts = content ? countEndings(content) : null;
  console.error(`  ${file}${counts ? ` (${counts.lf} LF, ${counts.crlf} CRLF)` : ''}`);
}
console.error(`
A file may use LF throughout or CRLF throughout, but never both. Normalize each
file listed above to a single style, for example to LF:

  perl -pi -e 's/\\r\\n/\\n/g' ${offenders.join(' ')}

Files this branch does not touch are not affected by this check.`);
process.exit(1);
