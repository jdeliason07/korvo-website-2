# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Korvo AI's marketing website (korvo.ai) — a lightweight Express server that serves
a static frontend and a small JSON-file-backed API for blog posts and contact
inquiries. There is **no build step, no framework, no TypeScript, and no test
suite**. The frontend is vanilla HTML/CSS/JS.

## Commands

```bash
npm install      # install dependencies
npm run dev      # run with nodemon (auto-restart on change), port 3000
npm start        # run with plain node (used in production)
```

There are no lint, test, or build scripts. Requires Node >= 18.

Local env: copy `.env.example` to `.env` and fill in values.

## Architecture

**Backend — `app.js` (single file, ~135 lines).** An Express app that:
- Serves everything in `public/` as static files (`express.static`).
- Declares explicit page routes only for `/` (`index.html`) and `/admin` (`admin.html`).
- Exposes a JSON API (see below).
- Applies `helmet` with a hand-written **Content-Security-Policy** and enables `cors()`.

**Frontend is effectively two pages:**
- `public/index.html` — the entire public marketing site as a **single page with
  anchor sections** (`#home`, `#about`, `#services`, `#pricing`, `#blog`, `#book`,
  `#contact`, etc.) plus a blog `#post-modal`. Adding a new "page" usually means
  adding a section here, not a new server route. Logic in `public/js/main.js`.
- `public/admin.html` — the blog CMS / inquiries dashboard. Logic in `public/js/admin.js`.
- Styling is one stylesheet, `public/css/style.css` (CSS custom properties, no framework).

**Data layer — flat JSON files in `data/`**, read/written synchronously via the
`readJSON`/`writeJSON` helpers in `app.js`:
- `data/posts.json` — array of blog posts (`id`, `slug`, `title`, `excerpt`, `content`, `author`, `date`).
- `data/appointments.json` — array of contact-form submissions.

There is no database. The `slug` for a post is derived from its title in `POST /api/posts`.

### API endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/posts` | — | list all posts |
| GET | `/api/posts/:slug` | — | single post by slug |
| POST | `/api/posts` | `key` in body | create post; requires `title` + `content` |
| DELETE | `/api/posts/:id` | `key` in body | delete post |
| POST | `/api/contact` | — | saves to appointments + emails via Resend |
| GET | `/api/appointments` | `key` in query | list inquiries |

### Auth model

There is no session/login system. A single shared secret `ADMIN_KEY` (env var,
default fallback `'korvo-admin-2024'` hardcoded in `app.js`) is compared in
plaintext. The admin frontend sends it as `key` in the request body or `?key=` in
the query string. Treat write/admin endpoints accordingly when changing them.

### Email

`POST /api/contact` sends a notification email through **Resend**, but only if
`RESEND_API_KEY` is set (otherwise it silently skips the send and still saves the
inquiry). Sender/recipient come from `MAIL_FROM` / `MAIL_TO`.

## Conventions & gotchas

- **CSP must be kept in sync.** Any new external script, stylesheet, font, image
  host, or fetch target will be blocked by the browser unless its source is added
  to the `helmet` CSP directives in `app.js`. (Recent history shows fixes for
  exactly this — e.g. allowing inline handlers.) Inline `<script>`/`onclick` work
  because `'unsafe-inline'` is enabled.
- **JSON data files are committed to git** (`.gitignore` only excludes
  `node_modules/`, `.env`, `*.log`, `.DS_Store`). Edits to posts/appointments
  show up as repo changes.
- **Writes don't persist on ephemeral hosts.** Because data lives on the local
  filesystem, posts/inquiries created at runtime on a platform like Render are
  lost on redeploy. Keep this in mind before relying on runtime writes.
- File/asset naming is kebab-case; JS functions are camelCase; CSS classes and
  custom properties are kebab-case.

## Deployment

- `render.yaml` — Render web service (`buildCommand: npm install`, `startCommand: npm start`, Node 18.17.0).
- `Procfile` — `web: node app.js` (Heroku-style).
- `CNAME` — custom domain `korvo.ai`.

Environment variables (see `.env.example`): `PORT`, `RESEND_API_KEY`, `MAIL_FROM`,
`MAIL_TO`, `ADMIN_KEY`.
