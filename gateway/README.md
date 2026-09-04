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

## Modules

- `modules/chatapi`: chat HTTP + WebSocket flow served through `/ml/`
- `modules/public`: scoped public endpoints served through `/public/`
- `modules/sync`: the timed sync scheduler, with read-only status served through `/sync/`

## Timed Sync

A community can sync on a schedule (Manager Settings -> Manage Sync in the app) instead of only continuously or by hand. The schedule
lives on the local `configurations` doc as `syncSchedule` (`{ enabled, preset, intervalHours }`), and the gateway is what acts on it,
since it is the only part of a planet still running when nobody has the app open.

On every tick (once a minute) the scheduler re-reads that doc, so a schedule change takes effect without a restart. When a sync is due it
re-runs the `<db>_push` / `<db>_pull` replicator docs the last manual sync left in `_replicator`, reusing the credentials stored on them
rather than prompting for a password. That means a manager has to **Run Sync** once before timed syncs can start, and again after the
manager password changes. Continuous replicators and one-off item fetches are left alone, and the whole scheduler stands down while the
planet is set as Always Online.

Each run writes an `admin_activities` log of type `sync` with `automated: true` (so nation reports still show a community's last sync) and
updates the `timed_sync_state` doc it schedules from.

- `GET /sync/status` -> `{ enabled, preset, intervalHours, lastRunAt, nextRunAt, lastResult, lastError, replicatorCount, skipReason }`

## Public Endpoints

- `GET /public/surveys/:teamId/:surveyId`
- `POST /public/surveys/:teamId/:surveyId/submissions`

When proxied through nginx in Planet, these are exposed under `/api/public/`.
