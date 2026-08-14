## Gateway

Node gateway service for Planet chat and scoped public operations.

## Development Notes

Run `cd gateway` and add a `.env` file in the `gateway` directory with:

```env
SERVE_PORT=5000
COUCHDB_HOST=http://localhost:2200
COUCHDB_USER=planet
COUCHDB_PASS=planet
# Required for local development when Angular and the gateway use different ports:
CORS_ORIGINS=http://localhost:3000
# Optional settings:
# AI_REQUEST_TIMEOUT_MS=120000
# RESOURCE_INDEX_TIMEOUT_MS=600000
# COUCHDB_SESSION_TIMEOUT_MS=10000
# GATEWAY_JSON_LIMIT=1mb
# CHATAPI_AUTH=none
# RATE_LIMIT_PER_MINUTE=30
# RESOURCE_INDEX_MAX_FILE_BYTES=26214400
# RESOURCE_INDEX_MAX_TOTAL_BYTES=52428800
```

The provider configuration service caches the CouchDB configuration document for 30 seconds. `AI_REQUEST_TIMEOUT_MS` limits the provider request, including stream consumption, and defaults to two minutes.
`RESOURCE_INDEX_TIMEOUT_MS` bounds resource-lock waits, CouchDB reads/writes, uploads, and file-batch polling during index construction; it defaults to ten minutes. Failed-build cleanup has its own short maintenance deadline. `COUCHDB_SESSION_TIMEOUT_MS` bounds session validation and defaults to ten seconds. `GATEWAY_JSON_LIMIT` bounds parsed JSON request bodies and defaults to 1 MiB. AI resource indexing accepts at most 500 supported attachments and defaults to 25 MiB per attachment and 50 MiB total per resource; `RESOURCE_INDEX_MAX_FILE_BYTES` and `RESOURCE_INDEX_MAX_TOTAL_BYTES` override those byte limits. `RATE_LIMIT_PER_MINUTE=0` is a ChatAPI kill switch. Positive values set the per-user request ceiling; individual routes may use a lower ceiling. Resource cleanup is limited to five batches per minute.

ChatAPI requires CouchDB session authentication by default. `CHATAPI_AUTH=none` is a local-development escape hatch. Browser WebSocket/CORS access is limited to the request host plus `CORS_ORIGINS`, and requests are rate-limited per authenticated user. WebSocket authentication rejects missing session cookies before CouchDB access and bounds simultaneous session validation. Once authenticated, each connection accepts one chat turn and uses the same per-user chat quota as HTTP.
The standard development topology is cross-origin because Angular runs on port 3000 while the gateway runs on port 5000 (or 5400), so its frontend origin must be listed. Change the value when serving Angular on another port. The same allowlist applies to the public survey browser endpoints; add any trusted embedding origins explicitly. Same-origin Docker deployments route browser traffic through nginx and normally leave `CORS_ORIGINS` unset. Configure it in production only when intentionally allowing an additional trusted browser origin.

By default on Linux the gateway uses port `5000`. For Windows and macOS, use `5400` if needed and mirror that value in the root `.env` as `CHAT_PORT`.

To run the gateway locally:

```bash
npm install
npm run dev
```

To run the gateway test suite, install the repository root dependencies first and
then run:

```bash
npm test
```

Vitest intentionally resolves from the repository root's `node_modules`; it is not
duplicated in the gateway dependencies. `npm test` type-checks source and test files
before running Vitest; production gateway builds continue to exclude test files.

## Modules

- `modules/chatapi`: chat HTTP + WebSocket flow served through `/ml/`
- `modules/public`: scoped public endpoints served through `/public/`

## ChatAPI

The provider foundation reads keys, models, and prompt-profile overrides from the
CouchDB `configurations` document. OpenAI uses the Responses API with file search and
structured-output support. Perplexity, DeepSeek, and Gemini use OpenAI-compatible Chat
Completions APIs. Course text context is passed as delimited background data for every
provider. OpenAI can additionally index supported resource attachments (including
PDFs) and return file citations.

Authenticated endpoints include chat (`POST /` and WebSocket), provider discovery
(`GET /checkproviders`), survey analysis (`POST /analyze`), and batch resource-index
cleanup (`POST /resources/indexes/cleanup`). Resource indexes are created on demand
when an OpenAI course-chat turn needs supported attachments.

## Public Endpoints

- `GET /public/surveys/:teamId/:surveyId`
- `POST /public/surveys/:teamId/:surveyId/submissions`

When proxied through nginx in Planet, these are exposed under `/api/public/`.
