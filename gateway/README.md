## Gateway

Node gateway service for Planet chat and scoped public operations.

## Development Notes

Run `cd gateway` and add a `.env` file in the `gateway` directory with:

```env
SERVE_PORT=5000
COUCHDB_HOST=http://localhost:2200
COUCHDB_USER=planet
COUCHDB_PASS=planet
CORS_ORIGINS=http://localhost:3000
# Optional:
# CHATAPI_AUTH=none          # disable session auth on chat endpoints (local experiments only)
# CONFIG_TTL_MS=30000        # AI config cache TTL
# RATE_LIMIT_PER_MINUTE=30   # per-user request cap on the AI endpoints
```

`CORS_ORIGINS` is the comma-separated list of browser origins allowed to make
credentialed cross-origin requests (including the WebSocket handshake). Unset, the
gateway sends no CORS headers at all — correct for production, where nginx serves the
gateway same-origin under `/ml/`, but local `ng serve` runs on another port, so dev
setups need the origin above.

By default on Linux the gateway uses port `5000`. For Windows and macOS, use `5400` if needed and mirror that value in the root `.env` as `CHAT_PORT`.

To run the gateway locally:

```bash
npm install
npm run dev
```

To run the test suite:

```bash
npm test
```

The tests run on `vitest`, which is intentionally not a gateway dependency: it resolves from the repository root's `node_modules` (npm puts ancestor `.bin` directories on the script PATH), so run `npm install` in the repository root first.

## Modules

- `modules/chatapi`: chat HTTP + WebSocket flow served through `/ml/`
- `modules/public`: scoped public endpoints served through `/public/`

## Chat API

The chat module talks to AI providers through adapters in `modules/chatapi/providers/`:
OpenAI uses the **Responses API** (the Assistants API sunsets 2026-08-26 and is no longer
used); Perplexity, DeepSeek and Gemini use their OpenAI-compatible Chat Completions
endpoints. Provider keys/models are read from the CouchDB `configurations` document and
cached briefly, so changes in Manager Settings → AI Configurations apply without a
gateway restart.

### Authentication

All chat endpoints (and the WebSocket) require a valid CouchDB session cookie
(`AuthSession`) — the same session the Planet app already holds. Requests without one
get `401`. Set `CHATAPI_AUTH=none` to disable. The `/public/` module and
`GET /checkproviders` are unauthenticated. Continuing a conversation (`_id`) is only
allowed for its owner, and the resource indexing routes additionally require a manager
or admin session (`manager` / `_admin` role; index removal is also allowed for the
resource's `addedBy` owner) — other users get `403`. Personal (`private`) resources are
only indexed for their owner, including via chat's lazy indexing. The AI endpoints are
rate-limited per user (`RATE_LIMIT_PER_MINUTE`, default 30) over HTTP and WebSocket
alike, and cross-origin browser access requires `CORS_ORIGINS`.

### Endpoints

- `POST /` — chat. Body: `{ "data": { ... }, "save": boolean }` where `data` is:
  - `content` (string, required) — the user message
  - `aiProvider` (`{ name, model? }`, default `{ name: 'openai' }`)
  - `mode` (`general_chat` | `course_help` | `survey_analysis`, default `general_chat`) —
    selects the prompt profile. The old `assistant: boolean` flag is accepted and ignored
    (deprecated).
  - `context` (`{ type?, data?, resource? }`) — `data` is passed to the model as a
    delimited reference message (never as system-prompt instructions, which stay
    server-controlled); `resource.id` triggers file_search (OpenAI only, see resource
    indexing below)
  - `_id`/`_rev` — continue an existing `chat_history` conversation
  - Response: `{ status, chat, citations, couchDBResponse? }`. Only whitelisted fields
    are persisted to CouchDB (the raw payload is never stored); the doc is written only
    after a successful completion.
- `WebSocket /` — same payload as `data` above, always saves. Emits
  `{ type: 'partial', response }` deltas, then
  `{ type: 'final', completionText, citations, couchDBResponse }`;
  errors are `{ type: 'error', error, message }`.
- `GET /checkproviders` — `{ <provider>: { enabled, capabilities } }` where capabilities
  is e.g. `["chat", "fileSearch", "structuredOutput"]`.
- `POST /analyze` — survey/exam analysis with structured output. Body:
  `{ exam: { name, description?, type? }, questions: [...], aiProvider? }`. Returns
  `{ status, provider, sections: [{ title, content }] }` (content is markdown). OpenAI
  uses a strict JSON schema; other providers return a single section.
- `POST /resources/:id/index` (manager/admin only) — upload a resource's supported
  attachments (pdf, txt, md, html, json, docx, pptx) to OpenAI and collect them in a
  vector store. State is saved on the resource doc as `aiVectorStore` and re-synced
  automatically when attachment digests change. Chat requests with `context.resource.id`
  index lazily, so calling this is only needed to pre-warm.
- `DELETE /resources/:id/index` (manager/admin or the resource's `addedBy` owner) —
  delete the vector store + files on OpenAI's side and strip `aiVectorStore` from the
  doc. The Planet client calls this before deleting a resource so OpenAI-side storage
  doesn't leak.

### Prompt profiles

System prompts live in `modules/chatapi/prompts/default-prompts.ts` and can be overridden
per community via `promptProfiles.{general_chat,course_help,survey_analysis}` on the
configurations doc (editable in Manager Settings → AI Configurations). The legacy
`assistant.instructions` field is still honored as a fallback for `general_chat`.

## Public Endpoints

- `GET /public/surveys/:teamId/:surveyId`
- `POST /public/surveys/:teamId/:surveyId/submissions`

When proxied through nginx in Planet, these are exposed under `/api/public/`.
