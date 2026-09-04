#!/usr/bin/env node
/*
 * Rewrites relative imports after the src/app/shared reorganization.
 *
 * TEMPORARY — delete this script and scripts/reorg-shared-moves.tsv, along with
 * the sentence referencing them in AGENTS.md, once every branch opened before
 * the reorganization landed has been merged or closed. It exists only to
 * migrate those branches; kept past that point the manifest describes moves
 * that already happened and reads like current documentation.
 *
 * The shared directory was regrouped by what each file achieves rather than by
 * file kind, and a `@shared/*` path alias was introduced so future moves do not
 * touch every consumer again.
 *
 * Usage:
 *   node scripts/reorg-shared.mjs                       # rewrite stale imports only
 *   node scripts/reorg-shared.mjs --move                # also git mv files (one-time)
 *   node scripts/reorg-shared.mjs --manifest=<tsv>      # drive a different set of moves
 *
 * Branches opened before the reorganization can resolve import conflicts by
 * taking their own side and re-running this script without --move. The rewrite
 * is idempotent: a specifier that already resolves from its current location is
 * re-emitted unchanged.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const sharedPrefix = 'src/app/shared/';
const doMove = process.argv.includes('--move');
const manifestArg = process.argv.find(arg => arg.startsWith('--manifest='));
const manifest = manifestArg
  ? resolve(repoRoot, manifestArg.slice('--manifest='.length))
  : join(repoRoot, 'scripts', 'reorg-shared-moves.tsv');

const moves = readFileSync(manifest, 'utf8')
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => {
    const [ from, to ] = line.split('\t');
    return { from: from.trim(), to: to.trim() };
  });

const stripExt = path => path.replace(/\.ts$/, '');
// pre-move module path -> post-move module path
const moduleMap = new Map(
  moves.filter(move => move.from.endsWith('.ts')).map(move => [ stripExt(move.from), stripExt(move.to) ])
);
// post-move file path -> the directory its imports were relative to before the move
const previousDirs = new Map(moves.map(move => [ move.to, dirname(move.from) ]));

const gitMove = () => {
  for (const { from, to } of moves) {
    if (existsSync(join(repoRoot, from))) {
      mkdirSync(join(repoRoot, dirname(to)), { recursive: true });
      execFileSync('git', [ 'mv', from, to ], { cwd: repoRoot });
    }
  }
};

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? walk(path) : [ path ];
});

const exists = modulePath => existsSync(join(repoRoot, `${modulePath}.ts`)) ||
  existsSync(join(repoRoot, modulePath, 'index.ts')) ||
  existsSync(join(repoRoot, modulePath));

const specifierFor = (fromDir, target) => {
  if (target.startsWith(sharedPrefix) && dirname(target) !== fromDir) {
    return `@shared/${target.slice(sharedPrefix.length)}`;
  }
  const rel = relative(fromDir, target).split(/[\\/]/).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
};

// Only rewrite specifiers a move actually broke: the target moved, or the
// importing file moved and the specifier no longer resolves from its new home.
// A redundant-but-valid path is left exactly as its author wrote it, and an
// already-correct specifier round-trips unchanged.
const resolveTarget = (filePath, specifier) => {
  const currentDir = dirname(filePath);
  const previousDir = previousDirs.get(filePath);
  for (const dir of [ currentDir, previousDir ].filter(Boolean)) {
    const moved = moduleMap.get(posix.normalize(posix.join(dir, specifier)));
    if (moved) {
      return moved;
    }
  }
  if (exists(posix.normalize(posix.join(currentDir, specifier)))) {
    return null;
  }
  if (previousDir) {
    const candidate = posix.normalize(posix.join(previousDir, specifier));
    if (exists(candidate)) {
      return candidate;
    }
  }
  return null;
};

const rewriteImports = () => {
  let changed = 0;
  for (const abs of walk(join(repoRoot, 'src'))) {
    if (!abs.endsWith('.ts')) {
      continue;
    }
    const filePath = relative(repoRoot, abs).split(/[\\/]/).join('/');
    const original = readFileSync(abs, 'utf8');
    const updated = original.replace(
      /(\bfrom\s*|\bimport\s*\()(['"])(\.[^'"]*)\2/g,
      (match, prefix, quote, specifier) => {
        const target = resolveTarget(filePath, specifier);
        if (!target) {
          return match;
        }
        // A relative path that dives through node_modules is just a package import.
        const packageImport = target.match(/^node_modules\/(.+)$/);
        const rewritten = packageImport ? packageImport[1] : specifierFor(dirname(filePath), target);
        return `${prefix}${quote}${rewritten}${quote}`;
      }
    );
    if (updated !== original) {
      writeFileSync(abs, updated);
      changed++;
    }
  }
  return changed;
};

// Sass partials resolve relative to the stylesheet, so moved stylesheets need
// their depth to src/app/_variables.scss recomputed.
const rewriteStyles = () => {
  let changed = 0;
  for (const { to } of moves) {
    const abs = join(repoRoot, to);
    if (!to.endsWith('.scss') || !existsSync(abs)) {
      continue;
    }
    const original = readFileSync(abs, 'utf8');
    const depth = relative(dirname(to), 'src/app/variables').split(/[\\/]/).join('/');
    const updated = original.replace(
      /(@(?:use|import)\s+)(['"])(?:\.\.\/)+variables\2/g,
      (_match, keyword, quote) => `${keyword}${quote}${depth}${quote}`
    );
    if (updated !== original) {
      writeFileSync(abs, updated);
      changed++;
    }
  }
  return changed;
};

if (doMove) {
  gitMove();
  console.log(`moved ${moves.length} files`);
}
console.log(`rewrote imports in ${rewriteImports()} files`);
console.log(`rewrote sass partials in ${rewriteStyles()} files`);
