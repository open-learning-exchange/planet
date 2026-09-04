# AGENTS.md

This file provides shared guidance for AI coding agents working in this repository. `CLAUDE.md` is a symlink to this file.

## Commands

Prerequisites: Node.js v22, npm v10, Angular CLI v20. A CouchDB instance must be running (the README describes a Docker Compose setup that exposes CouchDB on port 2200 and `chatapi`/`gateway` on port 5000).

### Angular app (root)

- `npm install` — install dependencies.
- `npm run install-hooks` — copy `git-hooks/*` into `.git/hooks`. The `pre-push` hook runs `npm run lint` in both the root and `gateway/`.
- `npm start` / `ng serve` — dev server on port 3000 (host `0.0.0.0`). If 3000 is taken, use `ng serve --port 3001`.
- `npm run dev` — runs `scripts/dev-env.sh` (which templates `src/environments/environment.dev.ts` from `environment.template` using `CHAT_PORT`, `COUCH_PORT`, `PARENT_PROTOCOL` from an optional `.env`) then `ng serve --configuration dev`. Use this when chatapi or CouchDB are on non-default ports.
- `npm run build` — production build via `ng-high-memory` (`--max_old_space_size=4096`); large builds OOM without it.
- `npm run test` — Karma + Jasmine; opens `localhost:9876`. There is no `e2e` workflow wired up on this branch.
- Single spec: `ng test --include src/app/path/to/file.spec.ts` (or temporarily use `fdescribe` / `fit`).
- `npm run lint` — ESLint over `src/**/*.{ts,html}` via `@angular-eslint/builder`. `ng lint --fix` auto-fixes.
- `npm run lint-all` — sass-lint + `ng lint --type-check` + htmlhint. Heavier than the pre-push hook.
- Locales (en, so, fr, ne, ar, es): `ng serve --configuration <spa|fra|nep|ara|som>` or `LNG=es npm start`. Locale configs, base hrefs, and xlf sources are defined in `angular.json` under `projects.planet-app.i18n`.

### gateway (`gateway/`)

Independent Node service; requires its own `.env` (see `gateway/README.md`) with `SERVE_PORT`, `COUCHDB_HOST`, `COUCHDB_USER`, `COUCHDB_PASS`. macOS/Windows users typically use `SERVE_PORT=5400` and mirror it in the root `.env` as `CHAT_PORT`.

- `cd gateway && npm install && npm run dev` — nodemon + ts-node.
- `npm run build` — `tsc`.
- `npm run lint` / `npm run lint-fix` — uses legacy ESLint config (`ESLINT_USE_FLAT_CONFIG=false`); the root app uses flat config (`eslint.config.mjs`), so don't try to unify them casually.
- Only one `gateway` instance can bind the port at a time; stop the Docker gateway container before `npm run dev`.

### CouchDB bootstrap

`bash couchdb-setup.sh -p <port>` creates databases and uploads design docs from `design/`. Re-run with `-u <admin> -w <password>` if auth breaks. The `design/` tree holds CouchDB map/reduce views per database; `design/create-design-docs.js` walks subdirectories to assemble design documents that the setup script uploads.

## Architecture

Planet Learning is an Angular 20 + CouchDB learning platform. There are two tiers of deployment — a **Nation** (cloud aggregator) server and a **Community** (local LAN) server — and most "sync" / "parent" / "manager" concepts in the code exist to bridge the two. `environment.ts` captures this: `couchAddress` is the local DB, `parentProtocol` + `centerAddress` point at the upstream Nation, and `chatAddress` points at the local gateway chat namespace.

### Repository layout

- `src/app/` — feature-per-directory Angular app. Each feature owns its own `*-router.module.ts` and is lazy-loaded from `src/app/app-router.module.ts`, which mounts `HomeModule` at `''` (guarded by `UserGuard` + `UnsavedChangesGuard`) and `LoginModule` at `/login` (guarded by `AuthService`). Unknown routes fall through to `PageNotFoundComponent`.
- `src/app/shared/` — cross-feature code, grouped by the capability each file serves rather than by file kind. Put a new shared file in the bucket matching what it *achieves*; there is deliberately no `services/`, `directives/`, or `constants/` bucket. Imports from outside a bucket use the `@shared/*` path alias (`tsconfig.json`), so a file can be regrouped later without touching its consumers; within a bucket, keep imports relative (`./sibling`).
  - `ai/` — gateway chat transport, prompt constants, chat output rendering.
  - `auth/` — route guards, `user.service.ts`, role/beta directives, password change.
  - `calendar/`, `challenges/`, `charts/`, `ratings/`, `search/`, `voices/` — one capability each, dialogs included.
  - `database/` — `couchdb.service.ts` (HTTP wrapper; every request goes through `setOpts` / `couchDBReq`, which injects `withCredentials` and surfaces 403s via `PlanetMessageService` — prefer it over raw `HttpClient`), `mangoQueries.ts`, `sync.service.ts`, and the PouchDB mirror `pouch.service.ts` + `pouch-auth.service.ts` for offline-capable data (currently seeded with `feedback`; register new offline databases in the `databases` Set so `configureDBs()` creates the local mirror).
  - `dialogs/` — the generic dialog framework (form, prompt, view, list, loading) plus `pickers/` for entity-selection dialogs. Feature-specific dialogs live with the capability they serve, not here.
  - `export/` — CSV and PDF generation. `forms/` — inputs and validation directives, with `tags/` for the tag inputs.
  - `language/`, `markdown/`, `platform/` (device, configuration and Android-app surfaces), `tables/`, `text/` (formatting pipes), `ui/` (display primitives and `planet-message.service.ts`), `unsaved-changes/`.
  - Only `utils.ts`, `state.service.ts`, `material.module.ts` and `shared-components.module.ts` stay at the root.
  - Per `Style-Guide.md`, keep each bucket under ~9 distinct concerns; split it rather than letting it sprawl. `scripts/reorg-shared.mjs` rewrites imports for branches predating the regrouping.
- `src/app/manager-dashboard/` — admin surfaces (sync, fetch, AI configuration, reports, requests, certifications). AI provider keys/models are read from the CouchDB `configurations` database; do not hardcode them.
- `gateway/` — standalone Express + WebSocket gateway with internal `chatapi` and `public` modules. It serves chat on the existing `/ml/` namespace and scoped public operations on `/api/`. Credentials/models come from the CouchDB `configurations` doc, not env vars.
- `design/` — CouchDB design documents (map/reduce views). Edit the per-db `.js` files and re-run `couchdb-setup.sh` to upload.
- `docker/` — Dockerfiles for `planet` (nginx + built Angular bundle), `gateway`, and `db-init`. `docker/planet/default.conf.template` and `docker/planet/scripts/` drive the production entrypoint.
- `scripts/` — npm-invoked project maintenance helpers, including local dev environment templating and i18n catalog normalization.
- `src/environments/` — `environment.ts` (local dev), `environment.dev.ts` (generated by `scripts/dev-env.sh`, git-ignored), `environment.test.ts`, `environment.prod.ts`, plus the `environment.template` consumed by `scripts/dev-env.sh`.
- `src/i18n/messages.*.xlf` — translation catalogs; do not edit by hand outside a normal i18n workflow. Use `npm run i18n:extract` to update the source catalog and normalize location metadata. Use `npm run i18n:normalize` to remove source file and line number metadata from existing catalogs. Use `npm run i18n:check` to validate extraction without changing committed files. Catalogs use Angular's current decimal message IDs.

### Conventions worth internalizing before editing

From `Style-Guide.md` (read it before making UI changes):

- Keep component `template` + `style` inline when total HTML + CSS is <12 lines; otherwise split into `.component.html` / `.component.scss`. File naming is `<feature><-sub-feature?>.<type>.ts`; class names are CamelCase of the same.
- **Do not** name variables `planet-db-host` or `planet-db-port` — the production Docker entrypoint reserves those.
- Use `i18n` on elements with real text; never on elements whose only content is interpolation. Attribute strings use `i18n-<attr>` (e.g. `i18n-title`).
- Test-only CSS hooks use the `km-` prefix and must never appear in stylesheets. Unit tests query elements via these classes.
- All colors/breakpoints go through `src/app/_variables.scss` and the Material theme (`mat-color()`, `$primary`/`$accent`/`$warn`); shared breakpoint overrides use the `screen-sizes` mixin from `_mixins.scss`.
- Validators live in `src/app/validators/` (`custom-validators.ts` for sync, `validator.service.ts` for async); prefer those over inlining new validation logic.
- Loading UX: page-level uses `*ngIf="isLoading"` with a "Loading …" i18n string; action-level uses `DialogsLoadingService.start()` / `.stop()` inside an RxJS `finalize`.

### Git workflow

Develop on feature branches off `master`; the project asks for two positive reviews before merging. Install hooks (`npm run install-hooks`) so `pre-push` enforces lint in both `./` and `gateway/`.

PR titles follow the house style `scope: smoother thing doing (fixes #N)` (see the log; the `merge-prepping` skill below automates this). `(fixes #N)` goes in the **title** — the squash commit message is the PR title, so that's what auto-closes the issue on merge.

## The Agent Spellbook

`docs/AGENT_SPELLBOOK.md` is the reference for working with the other AI agents on PRs (coderabbitai, codex, copilot, devin, openhands, the `jules` label, dependabot): the Grid of who answers how, the **Laws of Summoning** — read them before mentioning any agent handle — and "The Skill Sync", which covers how the shared agent skills under `.agents/skills/` are wired up and maintained. Skill repos are git submodules, **not** initialized on a default clone or `actions/checkout` — run `git submodule update --init --recursive` before reading anything under `.agents/skills/`. Current skills: **merge-prepping** (PR titles into the house style above; source: https://github.com/dogi/merge-prepping), a submodule under `.agents/skills/`; and **branch-overtaking** (taking over an existing branch and its PR; source: https://github.com/dogi/branch-overtaking), registered for Claude Code only in `.claude/settings.json` with no submodule, so nothing under `.agents/skills/` carries it.
