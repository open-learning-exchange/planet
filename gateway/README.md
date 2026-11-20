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
```

`COUCHDB_USER` and `COUCHDB_PASS` must be a CouchDB server admin: provider keys live in the admin-only `keys` database, which only the gateway reads.

By default on Linux the gateway uses port `5000`. For Windows and macOS, use `5400` if needed and mirror that value in the root `.env` as `CHAT_PORT`.

`CORS_ORIGINS` lists the browser origins allowed besides the gateway's own host, comma-separated. `ng serve` runs on a different port, so it needs its origin listed. To call the gateway from curl or scripts, sign in with Basic auth as any local account (`curl -u admin:admin localhost:5000/api/currency`).

## Authentication

Every route lives under `/api/`, in dev and behind nginx alike, and needs a Planet session unless it's on the open list in `src/index.ts`: `GET /api/` and `GET /api/chat/providers` (status), and everything under `/api/public/` (the public module, anonymous by design). Any other new route is closed until it's added there.

- The gateway asks CouchDB's `_session` who the caller is, forwarding the browser's `AuthSession` cookie or an app's `Authorization: Basic` header, and passes a renewed cookie back. Chat takes the member from that session, and only a conversation's owner can add turns to it.
- The WebSocket is checked during the HTTP upgrade, so a refused client never gets a socket (404 for any path but `/api/chat`, 403 for an untrusted origin, 401 without a session).
- Up to `SESSION_VALIDATION_CONCURRENCY` checks (default 16) run against CouchDB at once; the rest wait their turn, and after 2 s get a 503. On the reference Pi 5, 16 at once was faster than 8 or 40, and a class of 40 arriving together all got through within 0.15 s.
- An origin is trusted when it matches the request's `Host`, port included, and the scheme in `X-Forwarded-Proto` when a proxy sends one, or when it's listed in `CORS_ORIGINS`. Behind a proxy that rewrites `Host`, list the public origin there.

To run the gateway locally:

```bash
npm install
npm run dev
```

To run the gateway tests, install the repository root dependencies first, then run `npm test` here. Vitest resolves from the root's `node_modules` rather than the gateway's.

## Modules

- `modules/chatapi`: chat turns through `POST /api/chat` and the WebSocket on `/api/chat`, the providers through `/api/chat/providers`, and the session member's chat history (plus the managers' usage rows) through `/api/chat/`
- `modules/currency`: exchange rates served through `/api/currency/`
- `modules/keys`: provider keys, set and removed by managers through `PUT` and `DELETE /api/keys/:service/:name`; `GET /api/keys` says only whether each key is set
- `modules/public`: scoped public endpoints served through `/api/public/`

## Public Endpoints

- `GET /api/public/surveys/:teamId/:surveyId`
- `POST /api/public/surveys/:teamId/:surveyId/submissions`
