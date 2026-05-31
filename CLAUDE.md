# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Korvo AI's marketing website (korvo.ai) — a lightweight Express server that serves
a multi-page static frontend plus a small JSON-file-backed API for blog posts and
contact/booking inquiries. There is **no build step, no frontend framework, no
TypeScript, and no test suite**. The frontend is vanilla HTML/CSS/JS.

## Commands

```bash
npm install      # install dependencies
npm run dev      # run with nodemon (auto-restart on change), port 3000
npm start        # run with plain node (production also uses `node app.js`)
```

There are no lint, test, or build scripts. Requires Node >= 18.

Local env: copy `.env.example` to `.env` and fill in values.

## Architecture

**Backend — `app.js` (single file, ~157 lines).** An Express app that:
- Serves everything in `public/` as static files (`express.static`).
- Declares an explicit `res.sendFile` route for **each HTML page** (see below).
- Exposes a small JSON API.
- Applies `helmet` with a hand-written **Content-Security-Policy** and enables `cors()`.

**Frontend — multiple standalone HTML pages in `public/`**, each with its own
server route in `app.js`:

| Route | File |
|-------|------|
| `/` | `index.html` |
| `/about` | `about.html` |
| `/learn-more` | `learn-more.html` (Services) |
| `/pricing` | `pricing.html` |
| `/book` | `book.html` (embeds a Microsoft Forms iframe) |
| `/story` | `story.html` (blog index) |
| `/post` | `post.html` (single post, reads `?slug=` and filters `/api/posts`) |
| `/admin` | `admin.html` (CMS + inquiries dashboard) |

Each page is a complete document — **nav, footer, and the inline logo SVG are
duplicated across every page** (there is no templating/partials system). When
changing shared chrome, update all pages.

- Shared frontend logic: `public/js/main.js` (nav, contact form, newsletter,
  loading posts). Admin logic: `public/js/admin.js`.
- Styling is one stylesheet, `public/css/style.css` (CSS custom properties, no framework).

**Data layer — JSON files in `data/`**, read/written synchronously via helpers in
`app.js` (`getPosts`/`savePosts`, `getAppts`/`saveAppts`, `makeSlug`):
- `data/posts.json` — shape `{ "posts": [ {id, slug, title, category, date, excerpt, body} ] }`. **Committed to git.** `slug` is generated from the title by `makeSlug`.
- `data/appointments.json` — shape `{ "appointments": [...] }`. **Git-ignored and created at runtime** (won't exist on a fresh clone).

There is no database.

### API endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/posts` | — | returns the posts array |
| POST | `/api/posts` | `adminKey` in body | create; requires `title` + `body` |
| POST | `/api/posts/:id/delete` | `adminKey` in body | delete (note: POST, not DELETE) |
| POST | `/api/contact` | — | emails via Resend **then** saves the inquiry |
| GET | `/api/appointments` | `adminKey` in query | list inquiries |
| POST | `/api/newsletter` | — | only `console.log`s the email (no storage) |

### Auth model

There is no session/login system. A single shared secret `ADMIN_PASS` (env var,
default fallback `'korvo2026'` hardcoded in `app.js`) is compared in plaintext.
The admin frontend collects it at "login", keeps it in the in-memory `ADMIN_KEY`
variable in `admin.js`, and sends it as `adminKey` — in the request body for
posts, or as `?adminKey=` for `/api/appointments`.

### Contact form / email

`POST /api/contact` sends a notification through **Resend** (`from` is hardcoded
`onboarding@resend.dev`, `to` is `MAIL_TO`). The inquiry is only appended to
`appointments.json` **after** a successful send, inside the same `try` — so if
Resend fails or `RESEND_API_KEY` is missing/invalid, the request returns 500 and
the inquiry is **not** saved. Keep this ordering in mind when editing.

## Conventions & gotchas

- **CSP must be kept in sync.** Any new external script, stylesheet, font, image
  host, fetch target, or iframe will be blocked by the browser unless its source
  is added to the `helmet` CSP directives in `app.js`. Current allowances include
  Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`) and a `forms.office.com`
  frame for booking. Inline `<script>`/`onclick`/inline styles work because
  `'unsafe-inline'` is enabled.
- **Writes don't persist on ephemeral hosts.** Data lives on the local filesystem,
  so posts/inquiries created at runtime on a platform like Render are lost on
  redeploy.
- File/page names are kebab-case; JS functions are camelCase; CSS classes and
  custom properties are kebab-case.

## Deployment

- `render.yaml` — Render web service (`buildCommand: npm install`, `startCommand: node app.js`).
- `Procfile` — `web: node app.js` (Heroku-style).
- `CNAME` — custom domain `korvo.ai`.

Environment variables (see `.env.example`): `PORT`, `RESEND_API_KEY`, `MAIL_TO`, `ADMIN_PASS`.
