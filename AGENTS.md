# AGENTS.md

This file provides shared guidance for AI coding agents working in this repository. `CLAUDE.md` is a symlink to this file.

## Commands

Prerequisites: Node.js v22, npm v10, Angular CLI v20. A CouchDB instance must be running (the README describes a Docker Compose setup that exposes CouchDB on port 2200 and `chatapi`/`gateway` on port 5000).

### Angular app (root)

- `npm install` — install dependencies.
- `npm run install-hooks` — copy `git-hooks/*` into `.git/hooks`. The `pre-push` hook runs `npm run lint` in both the root and `gateway/`. It is a copy, so re-run this command whenever `git-hooks/` changes.
- `npm start` / `ng serve` — dev server on port 3000 (host `0.0.0.0`). If 3000 is taken, use `ng serve --port 3001`.
- `npm run dev` — runs `scripts/dev-env.sh` (which templates `src/environments/environment.dev.ts` from `environment.template` using `CHAT_PORT`, `COUCH_PORT`, `PARENT_PROTOCOL` from an optional `.env`) then `ng serve --configuration dev`. Use this when chatapi or CouchDB are on non-default ports.
- `npm run build` — production build via `ng-high-memory` (`--max_old_space_size=4096`); large builds OOM without it.
- `npm run test` — unit tests with Vitest through `@analogjs/vitest-angular`. There is no `e2e` workflow wired up on this branch.
- Single spec: `ng test --test-files src/app/path/to/file.spec.ts` (or temporarily use `describe.only` / `it.only`).
- `npm run lint` — ESLint over `src/**/*.{ts,html}` via `@angular-eslint/builder`. `ng lint --fix` auto-fixes.
- `npm run lint-all` — sass-lint (`lint:styles`) + ESLint + htmlhint (`lint:html`). Not yet gating: the style/html baselines have pre-existing failures, so CI runs only `npm run lint` and the pre-push hook only ESLint until that debt is cleared.
- Locales (en, so, fr, ne, ar, es): `ng serve --configuration <spa|fra|nep|ara|som>` or `LNG=es npm start`. Locale configs, base hrefs, and xlf sources are defined in `angular.json` under `projects.planet-app.i18n`.

### gateway (`gateway/`)

Independent Node service; requires its own `.env` (see `gateway/README.md`) with `SERVE_PORT`, `COUCHDB_HOST`, `COUCHDB_USER`, `COUCHDB_PASS`. macOS/Windows users typically use `SERVE_PORT=5400` and mirror it in the root `.env` as `CHAT_PORT`.

- `cd gateway && npm install && npm run dev` — nodemon + ts-node.
- `npm run build` — `tsc`.
- `npm run lint` / `npm run lint-fix` — uses legacy ESLint config (`ESLINT_USE_FLAT_CONFIG=false`); the root app uses flat config (`eslint.config.mjs`), so don't try to unify them casually.
- Only one `gateway` instance can bind the port at a time; stop the Docker gateway container before `npm run dev`.

### CouchDB bootstrap

`bash scripts/couchdb-setup.sh -p <port>` creates databases and uploads design docs from `design/`. Re-run with `-u <admin> -w <password>` if auth breaks. The `design/` tree holds CouchDB map/reduce views per database; `design/create-design-docs.js` walks subdirectories to assemble design documents that the setup script uploads.

## Architecture

Planet Learning is an Angular 19 + CouchDB learning platform. There are two tiers of deployment — a **Nation** (cloud aggregator) server and a **Community** (local LAN) server — and most "sync" / "parent" / "manager" concepts in the code exist to bridge the two. `environment.ts` captures this: `couchAddress` is the local DB, `parentProtocol` + `centerAddress` point at the upstream Nation, and `chatAddress` points at the local gateway chat namespace.

### Repository layout

- `src/app/` — feature-per-directory Angular app. Each feature owns its own `*-router.module.ts` and is lazy-loaded from `src/app/app-router.module.ts`, which mounts `HomeModule` at `''` (guarded by `UserGuard` + `UnsavedChangesGuard`) and `LoginModule` at `/login` (guarded by `AuthService`). Unknown routes fall through to `PageNotFoundComponent`.
- `src/app/shared/` — cross-feature services, directives, dialogs, and the database layer. Two DB abstractions live here:
  - `couchdb.service.ts` — HTTP wrapper around CouchDB used by most features. Every request goes through `setOpts` / `couchDBReq`, which injects `withCredentials` and surfaces 403s via `PlanetMessageService`. Prefer adding new calls through this service rather than raw `HttpClient`.
  - `database/pouch.service.ts` + `pouch-auth.service.ts` — PouchDB mirror for offline-capable data (currently seeded with `feedback`). When adding an offline-capable database, register it in the `databases` Set so `configureDBs()` creates the local mirror.
- `src/app/manager-dashboard/` — admin surfaces (sync, fetch, AI configuration, reports, requests, certifications). AI provider keys/models are read from the CouchDB `configurations` database; do not hardcode them.
- `gateway/` — standalone Express + WebSocket gateway with internal `chatapi` and `public` modules. It serves chat on the existing `/ml/` namespace and scoped public operations on `/api/`. Credentials/models come from the CouchDB `configurations` doc, not env vars.
- `design/` — CouchDB design documents (map/reduce views). Edit the per-db `.js` files and re-run `scripts/couchdb-setup.sh` to upload.
- `docker/` — Dockerfiles for `planet` (nginx + built Angular bundle), `gateway`, and `db-init`. `docker/planet/default.conf.template` and `docker/planet/scripts/` drive the production entrypoint.
- `scripts/` — project maintenance helpers: local dev environment templating (`dev-env.sh`), i18n catalog normalization (`i18n-normalize.mjs`), and CouchDB bootstrap (`couchdb-setup.sh`).
- `docs/` — developer documentation (`Style-Guide.md`); `CONTRIBUTING.md` lives in `.github/`.
- `src/environments/` — `environment.ts` (local dev), `environment.dev.ts` (generated by `scripts/dev-env.sh`, git-ignored), `environment.test.ts`, `environment.prod.ts`, plus the `environment.template` consumed by `scripts/dev-env.sh`.
- `src/i18n/messages.*.xlf` — translation catalogs; do not edit by hand outside a normal i18n workflow. Use `npm run i18n:extract` to update the source catalog and normalize location metadata. Use `npm run i18n:normalize` to remove source file and line number metadata from existing catalogs. Use `npm run i18n:check` to validate extraction without changing committed files. Catalogs use Angular's current decimal message IDs.

### Conventions worth internalizing before editing

From `docs/Style-Guide.md` (read it before making UI changes):

- Keep component `template` + `style` inline when total HTML + CSS is <12 lines; otherwise split into `.component.html` / `.component.scss`. File naming is `<feature><-sub-feature?>.<type>.ts`; class names are CamelCase of the same.
- **Do not** name variables `planet-db-host` or `planet-db-port` — the production Docker entrypoint reserves those.
- Use `i18n` on elements with real text; never on elements whose only content is interpolation. Attribute strings use `i18n-<attr>` (e.g. `i18n-title`).
- Test-only CSS hooks use the `km-` prefix and must never appear in stylesheets. Unit tests query elements via these classes.
- All colors/breakpoints go through `src/app/_variables.scss` and the Material theme (`mat-color()`, `$primary`/`$accent`/`$warn`); shared breakpoint overrides use the `screen-sizes` mixin from `_mixins.scss`.
- Validators live in `src/app/validators/` (`custom-validators.ts` for sync, `validator.service.ts` for async); prefer those over inlining new validation logic.
- Loading UX: page-level uses `*ngIf="isLoading"` with a "Loading …" i18n string; action-level uses `DialogsLoadingService.start()` / `.stop()` inside an RxJS `finalize`.

### Git workflow

Develop on feature branches off `master`; the project asks for two positive reviews before merging. Install hooks (`npm run install-hooks`) so `pre-push` runs lint in both `./` and `gateway/`.
