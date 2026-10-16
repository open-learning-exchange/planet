## Gateway

Node gateway service for Planet chat and scoped public operations.

## Development Notes

Run `cd gateway` and add a `.env` file in the `gateway` directory with:

```env
SERVE_PORT=5000
COUCHDB_HOST=http://localhost:2200
COUCHDB_USER=planet
COUCHDB_PASS=planet
```

By default on Linux the gateway uses port `5000`. For Windows and macOS, use `5400` if needed and mirror that value in the root `.env` as `CHAT_PORT`.

To run the gateway locally:

```bash
npm install
npm run dev
```

To run the gateway tests, install the repository root dependencies first, then run `npm test` here. Vitest resolves from the root's `node_modules` rather than the gateway's.

## Modules

- `modules/chatapi`: chat HTTP + WebSocket flow served through `/ml/`
- `modules/public`: scoped public endpoints served through `/public/`

## Public Endpoints

- `GET /public/surveys/:teamId/:surveyId`
- `POST /public/surveys/:teamId/:surveyId/submissions`

When proxied through nginx in Planet, these are exposed under `/api/public/`.
