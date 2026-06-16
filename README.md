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

1. Create a service from this repo. Railway uses the `Procfile`
   (`web: node app.js`) and runs `npm install` automatically.
2. Set env vars: `ADMIN_PASS`, `RESEND_API_KEY`, `MAIL_TO`.
3. For persistent discovery-call storage, pick one:
   - **Add a Postgres database** (Railway → New → Database → Postgres). It
     injects `DATABASE_URL` automatically — nothing else to do.
   - **Or attach a volume** and set `DATA_DIR` to its mount path (e.g. `/data`)
     so the JSON fallback survives redeploys.

Without one of these, file storage still works but lives on the container's
ephemeral disk and is lost on redeploy.
