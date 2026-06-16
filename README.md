# Korvo AI Website

Marketing site + a small admin area, served by an Express app.

## Run locally

```bash
npm install
cp .env.example .env   # fill in values
npm start              # http://localhost:3000
```

## Admin

- `/admin` — consultation requests + a link to the Discovery Intake.
- `/admin/discovery` — the discovery-call intake form. Fill it out and **Save**;
  each save becomes its own record. Open **Saved calls** to reopen and edit a
  past call, or delete one.

Both are gated by the `ADMIN_PASS` password.

## Discovery-call storage

The intake form saves through `/api/discovery` (list/create) and
`/api/discovery/:id` (read/update/delete). Storage is chosen automatically:

- **Postgres** — used when `DATABASE_URL` is set. A `discovery_calls` table is
  created on boot (meta fields as columns, the full answers object as JSONB).
- **JSON file** — fallback when there is no `DATABASE_URL`. Records live in
  `DATA_DIR/discovery.json` (defaults to `./data`).

### Deploying on Railway

1. Create a service from this repo. Railway reads `railway.json` / the
   `Procfile` (`node app.js`) and runs `npm install` automatically.
2. Set env vars on the service: `ADMIN_PASS`, `RESEND_API_KEY`, `MAIL_TO`.
3. **Add Postgres for permanent storage** (the important step):
   - In your Railway **project**, click **New → Database → Add PostgreSQL**.
   - Open your **web service → Variables → New Variable → Add Reference**, and
     reference the Postgres service's `DATABASE_URL` (or use Railway's
     "Connect" which adds it for you).
   - Redeploy. On boot the log prints `Discovery store ready (Postgres)` and the
     `discovery_calls` table is created automatically. Saved calls now survive
     every redeploy. SSL is auto-detected (off for the internal URL).

   _Alternative:_ skip Postgres, attach a **Volume** to the service, and set
   `DATA_DIR` to its mount path (e.g. `/data`) to persist the JSON fallback.

Without Postgres or a volume, file storage still works but lives on the
container's ephemeral disk and is lost on redeploy.
