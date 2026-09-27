# TradeLink

A two-sided marketplace connecting customers with local tradespeople (electricians, plumbers, mechanics, handymen and more) in **Bulawayo & Zvishavane, Zimbabwe**. Built around an inDrive-style bidding model.

## How it works

1. **Customer posts a job** — category, description, location, proposed budget.
2. **Tradespeople** whose trade matches see the job and either **accept the budget** or send a **counter-offer**.
3. **Customer compares offers** (price + rating + verification) and picks one.
4. Job status flows: `open → matched → in_progress → completed`.
5. Customer **rates** the tradesperson; the rating feeds their average for future jobs.

> No in-app payments in v1 — payment is arranged directly between customer and tradesperson; commission is tracked manually off-platform.

## Stack

- **Frontend:** React + Vite + React Router
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** email/phone + password (bcrypt), JWT bearer tokens

## Data model

| Table | Purpose |
|-------|---------|
| `users` | role (customer/tradesperson), name, email, phone, password_hash, location |
| `tradesperson_profiles` | category/skills, rating, rating_count, jobs_done, verified |
| `jobs` | customer_id, category, description, location, budget, status, accepted_offer_id |
| `offers` | job_id, tradesperson_id, price, message, status |
| `ratings` | job_id, customer_id, tradesperson_id, rating, comment |

## Local development

Requires Node 20+ and a running PostgreSQL.

```bash
# 1. Backend
cd backend
npm install
# configure connection via .env (PGHOST/PGUSER/PGDATABASE or DATABASE_URL)
npm run migrate      # create tables
npm start            # serves API on :3000 (also serves frontend/dist if built)

# 2. Frontend (dev, with hot reload + proxy to :3000)
cd frontend
npm install
npm run dev          # Vite dev server on :5173
```

For a production-style single server: build the frontend (`cd frontend && npm run build`) then run the backend — it serves `frontend/dist` and the API from one port.

## Environment variables

| Var | Used by | Notes |
|-----|---------|-------|
| `DATABASE_URL` | backend | Postgres connection string (Render provides this). Falls back to `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`. |
| `JWT_SECRET` | backend | Secret for signing tokens. |
| `PORT` | backend | Defaults to 3000. |
| `PGSSL` | backend | Set to `disable` to turn off SSL for local URLs. |

## Deploy to Render

This repo includes `render.yaml`. In the Render dashboard: **New + → Blueprint → pick this repo**. It provisions a free Postgres database and a web service; `DATABASE_URL` and `JWT_SECRET` are wired automatically. The build runs `npm run build` (installs both apps + builds the frontend) and start runs `npm start`. Migrations run automatically on boot.

## Features

- **inDrive-style bidding** — customers post jobs; matching tradespeople accept the budget or counter-offer.
- **Two-sided completion** — the assigned tradesperson can **mark the job done + leave a completion note**; the customer then confirms completion and rates.
- **Withdraw offer** — tradespeople can retract a pending offer.
- **Editable pro profile** — skills + bio shown next to offers.
- **Dashboard stats** — live counters for both roles.
- **Support inbox** — contact form stored in `support_messages`.
- **Legal** — Terms, Privacy Policy, Cookie Policy pages + a cookie-consent banner.
- **Security** — bcrypt passwords, JWT auth, and **rate limiting** (general API, strict auth, write endpoints).

## API overview

```
POST  /api/auth/register       POST /api/auth/login        GET  /api/auth/me
POST  /api/jobs                GET  /api/jobs?status=&category=
GET   /api/jobs/mine           GET  /api/jobs/assigned      GET  /api/jobs/:id
PATCH /api/jobs/:id/status     POST /api/jobs/:id/mark-done
POST  /api/jobs/:id/offers     POST /api/offers/:id/accept  POST /api/offers/:id/withdraw
GET   /api/offers/mine         POST /api/jobs/:id/rating
PATCH /api/profile             GET  /api/stats              POST /api/support
GET   /api/meta/categories     GET  /api/health
```

## Deploy note

The Render web service was created from a **public Git URL**, so GitHub push webhooks are not installed and auto-deploy will not fire on `git push`. Trigger a deploy of the latest commit with:

```bash
curl -X POST https://api.render.com/v1/services/<serviceId>/deploys \
  -H "Authorization: Bearer <RENDER_API_KEY>" -H "Content-Type: application/json" -d '{}'
```

To get true auto-deploy, connect the GitHub repo to Render via the dashboard (Settings → Build & Deploy → connect repository).

## Tests

```bash
cd backend && node test/api.test.js   # 40 end-to-end assertions against a running server
```
